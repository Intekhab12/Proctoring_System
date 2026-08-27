import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress, Alert,
  Breadcrumbs, Link, Button, IconButton
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import examService from '../../api/examService';
import DisputeReplyModal from './DisputeReplyModal';

const DisputesList = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const res = await examService.getExamDisputes(examId);
      setDisputes(res.data.results || res.data || []);
    } catch (err) {
      console.error('Error fetching disputes:', err);
      setError('Failed to load disputes for this exam.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [examId]);

  const handleOpenReply = (dispute) => {
    setSelectedDispute(dispute);
    setReplyModalOpen(true);
  };

  const handleResolve = async (disputeId) => {
    if (!window.confirm("Are you sure you want to mark this dispute as resolved?")) return;
    try {
      await examService.resolveDispute(disputeId);
      fetchDisputes();
    } catch (err) {
      alert("Failed to resolve dispute.");
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'open':
        return <Chip label="Open" color="warning" size="small" />;
      case 'in_progress':
        return <Chip label="In Progress" color="info" size="small" />;
      case 'resolved':
        return <Chip label="Resolved" color="success" size="small" />;
      case 'closed':
        return <Chip label="Closed" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 5, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading disputes...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link color="inherit" underline="hover" onClick={() => navigate('/dashboard')} sx={{ cursor: 'pointer' }}>Dashboard</Link>
        <Link color="inherit" underline="hover" onClick={() => navigate(`/exams/${examId}`)} sx={{ cursor: 'pointer' }}>Exam Details</Link>
        <Typography color="text.primary">Disputes</Typography>
      </Breadcrumbs>

      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Manage Disputes
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {disputes.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="body1" color="textSecondary">No disputes raised for this exam yet.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell>Candidate</TableCell>
                <TableCell>Question</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {disputes.map((dispute) => (
                <TableRow key={dispute.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">{dispute.raised_by_name}</Typography>
                  </TableCell>
                  <TableCell>
                    {dispute.question_text ? (
                       <Typography variant="caption">{dispute.question_text.substring(0, 50)}...</Typography>
                    ) : (
                      <Typography variant="caption" color="textSecondary">Overall Exam</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{dispute.message}</Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(dispute.status)}</TableCell>
                  <TableCell>
                    <Typography variant="caption">{new Date(dispute.created_at).toLocaleString()}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => handleOpenReply(dispute)}
                      sx={{ mr: 1 }}
                    >
                      {dispute.reply ? 'Edit Reply' : 'Reply'}
                    </Button>
                    {dispute.status !== 'resolved' && (
                      <Button 
                        size="small" 
                        color="success" 
                        variant="contained"
                        onClick={() => handleResolve(dispute.id)}
                      >
                        Resolve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {replyModalOpen && selectedDispute && (
        <DisputeReplyModal
          open={replyModalOpen}
          onClose={() => setReplyModalOpen(false)}
          dispute={selectedDispute}
          onSuccess={fetchDisputes}
        />
      )}
    </Container>
  );
};

export default DisputesList;
