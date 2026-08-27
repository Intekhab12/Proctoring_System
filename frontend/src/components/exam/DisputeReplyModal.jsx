import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, CircularProgress, Alert
} from '@mui/material';
import examService from '../../api/examService';

const DisputeReplyModal = ({ open, onClose, dispute, onSuccess }) => {
  const [reply, setReply] = useState(dispute?.reply || '');
  const [status, setStatus] = useState(dispute?.status || 'open');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!reply.trim()) {
      setError('Please provide a reply message.');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const payload = {
        reply: reply.trim(),
        status: status !== 'open' ? status : 'in_progress'
      };
      
      await examService.replyDispute(dispute.id, payload);
      onSuccess();
      onClose();
      
    } catch (err) {
      console.error('Error replying to dispute:', err);
      setError(err.response?.data?.error || 'Failed to send reply. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!dispute) return null;

  return (
    <Dialog open={open} onClose={!loading ? onClose : undefined} maxWidth="sm" fullWidth>
      <DialogTitle>Reply to Dispute</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="textSecondary">Candidate Message:</Typography>
          <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
            {dispute.message}
          </Typography>
        </Box>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <TextField
          label="Your Reply"
          multiline
          rows={4}
          fullWidth
          variant="outlined"
          placeholder="Type your response to the candidate..."
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          disabled={loading}
          autoFocus
        />
        
        <Box sx={{ mt: 2 }}>
          <TextField
            select
            label="Update Status"
            fullWidth
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={loading}
            SelectProps={{
              native: true,
            }}
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary" 
          disabled={loading || !reply.trim()}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Reply'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DisputeReplyModal;
