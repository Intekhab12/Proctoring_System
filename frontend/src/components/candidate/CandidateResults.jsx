import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, CircularProgress, Alert, Button,
  Breadcrumbs, Link, Divider, Chip
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import examService from '../../api/examService';
import RaiseDisputeModal from './RaiseDisputeModal';

const CandidateResults = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null); // null means exam-level dispute

  useEffect(() => {
    fetchResults();
  }, [submissionId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const res = await examService.getCandidateResult(submissionId);
      setSubmission(res.data);
    } catch (err) {
      console.error('Error fetching results:', err);
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to load results.');
    } finally {
      setLoading(false);
    }
  };

  const handleRaiseDispute = (question = null) => {
    setSelectedQuestion(question);
    setDisputeModalOpen(true);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 5, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading results...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 5 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => navigate('/my-tests')} sx={{ mt: 2 }}>Back to My Tests</Button>
      </Container>
    );
  }

  if (!submission) return null;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link color="inherit" underline="hover" onClick={() => navigate('/dashboard')} sx={{ cursor: 'pointer' }}>Dashboard</Link>
        <Link color="inherit" underline="hover" onClick={() => navigate('/my-tests')} sx={{ cursor: 'pointer' }}>My Tests</Link>
        <Typography color="text.primary">Results</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Exam Results: {submission.exam_title}</Typography>
        <Button variant="contained" color="warning" onClick={() => handleRaiseDispute()}>
          Raise Exam Dispute
        </Button>
      </Box>

      <Paper sx={{ p: 4, mb: 4, borderRadius: 2 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">Candidate</Typography>
            <Typography variant="h6">{submission.candidate?.full_name}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">Total Score</Typography>
            <Typography variant="h5" fontWeight="bold" color="primary">
              {submission.total_score !== null ? `${submission.total_score}` : 'Pending'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mt: 4 }}>
        Answers Review
      </Typography>
      
      {submission.answers && submission.answers.length > 0 ? (
        submission.answers.map((answer, index) => (
          <Paper key={answer.id} sx={{ p: 3, mb: 3, borderRadius: 2, borderLeft: '6px solid #1976d2' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Q{index + 1}: {answer.question?.text}
              </Typography>
              <Chip 
                label={`Marks Awarded: ${answer.marks_awarded !== null ? answer.marks_awarded : 'N/A'}`} 
                color={answer.marks_awarded > 0 ? "success" : "default"}
                size="small" 
                sx={{ fontWeight: 'bold' }}
              />
            </Box>
            
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>Your Answer:</Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {answer.text_answer || 'No answer provided.'}
              </Typography>
            </Box>

            {answer.feedback && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', color: 'info.contrastText', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>Examiner Feedback:</Typography>
                <Typography variant="body2">{answer.feedback}</Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button size="small" color="warning" onClick={() => handleRaiseDispute(answer)}>
                Raise Dispute for this Question
              </Button>
            </Box>
          </Paper>
        ))
      ) : (
        <Typography>No answers recorded.</Typography>
      )}

      {disputeModalOpen && (
        <RaiseDisputeModal 
          open={disputeModalOpen} 
          onClose={() => setDisputeModalOpen(false)} 
          submissionId={submissionId}
          question={selectedQuestion}
        />
      )}
    </Container>
  );
};

export default CandidateResults;
