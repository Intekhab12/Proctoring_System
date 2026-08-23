import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Button, TextField, 
  CircularProgress, Alert, Divider, Chip,
  Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow
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
                        <Chip size="small" label={log.event_type} color={log.event_type.includes('exit') ? 'error' : 'warning'} />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {JSON.stringify(log.details)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

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
