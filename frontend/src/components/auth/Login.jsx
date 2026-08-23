import React, { useState, useContext } from 'react';
import { Container, TextField, Button, Typography, Box, Alert, InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      const pendingExam = sessionStorage.getItem('pending_exam');
      if (pendingExam) {
        sessionStorage.removeItem('pending_exam');
        navigate(`/exam/register/${pendingExam}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Invalid credentials.');
    }
  };

  return (
    <Container maxWidth="xs">
      <Box mt={8} display="flex" flexDirection="column" alignItems="center">
        <Typography variant="h4" gutterBottom>Login</Typography>
        {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit} width="100%">
          <TextField
            fullWidth margin="normal" label="Email" type="email"
            value={email} onChange={(e) => setEmail(e.target.value)} required
          />
          <TextField
            fullWidth margin="normal" label="Password" type={showPassword ? 'text' : 'password'}
            value={password} onChange={(e) => setPassword(e.target.value)} required
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton aria-label="toggle password visibility" onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
          />
          <Button type="submit" fullWidth variant="contained" color="primary" sx={{ mt: 3, mb: 2 }}>
            Sign In
          </Button>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" sx={{ cursor: 'pointer', color: 'primary.main' }} onClick={() => navigate('/forgot-password')}>
              Forgot Password?
            </Typography>
            <Typography variant="body2" sx={{ cursor: 'pointer', color: 'primary.main' }} onClick={() => navigate('/signup')}>
              Sign Up
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;
