import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Button, Chip, CircularProgress, Alert
} from '@mui/material';
import examService from '../../api/examService';

const SubmissionsList = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subRes, examRes] = await Promise.all([
          examService.getExamSubmissions(id),
          examService.getExam(id)
        ]);
        setSubmissions(subRes.data);
        setExam(examRes.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch submissions.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <Container sx={{ mt: 4 }}><CircularProgress /></Container>;
  if (error) return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Submissions for {exam?.title}
        </Typography>
        <Button variant="outlined" onClick={() => navigate(`/exams/${id}`)}>
          Back to Exam
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Candidate Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Submitted At</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Score</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {submissions.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell>{sub.candidate.full_name || 'N/A'}</TableCell>
                <TableCell>{sub.candidate.email}</TableCell>
                <TableCell>{sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'Not submitted'}</TableCell>
                <TableCell>
                  <Chip 
                    label={sub.status} 
                    color={sub.status === 'evaluated' ? 'success' : sub.status === 'submitted' ? 'warning' : 'default'} 
                    size="small" 
                  />
                </TableCell>
                <TableCell>{sub.total_score !== null ? sub.total_score : '-'}</TableCell>
                <TableCell>
                  <Button 
                    variant="contained" 
                    size="small" 
                    onClick={() => navigate(`/submissions/${sub.id}`)}
                    disabled={sub.status === 'registered' || sub.status === 'started'}
                  >
                    View / Grade
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {submissions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">No submissions found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default SubmissionsList;
