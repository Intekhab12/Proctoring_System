import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Button, TextField, 
  CircularProgress, Alert, Divider, Chip, Grid,
  Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Link, Modal, Fade, Backdrop
} from '@mui/material';
import examService from '../../api/examService';

const GradingPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [proctoringLogs, setProctoringLogs] = useState([]);
  const [fullAudioRecording, setFullAudioRecording] = useState(null);
  const [videoRecording, setVideoRecording] = useState(null);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const videoPlayerRef = useRef(null);

  // Local state for edits
  const [edits, setEdits] = useState({});

  useEffect(() => {
    fetchSubmission();
  }, [submissionId]);

  const fetchSubmission = async () => {
    try {
      const res = await examService.getSubmissionDetail(submissionId);
      setSubmission(res.data);
      
      // Initialize edits state
      const initialEdits = {};
      res.data.answers.forEach(ans => {
        initialEdits[ans.id] = {
          marks_awarded: ans.marks_awarded || '',
          feedback: ans.feedback || ''
        };
      });
      setEdits(initialEdits);

      // Fetch proctoring logs
      try {
        const logsRes = await examService.getProctoringLogs(submissionId);
        setProctoringLogs(logsRes.data);
      } catch(logErr) {
        console.error('Failed to fetch proctoring logs', logErr);
      }

      // Fetch full audio recording
      try {
        const audioRes = await examService.getExamAudio(submissionId);
        setFullAudioRecording(audioRes.data);
      } catch(audioErr) {
        console.error('Failed to fetch exam audio recording', audioErr);
      }

      // Fetch video recording
      try {
        const videoRes = await examService.getExamVideo(submissionId);
        setVideoRecording(videoRes.data);
      } catch(videoErr) {
        console.error('Failed to fetch exam video recording', videoErr);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch submission details.');
    } finally {
      setLoading(false);
    }
  };

  const autosaveTimers = useRef({});

  const handleEditChange = (answerId, field, value) => {
    setEdits(prev => {
      const newEdits = {
        ...prev,
        [answerId]: {
          ...prev[answerId],
          [field]: value
        }
      };
      
      if (autosaveTimers.current[answerId]) {
        clearTimeout(autosaveTimers.current[answerId]);
      }
      
      autosaveTimers.current[answerId] = setTimeout(() => {
        handleAutosave(answerId, newEdits[answerId]);
      }, 1000);
      
      return newEdits;
    });
  };

  const handleAutosave = async (answerId, data) => {
    try {
      const payload = {
        marks_awarded: data.marks_awarded !== '' ? parseInt(data.marks_awarded, 10) : null,
        feedback: data.feedback
      };
      await examService.gradeAnswer(answerId, payload);
      setSaveSuccess(`Autosaved at ${new Date().toLocaleTimeString()}`);
      
      setSubmission(prev => ({
        ...prev,
        answers: prev.answers.map(ans => 
          ans.id === answerId 
            ? { ...ans, marks_awarded: payload.marks_awarded, feedback: payload.feedback } 
            : ans
        )
      }));
    } catch (err) {
      console.error('Failed to autosave answer grade.', err);
    }
  };

  const handlePublish = async () => {
    if (!window.confirm("Are you sure you want to publish results? This will send an email to the candidate and lock further grading edits.")) {
      return;
    }
    
    setPublishing(true);
    try {
      await examService.publishResults(submissionId);
      setSaveSuccess('Results published and email sent to candidate.');
      fetchSubmission(); // Refresh to get evaluated status and total score
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to publish results.');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <Container sx={{ mt: 4 }}><CircularProgress /></Container>;
  if (error) return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
  if (!submission) return null;

  const isEvaluated = submission.status === 'evaluated';

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Grading: {submission.exam_title}
        </Typography>
        <Button variant="outlined" onClick={() => navigate(`/exams/${submission.exam}/submissions`)}>
          Back to Submissions
        </Button>
      </Box>

      {saveSuccess && <Alert severity="success" sx={{ mb: 2 }}>{saveSuccess}</Alert>}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Candidate Information</Typography>
        <Typography><strong>Name:</strong> {submission.candidate.full_name || 'N/A'}</Typography>
        <Typography><strong>Email:</strong> {submission.candidate.email}</Typography>
        <Typography><strong>Submitted At:</strong> {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'Not submitted'}</Typography>
        <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Chip label={submission.status} color={isEvaluated ? "success" : "warning"} />
          {isEvaluated && (
            <Typography variant="subtitle1" fontWeight="bold">
              Total Score: {submission.total_score}
            </Typography>
          )}
        </Box>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Answers & Grading" />
          <Tab label={`Proctoring Logs (${proctoringLogs.length})`} />
          <Tab label={fullAudioRecording?.audio_url ? "Full Audio Recording (1)" : "Full Audio Recording (0)"} />
          <Tab label={videoRecording?.video_url ? "Video Proctoring (1)" : "Video Proctoring (0)"} />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Box>
          {submission.answers.map((answer, index) => (
            <Paper key={answer.id} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Question {index + 1}</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>{answer.question.text}</Typography>
              
              {answer.question.image && (
                <Box sx={{ mb: 2 }}>
                  <img 
                    src={answer.question.image} 
                    alt="Question" 
                    style={{ maxWidth: '100%', maxHeight: '300px' }} 
                  />
                </Box>
              )}

              <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mb: 3 }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>Candidate's Answer:</Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {answer.text_answer || <span style={{ fontStyle: 'italic', color: '#888' }}>No answer provided</span>}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" gutterBottom>Grading</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Marks Awarded"
                  type="number"
                  value={edits[answer.id]?.marks_awarded}
                  onChange={(e) => handleEditChange(answer.id, 'marks_awarded', e.target.value)}
                  disabled={isEvaluated}
                  sx={{ width: '200px' }}
                />
                <TextField
                  label="Feedback (Optional)"
                  multiline
                  rows={3}
                  value={edits[answer.id]?.feedback}
                  onChange={(e) => handleEditChange(answer.id, 'feedback', e.target.value)}
                  disabled={isEvaluated}
                  fullWidth
                />
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {tabValue === 1 && (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Event Type</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell>Evidence</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {proctoringLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">No proctoring incidents logged.</TableCell>
                  </TableRow>
                ) : (
                  proctoringLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip size="small" label={log.event_type} color={log.event_type.includes('exit') || log.event_type.includes('spike') || log.event_type.includes('face') ? 'error' : 'warning'} />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {JSON.stringify(log.details)}
                      </TableCell>
                      <TableCell>
                        {log.evidence ? (
                          <Link 
                            component="button" 
                            variant="body2" 
                            onClick={() => setSelectedEvidence(log.evidence)}
                          >
                            View
                          </Link>
                        ) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {tabValue === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Full Session Audio Recording</Typography>
          <Typography variant="body2" color="textSecondary" mb={3}>
            Listen to the complete audio recording captured during the entire exam session.
          </Typography>
          {!fullAudioRecording || !fullAudioRecording.audio_url ? (
            <Alert severity="info">No audio recording available for this submission.</Alert>
          ) : (
            <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, bgcolor: 'grey.50' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Chip label="Full Session Audio" color="primary" />
                <Typography variant="caption" color="textSecondary">
                  Uploaded at: {new Date(fullAudioRecording.uploaded_at).toLocaleString()}
                </Typography>
              </Box>
              <audio controls src={fullAudioRecording.audio_url} style={{ width: '100%', marginTop: '8px' }} />
            </Paper>
          )}
        </Paper>
      )}

      {tabValue === 3 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Full Session Video Proctoring</Typography>
          <Typography variant="body2" color="textSecondary" mb={3}>
            Watch full session video recording. Click any incident in the timeline to jump to that moment in the video.
          </Typography>
          {!videoRecording || !videoRecording.video_url ? (
            <Alert severity="info">No video recording available for this submission.</Alert>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'black', borderRadius: 2 }}>
                  <video 
                    ref={videoPlayerRef} 
                    controls 
                    src={videoRecording.video_url} 
                    style={{ width: '100%', maxHeight: '420px', borderRadius: '4px' }} 
                  />
                  <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                    <Typography variant="caption" color="grey.400">
                      Uploaded: {new Date(videoRecording.uploaded_at).toLocaleString()}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={5}>
                <Paper variant="outlined" sx={{ p: 2, maxHeight: 480, overflowY: 'auto' }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Incident Timeline ({proctoringLogs.length})
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  {proctoringLogs.length === 0 ? (
                    <Typography variant="body2" color="textSecondary">No incidents recorded.</Typography>
                  ) : (
                    <Box display="flex" flexDirection="column" gap={1.5}>
                      {proctoringLogs.map((log, idx) => {
                        // Calculate offset from first log / exam start if applicable
                        const firstTime = new Date(proctoringLogs[proctoringLogs.length - 1].timestamp).getTime();
                        const logTime = new Date(log.timestamp).getTime();
                        const offsetSec = Math.max(0, Math.floor((logTime - firstTime) / 1000));

                        return (
                          <Paper 
                            key={log.id || idx} 
                            variant="outlined" 
                            sx={{ 
                              p: 1.5, 
                              cursor: 'pointer', 
                              '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' } 
                            }}
                            onClick={() => {
                              if (videoPlayerRef.current) {
                                videoPlayerRef.current.currentTime = offsetSec;
                                videoPlayerRef.current.play().catch(() => {});
                              }
                            }}
                          >
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                              <Chip 
                                size="small" 
                                label={log.event_type} 
                                color={log.event_type.includes('exit') || log.event_type.includes('spike') || log.event_type.includes('face') ? 'error' : 'warning'} 
                              />
                              <Typography variant="caption" color="primary" fontWeight="bold">
                                Jump to {Math.floor(offsetSec / 60)}m {offsetSec % 60}s
                              </Typography>
                            </Box>
                            <Typography variant="caption" display="block" color="textSecondary">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </Typography>
                          </Paper>
                        );
                      })}
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          )}
        </Paper>
      )}

      {/* Evidence Modal */}
      <Modal
        open={!!selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500,
          },
        }}
      >
        <Fade in={!!selectedEvidence}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: 24,
            p: 1,
            bgcolor: 'background.paper',
            outline: 'none',
            maxWidth: '90vw',
            maxHeight: '90vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {selectedEvidence && (
              <audio 
                src={selectedEvidence} 
                controls
                autoPlay
                style={{ maxWidth: '100%' }} 
              />
            )}
          </Box>
        </Fade>
      </Modal>

      {!isEvaluated && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
          <Button 
            variant="contained" 
            color="success" 
            size="large"
            onClick={handlePublish}
            disabled={publishing}
          >
            {publishing ? 'Publishing...' : 'Publish Results'}
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default GradingPage;
