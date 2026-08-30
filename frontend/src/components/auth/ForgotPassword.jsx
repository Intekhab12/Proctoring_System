import React, { useState } from 'react';
import { Container, TextField, Button, Typography, Box, Alert, Paper, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await axiosInstance.post('/api/auth/forgot-password/', { email: email.trim() });
      setMessage(res.data.message || 'OTP sent successfully! Redirecting...');
      setTimeout(() => navigate('/reset-password'), 2000);
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Error sending OTP. Please verify your email and network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box mt={8} mb={6} display="flex" flexDirection="column" alignItems="center">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4.5 },
            width: '100%',
            borderRadius: 2,
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
          }}
        >
          <Box textAlign="center" mb={3}>
            <Typography variant="h4" fontWeight="800" color="#0F172A" gutterBottom>
              Forgot Password
            </Typography>
            <Typography variant="body2" color="#64748B">
              Enter your registered email to receive a password reset OTP
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ width: '100%', mb: 3, borderRadius: 1.5 }}>{error}</Alert>}
          {message && <Alert severity="success" sx={{ width: '100%', mb: 3, borderRadius: 1.5 }}>{message}</Alert>}

          <Box component="form" onSubmit={handleSubmit} width="100%">
            <TextField
              fullWidth
              margin="normal"
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
              sx={{
                mt: 3,
                mb: 2,
                py: 1.4,
                fontWeight: 700,
                borderRadius: 1,
                fontSize: '1rem',
                textTransform: 'none'
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Send OTP'}
            </Button>

            <Box textAlign="center" mt={2}>
              <Typography
                variant="body2"
                sx={{
                  cursor: 'pointer',
                  color: '#0F172A',
                  fontWeight: 700,
                  '&:hover': { textDecoration: 'underline' }
                }}
                onClick={() => navigate('/login')}
              >
                Back to Login
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ForgotPassword;
