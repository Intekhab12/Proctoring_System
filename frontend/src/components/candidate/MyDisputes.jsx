import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress, Alert,
  Breadcrumbs, Link, Button
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import { useNavigate } from 'react-router-dom';
import examService from '../../api/examService';
import DisputeChatModal from '../common/DisputeChatModal';

const MyDisputes = () => {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const res = await examService.getMyDisputes();
      setDisputes(res.data.results || res.data || []);
    } catch (err) {
      console.error('Error fetching disputes:', err);
      setError('Failed to load disputes.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = (dispute) => {
    setSelectedDispute(dispute);
    setChatModalOpen(true);
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
        <Typography sx={{ mt: 2 }}>Loading your disputes...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link color="inherit" underline="hover" onClick={() => navigate('/dashboard')} sx={{ cursor: 'pointer' }}>Dashboard</Link>
        <Typography color="text.primary">My Disputes</Typography>
      </Breadcrumbs>

      <Typography variant="h4" fontWeight="bold" gutterBottom>
        My Disputes
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {disputes.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="body1" color="textSecondary">You have not raised any disputes.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Exam Title</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Question / Scope</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Latest Message / Reply</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {disputes.map((dispute) => (
                <TableRow key={dispute.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{dispute.exam_title}</TableCell>
                  <TableCell>
                    {dispute.question_text ? (
                      <Chip label={`Question: ${dispute.question_text.slice(0, 25)}...`} size="small" variant="outlined" color="primary" />
                    ) : (
                      <Chip label="Overall Exam" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {dispute.reply ? `Examiner: ${dispute.reply}` : `You: ${dispute.message}`}
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
                      sx={{ textTransform: 'none', borderRadius: 1.5, bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}
                    >
                      Open Chat
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dispute Chat Modal */}
      {chatModalOpen && selectedDispute && (
        <DisputeChatModal
          open={chatModalOpen}
          onClose={() => setChatModalOpen(false)}
          dispute={selectedDispute}
          onDisputeUpdated={() => fetchDisputes()}
        />
      )}
    </Container>
  );
};

export default MyDisputes;
