import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress, Alert,
  Breadcrumbs, Link
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import examService from '../../api/examService';

const MyDisputes = () => {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
                <TableCell>Exam Title</TableCell>
                <TableCell>Question / Overall</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Reply</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {disputes.map((dispute) => (
                <TableRow key={dispute.id}>
                  <TableCell>{dispute.exam_title}</TableCell>
                  <TableCell>
                    {dispute.question_text || <Typography variant="caption" color="textSecondary">Overall Exam</Typography>}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxWidth: 300 }}>
                      {dispute.message}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {dispute.reply ? (
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxWidth: 300 }}>
                        {dispute.reply}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="textSecondary">Pending</Typography>
                    )}
                  </TableCell>
                  <TableCell>{getStatusChip(dispute.status)}</TableCell>
                  <TableCell>
                    <Typography variant="caption">{new Date(dispute.created_at).toLocaleString()}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default MyDisputes;
