import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Paper, Button, Grid, TextField,
  CircularProgress, Divider, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  Snackbar, Alert
} from '@mui/material';
import examService from '../../api/examService';

const TakeExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [submissionId, setSubmissionId] = useState(null);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Proctoring State
  const [examStarted, setExamStarted] = useState(false);
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [proctoringMessage, setProctoringMessage] = useState('');
  const [toastOpen, setToastOpen] = useState(false);
  const logTimeoutRef = useRef(null);

  // Initialize violation count from local storage
  useEffect(() => {
    if (submissionId) {
      const storedCount = parseInt(localStorage.getItem(`violations_${submissionId}`), 10);
      if (!isNaN(storedCount)) {
        setViolationCount(storedCount);
      }
    }
  }, [submissionId]);

  const handleAutoSubmit = useCallback(async (msg = "Time's up! Exam auto-submitted.") => {
    try {
      await examService.submitExam(submissionId);
      // Try to exit fullscreen if active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(e => console.error(e));
      }
      navigate('/dashboard', { state: { message: msg }});
    } catch (err) {
      console.error(err);
    }
  }, [submissionId, navigate]);

  const logProctoringEvent = useCallback(async (eventType, details) => {
    // Debounce to prevent rapid duplicate logs
    if (logTimeoutRef.current === eventType) return;
    logTimeoutRef.current = eventType;
    setTimeout(() => { logTimeoutRef.current = null; }, 2000);

    const newCount = violationCount + 1;
    setViolationCount(newCount);
    localStorage.setItem(`violations_${submissionId}`, newCount);
    
    setProctoringMessage(`Warning: ${eventType.replace('_', ' ')}. Violation ${newCount}/5.`);
    setToastOpen(true);

    try {
      await examService.logProctoringIncident({
        submission_id: submissionId,
        event_type: eventType,
        details: { ...details, attempt: newCount }
      });
    } catch(err) {
      console.error('Failed to log proctoring incident', err);
    }

    if (newCount >= 5) {
      handleAutoSubmit("Exam auto-submitted due to excessive violations.");
    }
  }, [submissionId, violationCount, handleAutoSubmit]);

  useEffect(() => {
    if (!submissionId || !examStarted) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreenActive(false);
        logProctoringEvent('fullscreen_exit', { source: 'fullscreenchange' });
      } else {
        setIsFullscreenActive(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logProctoringEvent('tab_switch', { source: 'visibilitychange' });
      }
    };

    const handleBlur = () => {
      logProctoringEvent('window_blur', { source: 'blur' });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [submissionId, examStarted, logProctoringEvent]);

  useEffect(() => {
    examService.getExamToTake(examId)
      .then(res => {
        setExam(res.data.exam);
        setQuestions(res.data.questions);
        setSubmissionId(res.data.submission_id);
        
        // Load existing answers
        if (res.data.answers) {
          setAnswers(res.data.answers);
        }

        // Calculate time left
        const startedAt = new Date(res.data.started_at).getTime();
        const durationMs = res.data.exam.duration_minutes * 60 * 1000;
        const endTime = startedAt + durationMs;
        const now = new Date().getTime();
        
        if (now >= endTime) {
          setTimeLeft(0);
        } else {
          setTimeLeft(Math.floor((endTime - now) / 1000));
        }

        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.detail || "Could not load exam. You may not be registered or outside the time window.");
        setLoading(false);
      });
  }, [examId]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerId);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft]);

  const handleManualSubmit = async () => {
    try {
      await examService.submitExam(submissionId);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(e => console.error(e));
      }
      navigate('/dashboard', { state: { message: "Exam submitted successfully." }});
    } catch (err) {
      console.error("Submit failed", err);
    }
  };

  const saveAnswer = async (qId, text) => {
    setSaving(true);
    try {
      await examService.saveAnswer(submissionId, qId, text);
    } catch (err) {
      console.error("Failed to save answer", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAnswerChange = (e) => {
    const text = e.target.value;
    const qId = questions[currentIndex].id;
    
    setAnswers(prev => ({
      ...prev,
      [qId]: text
    }));

    // Debounce save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveAnswer(qId, text);
    }, 1000);
  };



  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <Box mt={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (error) return <Container><Box mt={4}><Typography color="error">{error}</Typography><Button onClick={() => navigate('/dashboard')} sx={{mt: 2}}>Back to Dashboard</Button></Box></Container>;
  if (!exam) return null;

  const startExam = () => {
    document.documentElement.requestFullscreen().then(() => {
      setIsFullscreenActive(true);
      setExamStarted(true);
    }).catch(err => {
      console.error(`Error attempting to enable fullscreen: ${err.message}`);
      alert("You must allow full-screen to start the exam.");
    });
  };

  if (!examStarted) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10, textAlign: 'center' }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>Ready to start {exam.title}?</Typography>
          <Typography variant="body1" mb={4} color="textSecondary">
            This exam is proctored. You must remain in full-screen mode and cannot switch tabs or minimize the window.
            Violations will be recorded. Excessive violations (5 or more) will result in automatic submission.
          </Typography>
          <Button variant="contained" size="large" onClick={startExam}>
            Enter Full-Screen & Start Exam
          </Button>
        </Paper>
      </Container>
    );
  }

  if (examStarted && !isFullscreenActive) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10, textAlign: 'center' }}>
        <Paper sx={{ p: 4, bgcolor: '#fff3e0' }}>
          <Typography variant="h5" color="error" gutterBottom>Full Screen Exited!</Typography>
          <Typography variant="body1" mb={4}>
            You have exited full-screen mode. This has been logged as a violation.
            You must return to full-screen mode to continue your exam.
          </Typography>
          <Button variant="contained" color="warning" size="large" onClick={() => {
            document.documentElement.requestFullscreen().catch(e => console.error(e));
          }}>
            Return to Full Screen
          </Button>
        </Paper>
      </Container>
    );
  }

  const currentQuestion = questions[currentIndex];
  const qId = currentQuestion?.id;

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4, height: '85vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Bar */}
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h5">{exam.title}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#e8f5e9', color: '#2e7d32', px: 1.5, py: 0.5, borderRadius: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4caf50' }} />
            <Typography variant="caption" fontWeight="bold">Proctoring Active</Typography>
          </Box>
        </Box>
        <Box display="flex" alignItems="center" gap={3}>
          {saving && <Typography variant="caption" color="textSecondary">Saving...</Typography>}
          <Typography variant="h6" color={timeLeft < 60 ? "error" : "primary"}>
            Time Left: {formatTime(timeLeft || 0)}
          </Typography>
          <Button variant="contained" color="secondary" onClick={() => setSubmitDialogOpen(true)}>
            Finish Exam
          </Button>
        </Box>
      </Paper>

      <Grid container spacing={2} sx={{ flexGrow: 1, minHeight: 0 }}>
        {/* Main Question Area */}
        <Grid item xs={12} md={9} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Paper sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {questions.length === 0 ? (
              <Typography>No questions in this exam.</Typography>
            ) : (
              <>
                <Typography variant="h6" gutterBottom>
                  Question {currentIndex + 1} of {questions.length}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
                  {currentQuestion.text}
                </Typography>

                {currentQuestion.image_url && (
                  <Box mb={3}>
                    <img src={currentQuestion.image_url} alt="Question" style={{ maxWidth: '100%', maxHeight: '400px' }} />
                  </Box>
                )}

                <TextField
                  label="Your Answer"
                  multiline
                  rows={8}
                  fullWidth
                  variant="outlined"
                  value={answers[qId] || ''}
                  onChange={handleAnswerChange}
                  sx={{ mt: 'auto' }}
                  placeholder="Type your answer here..."
                />

                <Box display="flex" justifyContent="space-between" mt={3}>
                  <Button 
                    variant="outlined" 
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(prev => prev - 1)}
                  >
                    Previous
                  </Button>
                  <Button 
                    variant="contained" 
                    disabled={currentIndex === questions.length - 1}
                    onClick={() => setCurrentIndex(prev => prev + 1)}
                  >
                    Next
                  </Button>
                </Box>
              </>
            )}
          </Paper>
        </Grid>

        {/* Sidebar Palette */}
        <Grid item xs={12} md={3} sx={{ height: '100%' }}>
          <Paper sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
            <Typography variant="h6" gutterBottom>Questions</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={1}>
              {questions.map((q, index) => {
                const isAnswered = answers[q.id] && answers[q.id].trim().length > 0;
                const isCurrent = index === currentIndex;
                
                let bgColor = '#f0f0f0'; // Not visited/answered
                let color = 'black';

                if (isCurrent) {
                  bgColor = '#1976d2';
                  color = 'white';
                } else if (isAnswered) {
                  bgColor = '#4caf50';
                  color = 'white';
                }

                return (
                  <Grid item key={q.id}>
                    <Button
                      variant="contained"
                      sx={{ 
                        minWidth: '40px', 
                        height: '40px', 
                        p: 0,
                        backgroundColor: bgColor,
                        color: color,
                        '&:hover': {
                          backgroundColor: isCurrent ? '#115293' : (isAnswered ? '#388e3c' : '#e0e0e0')
                        }
                      }}
                      onClick={() => setCurrentIndex(index)}
                    >
                      {index + 1}
                    </Button>
                  </Grid>
                );
              })}
            </Grid>
            <Box mt={3}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Box sx={{ width: 16, height: 16, bgcolor: '#f0f0f0', border: '1px solid #ccc' }}></Box>
                <Typography variant="caption">Unanswered</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Box sx={{ width: 16, height: 16, bgcolor: '#4caf50' }}></Box>
                <Typography variant="caption">Answered</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Box sx={{ width: 16, height: 16, bgcolor: '#1976d2' }}></Box>
                <Typography variant="caption">Current</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Submit Confirmation Modal */}
      <Dialog open={submitDialogOpen} onClose={() => setSubmitDialogOpen(false)}>
        <DialogTitle>Submit Exam</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to submit your exam? You will not be able to change your answers after submission.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleManualSubmit} color="primary" variant="contained">
            Submit Now
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toastOpen} autoHideDuration={6000} onClose={() => setToastOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setToastOpen(false)} severity="warning" sx={{ width: '100%' }}>
          {proctoringMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default TakeExam;
