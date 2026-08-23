import React, { useState, useContext } from 'react';
import { Container, TextField, Button, Typography, Box, Alert, InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { AuthContext } from '../../context/AuthContext';

const Signup = () => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    email: searchParams.get('email') || '', password: '', confirmPassword: '', full_name: '', contact_number: '', handle: '', institution: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }
    try {
      await axiosInstance.post('/api/auth/register/', formData);
      await login(formData.email, formData.password);
      
      const pendingExam = sessionStorage.getItem('pending_exam');
      if (pendingExam) {
        sessionStorage.removeItem('pending_exam');
        navigate(`/exam/register/${pendingExam}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.response?.data) {
        const firstErrorKey = Object.keys(err.response.data)[0];
        const firstErrorMsg = err.response.data[firstErrorKey];
        setError(Array.isArray(firstErrorMsg) ? `${firstErrorKey}: ${firstErrorMsg[0]}` : 'Registration failed.');
      } else {
        setError('Registration failed. Check inputs.');
      }    }
  };

  return (
    <Container maxWidth="sm">
      <Box mt={4} display="flex" flexDirection="column" alignItems="center">
        <Typography variant="h4" gutterBottom>Sign Up</Typography>
        {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit} width="100%">
          <TextField fullWidth margin="normal" label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
          <TextField fullWidth margin="normal" label="Password" name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange} required 
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
          <TextField fullWidth margin="normal" label="Confirm Password" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleChange} required 
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton aria-label="toggle confirm password visibility" onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
          />
          <TextField fullWidth margin="normal" label="Full Name" name="full_name" value={formData.full_name} onChange={handleChange} required />
          <TextField fullWidth margin="normal" label="Contact Number" name="contact_number" value={formData.contact_number} onChange={handleChange} />
          <TextField fullWidth margin="normal" label="Handle (Optional)" name="handle" value={formData.handle} onChange={handleChange} />
          <TextField fullWidth margin="normal" label="Institution" name="institution" value={formData.institution} onChange={handleChange} />
          
          <Button type="submit" fullWidth variant="contained" color="primary" sx={{ mt: 3, mb: 2 }}>Sign Up</Button>
          <Typography variant="body2" sx={{ cursor: 'pointer', textAlign: 'center', color: 'primary.main' }} onClick={() => navigate('/login')}>
            Already have an account? Login
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Signup;
