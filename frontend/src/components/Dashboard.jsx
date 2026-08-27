import React, { useContext } from 'react';
import { Container, Typography, Box, Paper, Chip, Button, Divider, List, ListItem, ListItemText, ListItemSecondaryAction } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import examService from '../api/examService';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [availableExams, setAvailableExams] = React.useState([]);
  const [registeredExams, setRegisteredExams] = React.useState([]);

  React.useEffect(() => {
    if (user) {
      examService.getAvailableExams().then(res => {
        setAvailableExams(res.data.available);
        setRegisteredExams(res.data.registered);
      }).catch(console.error);
    }
  }, [user]);

  return (
    <Container maxWidth="md">
      <Box mt={4}>
        <Typography variant="h4" gutterBottom>Dashboard</Typography>
        <Paper sx={{ p: 3, mt: 2 }}>
          <Typography variant="h6">Welcome, {user?.full_name}!</Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
            Email: {user?.email}
          </Typography>
          <Box mt={4}>
            <Box mb={4}>
              <Typography variant="h6" mb={1}>
                Examiner Tools
              </Typography>
              <Typography variant="body2" mb={2} color="textSecondary">
                Create and manage exams for other candidates.
              </Typography>
              <Button variant="contained" color="primary" onClick={() => navigate('/exams')}>
                Manage Exams
              </Button>
            </Box>
            
            <Divider sx={{ my: 3 }} />

            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6">
                  Candidate Dashboard
                </Typography>
                <Button variant="outlined" color="primary" onClick={() => navigate('/my-tests')}>
                  My Tests History
                </Button>
              </Box>
              
              <Typography variant="subtitle1" mt={2} mb={1}>Pending Invitations ({availableExams.length})</Typography>
              <List>
                {availableExams.map(exam => (
                  <ListItem key={exam.id} divider>
                    <ListItemText 
                      primary={exam.title} 
                      secondary={`Window: ${new Date(exam.start_time).toLocaleString()} - ${new Date(exam.end_time).toLocaleString()}`} 
                    />
                    <ListItemSecondaryAction>
                      <Button variant="outlined" color="primary" onClick={() => navigate(`/exam/register/${exam.id}`)}>
                        View & Register
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {availableExams.length === 0 && <Typography variant="body2" color="textSecondary" sx={{ ml: 2, mt: 1 }}>No pending invitations.</Typography>}
              </List>

              <Typography variant="subtitle1" mt={4} mb={1}>Registered Exams ({registeredExams.length})</Typography>
              <List>
                {registeredExams.map(exam => {
                  const isExpired = new Date(exam.end_time) < new Date();
                  return (
                    <ListItem key={exam.id} divider>
                      <ListItemText 
                        primary={exam.title} 
                        secondary={`Duration: ${exam.duration_minutes} mins | Ends: ${new Date(exam.end_time).toLocaleString()}`} 
                      />
                      <ListItemSecondaryAction>
                        {isExpired ? (
                          <Chip label="Expired" color="error" variant="outlined" />
                        ) : (
                          <Button variant="contained" color="success" onClick={() => navigate(`/exam/take/${exam.id}`)}>
                            Start Exam
                          </Button>
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
                {registeredExams.length === 0 && <Typography variant="body2" color="textSecondary" sx={{ ml: 2, mt: 1 }}>No registered exams yet.</Typography>}
              </List>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Dashboard;
