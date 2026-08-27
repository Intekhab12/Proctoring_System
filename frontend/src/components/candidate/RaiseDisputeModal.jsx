import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, CircularProgress, Alert
} from '@mui/material';
import examService from '../../api/examService';

const RaiseDisputeModal = ({ open, onClose, submissionId, question }) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError('Please provide a message for your dispute.');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const payload = {
        submission_id: submissionId,
        message: message.trim()
      };
      
      if (question) {
        payload.question_id = question.question?.id; // from SubmissionEvaluationSerializer
      }
      
      await examService.createDispute(payload);
      setSuccess('Dispute raised successfully. The examiner will be notified.');
      setMessage('');
      
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (err) {
      console.error('Error raising dispute:', err);
      setError(err.response?.data?.error || 'Failed to raise dispute. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={!loading && !success ? onClose : undefined} maxWidth="sm" fullWidth>
      <DialogTitle>Raise a Dispute</DialogTitle>
      <DialogContent dividers>
        {success ? (
          <Alert severity="success">{success}</Alert>
        ) : (
          <>
            <Box sx={{ mb: 3 }}>
              {question ? (
                <Typography variant="body2" color="textSecondary">
                  Raising dispute for Question: <strong>{question.question?.text}</strong>
                </Typography>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Raising dispute for the overall exam result.
                </Typography>
              )}
            </Box>
            
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            <TextField
              label="Dispute Details"
              multiline
              rows={4}
              fullWidth
              variant="outlined"
              placeholder="Explain why you are raising a dispute..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </>
        )}
      </DialogContent>
      {!success && (
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="warning" 
            disabled={loading || !message.trim()}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Submit Dispute'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default RaiseDisputeModal;
