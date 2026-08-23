import React, { useState } from 'react';
import { Container, TextField, Button, Typography, Box, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axiosInstance.post('/api/auth/forgot-password/', { email });
      setMessage(res.data.message);
      setTimeout(() => navigate('/reset-password'), 2000);
    } catch (err) {
      setError('Error sending OTP');
    }
  };

  return (
    <Container maxWidth="xs">
      <Box mt={8} display="flex" flexDirection="column" alignItems="center">
        <Typography variant="h4" gutterBottom>Forgot Password</Typography>
        {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
        {message && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{message}</Alert>}
        <Box component="form" onSubmit={handleSubmit} width="100%">
          <TextField
            fullWidth margin="normal" label="Email" type="email"
            value={email} onChange={(e) => setEmail(e.target.value)} required
          />
          <Button type="submit" fullWidth variant="contained" color="primary" sx={{ mt: 3, mb: 2 }}>
            Send OTP
          </Button>
          <Typography variant="body2" sx={{ cursor: 'pointer', textAlign: 'center', color: 'primary.main' }} onClick={() => navigate('/login')}>
            Back to Login
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default ForgotPassword;
