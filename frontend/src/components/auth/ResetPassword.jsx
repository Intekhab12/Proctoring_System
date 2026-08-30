import React, { useState } from 'react';
import { Container, TextField, Button, Typography, Box, Alert, InputAdornment, IconButton, Paper, CircularProgress } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

const ResetPassword = () => {
  const [formData, setFormData] = useState({ email: '', otp: '', new_password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await axiosInstance.post('/api/auth/verify-otp/', {
        ...formData,
        email: formData.email.trim(),
        otp: formData.otp.trim()
      });
      setMessage(res.data.message || 'Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Error resetting password. Please check your OTP.');
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
              Reset Password
            </Typography>
            <Typography variant="body2" color="#64748B">
              Enter the OTP sent to your email and choose a new password
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ width: '100%', mb: 3, borderRadius: 1.5 }}>{error}</Alert>}
          {message && <Alert severity="success" sx={{ width: '100%', mb: 3, borderRadius: 1.5 }}>{message}</Alert>}

          <Box component="form" onSubmit={handleSubmit} width="100%">
            <TextField
              fullWidth
              margin="normal"
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="6-Digit OTP"
              name="otp"
              value={formData.otp}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="e.g. 123456"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="New Password"
              name="new_password"
              type={showPassword ? 'text' : 'password'}
              value={formData.new_password}
              onChange={handleChange}
              required
              disabled={loading}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={loading}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }
              }}
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
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
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

export default ResetPassword;
