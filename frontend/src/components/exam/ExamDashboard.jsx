import React, { useEffect, useState, useContext } from 'react';
import { Container, Typography, Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import examService from '../../api/examService';

const ExamDashboard = () => {
  const [exams, setExams] = useState([]);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await examService.getAllExams();
      setExams(res.data);
    } catch (err) {
      console.error('Failed to fetch exams:', err);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">My Exams</Typography>
        <Button variant="contained" color="primary" onClick={() => navigate('/exams/create')}>
          Create New Exam
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Duration (mins)</TableCell>
              <TableCell>Start Time</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {exams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">No exams created yet.</TableCell>
              </TableRow>
            ) : (
              exams.map((exam) => (
                <TableRow key={exam.id}>
                  <TableCell>{exam.title}</TableCell>
                  <TableCell>{exam.duration_minutes}</TableCell>
                  <TableCell>{new Date(exam.start_time).toLocaleString()}</TableCell>
                  <TableCell>
                    {exam.is_published ? (
                      <Chip label="Published" color="success" size="small" />
                    ) : (
                      <Chip label="Draft" color="warning" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined" onClick={() => navigate(`/exams/${exam.id}`)}>View</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default ExamDashboard;
