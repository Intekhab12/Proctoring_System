import React, { useState, useContext } from 'react';
import { 
  Container, TextField, Button, Typography, Box, Alert, 
  InputAdornment, IconButton, FormControl, InputLabel, Select, MenuItem, Paper, CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff, School, Person } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { AuthContext } from '../../context/AuthContext';

const Signup = () => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    email: searchParams.get('email') || '', 
    password: '', 
    confirmPassword: '', 
    full_name: '', 
    contact_number: '', 
    handle: '', 
    institution: '',
    role: 'student'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
    setError('');
    setLoading(true);
    try {
      await axiosInstance.post('/api/auth/register/', formData);
      await login(formData.email.trim(), formData.password);
      
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
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box mt={4} mb={6} display="flex" flexDirection="column" alignItems="center">
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
              Create Account
            </Typography>
            <Typography variant="body2" color="#64748B">
              Join ProctorBuddy assessment and evaluation platform
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ width: '100%', mb: 3, borderRadius: 1.5 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} width="100%">
            <FormControl fullWidth margin="normal" required sx={{ mb: 2 }}>
              <InputLabel id="role-select-label">Account Role</InputLabel>
              <Select
                labelId="role-select-label"
                id="role-select"
                name="role"
                value={formData.role}
                label="Account Role"
                onChange={handleChange}
                sx={{ borderRadius: 1 }}
              >
                <MenuItem value="student" sx={{ py: 1.2 }}>
                  <Box display="flex" alignItems="center" gap={1.2}>
                    <Person sx={{ color: '#0F172A', fontSize: 20 }} />
                    <Box>
                      <Typography variant="body2" fontWeight="700" color="#0F172A">Student / Candidate</Typography>
                      <Typography variant="caption" color="#64748B">Take scheduled exams and view graded results</Typography>
                    </Box>
                  </Box>
                </MenuItem>
                <MenuItem value="examiner" sx={{ py: 1.2 }}>
                  <Box display="flex" alignItems="center" gap={1.2}>
                    <School sx={{ color: '#EF4444', fontSize: 20 }} />
                    <Box>
                      <Typography variant="body2" fontWeight="700" color="#0F172A">Examiner / Instructor</Typography>
                      <Typography variant="caption" color="#64748B">Create tests, invite candidates & grade submissions</Typography>
                    </Box>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <TextField 
              fullWidth 
              margin="normal" 
              label="Full Name" 
              name="full_name" 
              value={formData.full_name} 
              onChange={handleChange} 
              required 
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />

            <TextField 
              fullWidth 
              margin="normal" 
              label="Email Address" 
              name="email" 
              type="email" 
              value={formData.email} 
              onChange={handleChange} 
              required 
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />

            <TextField 
              fullWidth 
              margin="normal" 
              label="Password" 
              name="password" 
              type={showPassword ? 'text' : 'password'} 
              value={formData.password} 
              onChange={handleChange} 
              required 
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
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

            <TextField 
              fullWidth 
              margin="normal" 
              label="Confirm Password" 
              name="confirmPassword" 
              type={showConfirmPassword ? 'text' : 'password'} 
              value={formData.confirmPassword} 
              onChange={handleChange} 
              required 
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
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

            <TextField 
              fullWidth 
              margin="normal" 
              label="Contact Number (Optional)" 
              name="contact_number" 
              value={formData.contact_number} 
              onChange={handleChange} 
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />

            <TextField 
              fullWidth 
              margin="normal" 
              label="Institution / University (Optional)" 
              name="institution" 
              value={formData.institution} 
              onChange={handleChange} 
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
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Complete Registration'}
            </Button>

            <Box textAlign="center" mt={2}>
              <Typography variant="body2" color="#64748B">
                Already have an account?{' '}
                <Box 
                  component="span" 
                  sx={{ cursor: 'pointer', color: '#0F172A', fontWeight: 700, '&:hover': { textDecoration: 'underline' } }} 
                  onClick={() => navigate('/login')}
                >
                  Log In
                </Box>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Signup;
