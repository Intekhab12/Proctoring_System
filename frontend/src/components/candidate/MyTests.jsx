import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress, Alert,
  Breadcrumbs, Link, Card, CardContent, Grid
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import examService from '../../api/examService';

const MyTests = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyExams();
  }, []);

  const fetchMyExams = async () => {
    try {
      setLoading(true);
      const res = await examService.getCandidateExams();
      const list = res.data?.results || res.data || [];
      setExams(list);
    } catch (err) {
      console.error('[MyTests] Error fetching candidate exams:', err);
      setError(err.response?.data?.error || 'Failed to load your test history.');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTimeRange = (startIso, endIso) => {
    if (!startIso || !endIso) return 'N/A';
    const start = new Date(startIso);
    const end = new Date(endIso);

    const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };

    const startDateStr = start.toLocaleDateString('en-US', dateOptions);
    const startTimeStr = start.toLocaleTimeString('en-US', timeOptions);
    const endTimeStr = end.toLocaleTimeString('en-US', timeOptions);

    return `${startDateStr}, ${startTimeStr} – ${endTimeStr}`;
  };

  const getStatusChip = (status) => {
    switch (status?.toLowerCase()) {
      case 'upcoming':
        return <Chip label="🟢 Upcoming" color="success" size="small" variant="outlined" sx={{ fontWeight: 'bold' }} />;
      case 'ongoing':
        return <Chip label="🟠 Ongoing" color="warning" size="small" variant="filled" sx={{ fontWeight: 'bold' }} />;
      case 'completed':
        return <Chip label="✅ Completed" color="default" size="small" variant="outlined" sx={{ fontWeight: 'bold', bgcolor: 'action.hover' }} />;
      default:
        return <Chip label={status || 'Unknown'} size="small" />;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 5, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>Loading your tests...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      {/* Header & Breadcrumbs */}
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
          <Link color="inherit" underline="hover" onClick={() => navigate('/dashboard')} sx={{ cursor: 'pointer' }}>
            Dashboard
          </Link>
          <Typography color="text.primary">My Tests</Typography>
        </Breadcrumbs>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          My Tests
        </Typography>
        <Typography variant="body1" color="textSecondary">
          View all tests you are registered for, including upcoming schedule dates and statuses.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {exams.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No Registered Tests Found
          </Typography>
          <Typography variant="body2" color="textSecondary">
            You are not currently registered for any exams. Check available exams on your dashboard.
          </Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ bgcolor: 'grey.100' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Exam Title</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Duration</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {exams.map((exam) => (
                  <TableRow 
                    key={exam.id}
                    hover
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      <Typography variant="subtitle2" fontWeight="bold">
                        {exam.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textPrimary">
                        {formatDateTimeRange(exam.start_time, exam.end_time)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {exam.duration_minutes} mins
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {getStatusChip(exam.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Container>
  );
};

export default MyTests;
