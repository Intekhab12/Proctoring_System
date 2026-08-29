import React, { useContext, useEffect, useState } from 'react';
import { 
  Container, Typography, Box, Paper, Chip, Button, 
  Grid, Card, Avatar, CircularProgress
} from '@mui/material';
import { 
  Assignment as ExamIcon,
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as RegisteredIcon,
  Mail as PendingIcon,
  Security as SecurityIcon,
  HistoryEdu as HistoryEduIcon,
  QuestionAnswer as DisputeIcon,
  Event as EventIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import examService from '../api/examService';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [availableExams, setAvailableExams] = useState([]);
  const [registeredExams, setRegisteredExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setLoading(true);
      examService.getAvailableExams()
        .then(res => {
          const now = new Date();
          const validAvailable = (res.data.available || []).filter(exam => now <= new Date(exam.end_time));
          const validRegistered = (res.data.registered || []).filter(exam => now <= new Date(exam.end_time));
          setAvailableExams(validAvailable);
          setRegisteredExams(validRegistered);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      {/* Welcome Hero Banner */}
      <Paper 
        elevation={0}
        sx={{ 
          p: { xs: 3, md: 4 }, 
          mb: 4, 
          borderRadius: 2, 
          background: 'linear-gradient(135deg, #09090B 0%, #170C0E 50%, #200D11 100%)',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.45)'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 3, position: 'relative', zIndex: 1 }}>
          <Box display="flex" alignItems="center" gap={2.5}>
            <Avatar 
              src={user?.profile_picture ? (user.profile_picture.startsWith('http') ? user.profile_picture : `${import.meta.env.VITE_API_URL}${user.profile_picture}`) : ''}
              sx={{ 
                width: 68, 
                height: 68, 
                bgcolor: '#141416', 
                color: '#EF4444',
                fontSize: '1.75rem', 
                fontWeight: 800,
                border: '2.5px solid #EF4444',
                boxShadow: '0 0 12px rgba(239, 68, 68, 0.45)'
              }}
            >
              {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
            </Avatar>
            <Box>
              <Box display="flex" alignItems="center" gap={1.2} flexWrap="wrap" mb={0.5}>
                <Typography variant="h4" fontWeight="800" letterSpacing="-0.02em">
                  Welcome back, {user?.full_name || 'User'}!
                </Typography>
                {user?.is_examiner && (
                  <Chip 
                    label="Examiner" 
                    size="small" 
                    sx={{ 
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(225, 29, 72, 0.15) 100%)', 
                      color: '#FFE4E6', 
                      border: '1px solid rgba(239, 68, 68, 0.6)', 
                      fontWeight: 700,
                      boxShadow: '0 0 8px rgba(239, 68, 68, 0.2)'
                    }} 
                  />
                )}
                {user?.is_candidate && (
                  <Chip 
                    label="Candidate" 
                    size="small" 
                    sx={{ 
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(225, 29, 72, 0.15) 100%)', 
                      color: '#FFE4E6', 
                      border: '1px solid rgba(239, 68, 68, 0.6)', 
                      fontWeight: 700,
                      boxShadow: '0 0 8px rgba(239, 68, 68, 0.2)'
                    }} 
                  />
                )}
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                {user?.email} • ProctorBuddy AI-Powered Assessment & Proctoring Portal
              </Typography>
            </Box>
          </Box>

          <Box display="flex" gap={1.5} flexWrap="wrap">
            {user?.is_examiner && (
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => navigate('/exams/create')}
                sx={{ 
                  background: 'linear-gradient(135deg, #FDA4AF 0%, #F43F5E 35%, #E11D48 70%, #BE123C 100%)', 
                  color: '#FFFFFF', 
                  fontWeight: 800,
                  borderRadius: 1,
                  px: 2.8,
                  py: 1,
                  boxShadow: '0 4px 15px rgba(225, 29, 72, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
                  border: '1px solid #FDA4AF',
                  '&:hover': { 
                    background: 'linear-gradient(135deg, #FECDD3 0%, #FB7185 35%, #F43F5E 70%, #E11D48 100%)',
                    boxShadow: '0 6px 20px rgba(225, 29, 72, 0.65)'
                  }
                }}
              >
                New Exam
              </Button>
            )}
            {user?.is_candidate && (
              <Button 
                variant="outlined" 
                startIcon={<HistoryEduIcon />}
                onClick={() => navigate('/my-tests')}
                sx={{ 
                  borderColor: 'rgba(239, 68, 68, 0.6)', 
                  color: '#FDA4AF', 
                  fontWeight: 700,
                  borderRadius: 1,
                  '&:hover': { borderColor: '#EF4444', bgcolor: 'rgba(239, 68, 68, 0.12)', boxShadow: '0 0 12px rgba(239, 68, 68, 0.25)' }
                }}
              >
                My Test History
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Examiner Quick Hub Section */}
      {user?.is_examiner && (
        <Box mb={5}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
            <Box>
              <Typography variant="h5" fontWeight="800" color="#0F172A">
                Examiner Control Hub
              </Typography>
              <Typography variant="body2" color="#64748B">
                Manage your assessments, question banks, candidates, disputes, and grading.
              </Typography>
            </Box>
            <Button 
              variant="outlined" 
              endIcon={<ArrowForwardIcon />} 
              onClick={() => navigate('/exams')}
              sx={{ borderRadius: 1, fontWeight: 700 }}
            >
              All Exams
            </Button>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <Card 
                elevation={0}
                sx={{ 
                  p: 3, 
                  borderRadius: 1, 
                  border: '1px solid #E2E8F0',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  '&:hover': { borderColor: '#EF4444', boxShadow: '0 8px 24px rgba(239, 68, 68, 0.15)', transform: 'translateY(-2px)' }
                }}
              >
                <Box>
                  <Box 
                    sx={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 1, 
                      background: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#E11D48', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      mb: 2,
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)'
                    }}
                  >
                    <ExamIcon sx={{ fontSize: 26, color: '#E11D48' }} />
                  </Box>
                  <Typography variant="h6" fontWeight="700" color="#0F172A" gutterBottom>
                    Exam Management Hub
                  </Typography>
                  <Typography variant="body2" color="#64748B" mb={2.5}>
                    View your active, scheduled, and completed assessments. Manage question palettes, candidate rosters, and grading.
                  </Typography>
                </Box>
                <Button 
                  variant="contained" 
                  color="primary"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/exams')}
                  sx={{ borderRadius: 1, fontWeight: 700 }}
                >
                  Manage Exams
                </Button>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card 
                elevation={0}
                sx={{ 
                  p: 3, 
                  borderRadius: 1, 
                  border: '1px solid #E2E8F0',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  '&:hover': { borderColor: '#10B981', boxShadow: '0 8px 20px rgba(0,0,0,0.05)', transform: 'translateY(-2px)' }
                }}
              >
                <Box>
                  <Box 
                    sx={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 1, 
                      bgcolor: '#ECFDF5', 
                      color: '#10B981', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      mb: 2
                    }}
                  >
                    <AddIcon sx={{ fontSize: 26 }} />
                  </Box>
                  <Typography variant="h6" fontWeight="700" color="#0F172A" gutterBottom>
                    Create New Assessment
                  </Typography>
                  <Typography variant="body2" color="#64748B" mb={2.5}>
                    Set up test instructions, time duration, randomized question banks, and invite candidates via CSV or email.
                  </Typography>
                </Box>
                <Button 
                  variant="outlined" 
                  color="success"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/exams/create')}
                  sx={{ borderRadius: 1, fontWeight: 700 }}
                >
                  Launch Creator
                </Button>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card 
                elevation={0}
                sx={{ 
                  p: 3, 
                  borderRadius: 1, 
                  border: '1px solid #E2E8F0',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  '&:hover': { borderColor: '#0EA5E9', boxShadow: '0 8px 20px rgba(0,0,0,0.05)', transform: 'translateY(-2px)' }
                }}
              >
                <Box>
                  <Box 
                    sx={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 1, 
                      bgcolor: '#E0F2FE', 
                      color: '#0284C7', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      mb: 2
                    }}
                  >
                    <SecurityIcon sx={{ fontSize: 26 }} />
                  </Box>
                  <Typography variant="h6" fontWeight="700" color="#0F172A" gutterBottom>
                    AI Proctoring & Logs
                  </Typography>
                  <Typography variant="body2" color="#64748B" mb={2.5}>
                    Continuous video recordings, voice detection, tab switch violations, and periodic webcam audits.
                  </Typography>
                </Box>
                <Button 
                  variant="outlined" 
                  color="info"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/exams')}
                  sx={{ borderRadius: 1, fontWeight: 700 }}
                >
                  Review Submissions
                </Button>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Candidate Section */}
      {user?.is_candidate && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
            <Box>
              <Typography variant="h5" fontWeight="800" color="#0F172A">
                Candidate Assessment Portal
              </Typography>
              <Typography variant="body2" color="#64748B">
                View your pending exam invitations and registered scheduled tests.
              </Typography>
            </Box>
            <Box display="flex" gap={1.5}>
              <Button 
                variant="outlined" 
                startIcon={<DisputeIcon />} 
                onClick={() => navigate('/my-disputes')}
                sx={{ borderRadius: 1, fontWeight: 600 }}
              >
                My Disputes
              </Button>
              <Button 
                variant="contained" 
                startIcon={<HistoryEduIcon />} 
                onClick={() => navigate('/my-tests')}
                sx={{ borderRadius: 1, fontWeight: 700 }}
              >
                My Tests History
              </Button>
            </Box>
          </Box>

          <Grid container spacing={3}>
            {/* Pending Invitations Column */}
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 3, 
                  borderRadius: 1, 
                  border: '1px solid #E2E8F0',
                  height: '100%',
                  bgcolor: '#FFFFFF'
                }}
              >
                <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
                  <Box 
                    sx={{ 
                      width: 36, 
                      height: 36, 
                      borderRadius: 1, 
                      bgcolor: '#FFFBEB', 
                      color: '#F59E0B', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}
                  >
                    <PendingIcon sx={{ fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" fontWeight="700" color="#0F172A">
                    Pending Invitations ({availableExams.length})
                  </Typography>
                </Box>

                {loading ? (
                  <Box display="flex" justifyContent="center" py={4}><CircularProgress size={28} /></Box>
                ) : availableExams.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 5 }}>
                    <Typography variant="body2" color="#94A3B8">
                      No pending invitations at this time.
                    </Typography>
                  </Box>
                ) : (
                  <Box display="flex" flexDirection="column" gap={2}>
                    {availableExams.map(exam => (
                      <Card 
                        key={exam.id} 
                        variant="outlined" 
                        sx={{ 
                          p: 2, 
                          borderRadius: 1, 
                          borderColor: '#E2E8F0',
                          '&:hover': { borderColor: '#0F172A', bgcolor: '#F8FAFC' }
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                          <Typography variant="subtitle1" fontWeight="700" color="#0F172A">
                            {exam.title}
                          </Typography>
                          <Chip label="Pending Registration" size="small" color="warning" sx={{ fontWeight: 700 }} />
                        </Box>
                        <Box display="flex" alignItems="center" gap={2} mb={2} color="#64748B">
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <EventIcon sx={{ fontSize: 16 }} />
                            <Typography variant="caption">
                              {new Date(exam.start_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <TimerIcon sx={{ fontSize: 16 }} />
                            <Typography variant="caption">{exam.duration_minutes} mins</Typography>
                          </Box>
                        </Box>
                        <Button 
                          variant="contained" 
                          fullWidth 
                          color="primary"
                          onClick={() => navigate(`/exam/register/${exam.id}`)}
                          sx={{ fontWeight: 700, borderRadius: 1 }}
                        >
                          Register for Exam
                        </Button>
                      </Card>
                    ))}
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Registered Exams Column */}
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 3, 
                  borderRadius: 1, 
                  border: '1px solid #E2E8F0',
                  height: '100%',
                  bgcolor: '#FFFFFF'
                }}
              >
                <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
                  <Box 
                    sx={{ 
                      width: 36, 
                      height: 36, 
                      borderRadius: 1, 
                      bgcolor: '#ECFDF5', 
                      color: '#10B981', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}
                  >
                    <RegisteredIcon sx={{ fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" fontWeight="700" color="#0F172A">
                    Registered Scheduled Tests ({registeredExams.filter(e => new Date() <= new Date(e.end_time)).length})
                  </Typography>
                </Box>

                {loading ? (
                  <Box display="flex" justifyContent="center" py={4}><CircularProgress size={28} /></Box>
                ) : registeredExams.filter(e => new Date() <= new Date(e.end_time)).length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 5 }}>
                    <Typography variant="body2" color="#94A3B8">
                      No active scheduled tests right now.
                    </Typography>
                  </Box>
                ) : (
                  <Box display="flex" flexDirection="column" gap={2}>
                    {registeredExams
                      .filter(exam => new Date() <= new Date(exam.end_time))
                      .map(exam => {
                        const now = new Date();
                        const startTime = new Date(exam.start_time);
                        const endTime = new Date(exam.end_time);
                        const isUpcoming = now < startTime;

                        return (
                          <Card 
                            key={exam.id} 
                            variant="outlined" 
                            sx={{ 
                              p: 2, 
                              borderRadius: 1, 
                              borderColor: '#E2E8F0',
                              '&:hover': { borderColor: '#10B981', bgcolor: '#F8FAFC' }
                            }}
                          >
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                              <Typography variant="subtitle1" fontWeight="700" color="#0F172A">
                                {exam.title}
                              </Typography>
                              {isUpcoming ? (
                                <Chip label={`Opens ${startTime.toLocaleDateString([], { month: 'short', day: 'numeric' })}`} size="small" color="info" sx={{ fontWeight: 700 }} />
                              ) : (
                                <Chip label="Live Now" size="small" color="success" sx={{ fontWeight: 700 }} />
                              )}
                            </Box>
                            <Box display="flex" alignItems="center" gap={2} mb={2} color="#64748B">
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <EventIcon sx={{ fontSize: 16 }} />
                                <Typography variant="caption">
                                  {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {endTime.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                              </Box>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <TimerIcon sx={{ fontSize: 16 }} />
                                <Typography variant="caption">{exam.duration_minutes} mins</Typography>
                              </Box>
                            </Box>
                            
                            {isUpcoming ? (
                              <Button variant="outlined" disabled fullWidth sx={{ borderRadius: 1, fontWeight: 600 }}>
                                Upcoming (Opens at {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                              </Button>
                            ) : (
                              <Button 
                                variant="contained" 
                                fullWidth 
                                color="success"
                                startIcon={<PlayArrowIcon />}
                                onClick={() => navigate(`/exam/take/${exam.id}`)}
                                sx={{ 
                                  fontWeight: 700, 
                                  borderRadius: 1,
                                  bgcolor: '#10B981',
                                  '&:hover': { bgcolor: '#059669' }
                                }}
                              >
                                Start Exam
                              </Button>
                            )}
                          </Card>
                        );
                      })}
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
    </Container>
  );
};

export default Dashboard;
