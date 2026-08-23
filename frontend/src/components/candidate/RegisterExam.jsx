import React, { useEffect, useState, useContext } from 'react';
import { Container, Typography, Box, Paper, Button, CircularProgress, Alert } from '@mui/material';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import examService from '../../api/examService';
import { AuthContext } from '../../context/AuthContext';

const RegisterExam = () => {
  const { examId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useContext(AuthContext);
  
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    // If auth is still loading, wait
    if (authLoading) return;
    
    // If not logged in, save intent and redirect to login/signup
    if (!user) {
      const email = searchParams.get('email');
      sessionStorage.setItem('pending_exam', examId);
      if (email) {
        navigate(`/signup?email=${encodeURIComponent(email)}`);
      } else {
        navigate('/login');
      }
      return;
    }

    // User is logged in, fetch exam details (we use the public/regular getExam endpoint if allowed,
    // but the candidate might not be the creator. Wait, the regular getExam endpoint requires IsExamCreator!
    // Since we didn't make a public endpoint, we will just try to register directly, 
    // or fetch from getAvailableExams to find it. Let's fetch available exams and see if it's there.
    fetchCandidateStatus();
  }, [user, authLoading, examId]);

  const fetchCandidateStatus = async () => {
    try {
      const res = await examService.getCandidateExamStatus(examId);
      const data = res.data;
      if (!data.is_eligible) {
        setError("You do not have an invitation for this exam.");
      } else if (!data.exam.is_published) {
        setError("This exam is not published yet.");
      } else if (data.status === 'submitted' || data.status === 'evaluated') {
        setError("You have already submitted this exam.");
      } else if (new Date(data.exam.end_time) < new Date()) {
        setError("The registration window for this exam has ended.");
      } else {
        setExam(data.exam);
        if (data.status === 'registered') {
          setRegistered(true);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to verify exam invitation.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      await examService.registerForExam(examId);
      setRegistered(true);
      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (err) {
      const data = err.response?.data;
      let errMsg = 'Registration failed';
      if (data) {
        if (typeof data === 'string') errMsg = data;
        else if (Array.isArray(data)) errMsg = data[0];
        else if (data.detail) errMsg = data.detail;
        else if (data.error) errMsg = data.error;
        else if (data.message) errMsg = data.message;
        else if (data.non_field_errors) errMsg = data.non_field_errors[0];
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>Exam Registration</Typography>
        
        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : !exam ? (
          <Alert severity="warning">Exam not found.</Alert>
        ) : (
          <Box mt={3}>
            <Typography variant="h5" color="primary">{exam.title}</Typography>
            <Box my={3} p={2} bgcolor="grey.50" borderRadius={2} textAlign="left">
              <Typography variant="body1"><strong>Start:</strong> {new Date(exam.start_time).toLocaleString()}</Typography>
              <Typography variant="body1"><strong>End:</strong> {new Date(exam.end_time).toLocaleString()}</Typography>
              <Typography variant="body1"><strong>Duration:</strong> {exam.duration_minutes} minutes</Typography>
            </Box>

            {registered ? (
              <Alert severity="success">
                You are successfully registered! Redirecting to your dashboard...
              </Alert>
            ) : (
              <Button variant="contained" color="primary" size="large" onClick={handleRegister} fullWidth>
                Confirm Registration
              </Button>
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default RegisterExam;
