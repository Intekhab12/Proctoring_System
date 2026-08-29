import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress, Alert,
  Breadcrumbs, Link, Button
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import { useParams, useNavigate } from 'react-router-dom';
import examService from '../../api/examService';
import DisputeChatModal from '../common/DisputeChatModal';

const DisputesList = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [chatModalOpen, setChatModalOpen] = useState(false);
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

  const handleOpenChat = (dispute) => {
    setSelectedDispute(dispute);
    setChatModalOpen(true);
  };

  const handleResolve = async (disputeId) => {
    if (!window.confirm("Are you sure you want to mark this dispute as resolved?")) return;
    try {
      await examService.resolveDispute(disputeId);
      fetchDisputes();
    } catch (err) {
      console.error("Failed to resolve dispute:", err);
      alert("Failed to resolve dispute.");
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'open':
        return <Chip label="Open" color="warning" size="small" sx={{ fontWeight: 600 }} />;
      case 'in_progress':
        return <Chip label="In Progress" color="info" size="small" sx={{ fontWeight: 600 }} />;
      case 'resolved':
        return <Chip label="Resolved" color="success" size="small" sx={{ fontWeight: 600 }} />;
      case 'closed':
        return <Chip label="Closed" size="small" sx={{ fontWeight: 600 }} />;
      default:
        return <Chip label={status} size="small" sx={{ fontWeight: 600 }} />;
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
                <TableCell sx={{ fontWeight: 700 }}>Candidate</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Question</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Latest Message</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {disputes.map((dispute) => (
                <TableRow key={dispute.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">{dispute.raised_by_name || 'Candidate'}</Typography>
                  </TableCell>
                  <TableCell>
                    {dispute.question_text ? (
                       <Typography variant="caption">{dispute.question_text.substring(0, 50)}...</Typography>
                    ) : (
                      <Typography variant="caption" color="textSecondary">Overall Exam</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {dispute.reply ? `Reply: ${dispute.reply}` : dispute.message}
                    </Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(dispute.status)}</TableCell>
                  <TableCell>
                    <Typography variant="caption">{new Date(dispute.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button 
                      size="small" 
                      variant="contained" 
                      startIcon={<ChatIcon fontSize="small" />}
                      onClick={() => handleOpenChat(dispute)}
                      sx={{ mr: 1, textTransform: 'none', borderRadius: 1.5, bgcolor: '#0F172A', '&:hover': { bgcolor: '#020617' } }}
                    >
                      Open Chat
                    </Button>
                    {dispute.status !== 'resolved' && (
                      <Button 
                        size="small" 
                        color="success" 
                        variant="outlined"
                        onClick={() => handleResolve(dispute.id)}
                        sx={{ textTransform: 'none', borderRadius: 1.5 }}
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

      {chatModalOpen && selectedDispute && (
        <DisputeChatModal
          open={chatModalOpen}
          onClose={() => setChatModalOpen(false)}
          dispute={selectedDispute}
          onDisputeUpdated={fetchDisputes}
        />
      )}
    </Container>
  );
};

export default DisputesList;
