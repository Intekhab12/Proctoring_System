import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, CircularProgress, Alert, Button,
  Breadcrumbs, Link, Divider, Chip, Modal, Fade, Backdrop
} from '@mui/material';
import { Brush as BrushIcon } from '@mui/icons-material';
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
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [selectedWhiteboard, setSelectedWhiteboard] = useState(null);

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
        <Typography sx={{ mt: 2, color: 'textSecondary' }}>Loading your results...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 5 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
        <Button onClick={() => navigate('/my-tests')} sx={{ mt: 2 }} variant="outlined">
          Back to My Tests
        </Button>
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

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="800" color="#1E293B">
            Exam Results: {submission.exam_title}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Review your scores, detailed feedback for each question, and submitted answer sheets.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          color="warning" 
          onClick={() => handleRaiseDispute()}
          sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
        >
          Raise Exam-Level Dispute
        </Button>
      </Box>

      {/* Summary Score Card */}
      <Paper elevation={0} sx={{ p: 3.5, mb: 4, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" fontWeight="600" color="textSecondary" textTransform="uppercase">
              Candidate Name
            </Typography>
            <Typography variant="h6" fontWeight="700" color="#1E293B">
              {submission.candidate?.full_name || submission.candidate?.email}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" fontWeight="600" color="textSecondary" textTransform="uppercase">
              Submitted At
            </Typography>
            <Typography variant="body1" fontWeight="600" color="#334155">
              {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" fontWeight="600" color="textSecondary" textTransform="uppercase">
              Final Total Score
            </Typography>
            <Typography variant="h4" fontWeight="800" color="primary.main">
              {submission.total_score !== null && submission.total_score !== undefined ? submission.total_score : 'Pending'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h5" fontWeight="800" color="#1E293B" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Questions & Answers Evaluation ({submission.answers?.length || 0})
      </Typography>
      
      {submission.answers && submission.answers.length > 0 ? (
        submission.answers.map((answer, index) => (
          <Paper 
            key={answer.id} 
            elevation={0} 
            sx={{ p: 3.5, mb: 3, borderRadius: 3, border: '1px solid #E2E8F0', borderLeft: '6px solid #0F172A' }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="subtitle1" fontWeight="700" color="#1E293B">
                Question {index + 1}: {answer.question?.text}
              </Typography>
              <Chip 
                label={`Score: ${answer.marks_awarded !== null && answer.marks_awarded !== undefined ? answer.marks_awarded : 'N/A'}`} 
                color={answer.marks_awarded > 0 ? "success" : "default"}
                size="small" 
                sx={{ fontWeight: 700, fontSize: '0.85rem', px: 1 }}
              />
            </Box>

            {answer.question?.image && (
              <Box sx={{ mb: 2, p: 1, bgcolor: '#f1f5f9', borderRadius: 2, display: 'inline-block' }}>
                <img 
                  src={answer.question.image} 
                  alt="Question Diagram" 
                  style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '6px', objectFit: 'contain' }} 
                />
              </Box>
            )}
            
            {/* Candidate Submitted Response */}
            <Box sx={{ mb: 2, p: 2.5, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight="700" color="#475569">
                  Your Answer:
                </Typography>
                {answer.whiteboard_data ? (
                  <Button 
                    variant="outlined" 
                    size="small" 
                    color="primary"
                    startIcon={<BrushIcon />}
                    onClick={() => setSelectedWhiteboard(answer.whiteboard_data)}
                    sx={{ textTransform: 'none', borderRadius: 1.5 }}
                  >
                    View Your Whiteboard Drawing
                  </Button>
                ) : (
                  <Chip 
                    label="No Drawing" 
                    size="small" 
                    variant="outlined" 
                    sx={{ color: '#94A3B8', borderColor: '#CBD5E1', fontSize: '0.75rem' }} 
                  />
                )}
              </Box>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: '#1E293B' }}>
                {answer.text_answer || <span style={{ fontStyle: 'italic', color: '#94A3B8' }}>No text answer provided.</span>}
              </Typography>
            </Box>

            {/* Examiner Feedback */}
            {answer.feedback && (
              <Box sx={{ mb: 2, p: 2, bgcolor: '#F1F5F9', borderLeft: '4px solid #0F172A', borderRadius: 1.5 }}>
                <Typography variant="subtitle2" fontWeight="700" color="#0F172A" gutterBottom>
                  Examiner Feedback:
                </Typography>
                <Typography variant="body2" color="#334155">
                  {answer.feedback}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button 
                size="small" 
                color="warning" 
                variant="outlined"
                onClick={() => handleRaiseDispute(answer)}
                sx={{ textTransform: 'none', borderRadius: 1.5 }}
              >
                Raise Dispute for Question {index + 1}
              </Button>
            </Box>
          </Paper>
        ))
      ) : (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <Typography color="textSecondary">No answers recorded for this exam.</Typography>
        </Paper>
      )}

      {/* Whiteboard Modal */}
      <Modal
        open={!!selectedWhiteboard}
        onClose={() => setSelectedWhiteboard(null)}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{ backdrop: { timeout: 500 } }}
      >
        <Fade in={!!selectedWhiteboard}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: 24,
            p: 1.5,
            bgcolor: '#fff',
            outline: 'none',
            maxWidth: '90vw',
            maxHeight: '90vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 2
          }}>
            {selectedWhiteboard && (
              <img 
                src={selectedWhiteboard} 
                alt="Candidate Whiteboard Drawing"
                style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' }}
              />
            )}
          </Box>
        </Fade>
      </Modal>

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
