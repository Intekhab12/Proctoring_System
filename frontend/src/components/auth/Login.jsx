import React, { useState, useContext } from 'react';
import { Container, TextField, Button, Typography, Box, Alert, InputAdornment, IconButton, Paper, CircularProgress } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      const pendingExam = sessionStorage.getItem('pending_exam');
      if (pendingExam) {
        sessionStorage.removeItem('pending_exam');
        navigate(`/exam/register/${pendingExam}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
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
              Sign In
            </Typography>
            <Typography variant="body2" color="#64748B">
              Access your ProctorBuddy account
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ width: '100%', mb: 3, borderRadius: 1.5 }}>{error}</Alert>}

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
            <TextField
              fullWidth
              margin="normal"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
            <Box display="flex" justifyContent="space-between" mt={1}>
              <Typography
                variant="body2"
                sx={{
                  cursor: 'pointer',
                  color: '#64748B',
                  fontWeight: 600,
                  '&:hover': { color: '#0F172A', textDecoration: 'underline' }
                }}
                onClick={() => navigate('/forgot-password')}
              >
                Forgot Password?
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  cursor: 'pointer',
                  color: '#EF4444',
                  fontWeight: 700,
                  '&:hover': { textDecoration: 'underline' }
                }}
                onClick={() => navigate('/signup')}
              >
                Sign Up
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
