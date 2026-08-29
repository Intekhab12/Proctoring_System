import React, { useEffect, useState, useContext, useCallback } from 'react';
import { 
  Container, Typography, Box, Paper, Button, CircularProgress, 
  Alert, Chip, Divider, Card, CardContent 
} from '@mui/material';
import { 
  CheckCircle as CheckCircleIcon,
  Event as EventIcon,
  Timer as TimerIcon,
  PlayArrow as PlayArrowIcon,
  Dashboard as DashboardIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import examService from '../../api/examService';
import { AuthContext } from '../../context/AuthContext';

const RegisterExam = () => {
  const { examId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useContext(AuthContext);
  
  const [exam, setExam] = useState(null);
  const [candidateStatus, setCandidateStatus] = useState(null); // 'pending' | 'registered' | 'started' | 'submitted' | 'evaluated'
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [justRegistered, setJustRegistered] = useState(false);

  const fetchCandidateStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await examService.getCandidateExamStatus(examId);
      const data = res.data;
      
      if (!data.is_eligible) {
        setError("You do not have an invitation for this exam.");
      } else if (!data.exam.is_published) {
        setError("This exam is not published yet.");
      } else if (data.status === 'submitted' || data.status === 'evaluated') {
        setError("You have already submitted this exam.");
        setCandidateStatus(data.status);
        setExam(data.exam);
      } else if (new Date(data.exam.end_time) < new Date()) {
        setError("The exam window for this test has ended.");
        setExam(data.exam);
        setCandidateStatus(data.status);
      } else {
        setExam(data.exam);
        setCandidateStatus(data.status); // 'pending' or 'registered' or 'started'
      }
    } catch (err) {
      console.error("Error checking exam eligibility:", err);
      setError(err.response?.data?.error || "Failed to verify exam invitation.");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    if (authLoading) return;
    
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

    fetchCandidateStatus();
  }, [user, authLoading, examId, searchParams, navigate, fetchCandidateStatus]);

  const handleRegister = async () => {
    try {
      setSubmitting(true);
      setError('');
      await examService.registerForExam(examId);
      setCandidateStatus('registered');
      setJustRegistered(true);
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
      
      if (errMsg.toLowerCase().includes('already registered')) {
        setCandidateStatus('registered');
        setJustRegistered(true);
      } else {
        setError(errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <CircularProgress size={40} />
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          Checking exam details...
        </Typography>
      </Box>
    );
  }

  const isRegistered = candidateStatus === 'registered' || candidateStatus === 'started' || justRegistered;
  const now = new Date();
  const startTime = exam ? new Date(exam.start_time) : null;
  const endTime = exam ? new Date(exam.end_time) : null;
  const isWindowOpen = startTime && endTime && now >= startTime && now <= endTime;
  const isUpcoming = startTime && now < startTime;
  const isExpired = endTime && now > endTime;

  return (
    <Container maxWidth="sm" sx={{ mt: 6, mb: 8 }}>
      <Paper 
        elevation={0} 
        sx={{ 
          p: { xs: 3, sm: 4 }, 
          borderRadius: 4, 
          border: '1px solid #E2E8F0',
          boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}
      >
        {/* Top Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight="800" color="#1E293B" gutterBottom>
            {isRegistered ? "Exam Registration Confirmed" : "Exam Registration"}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {isRegistered 
              ? "Your seat is registered. Review the schedule below and start when ready." 
              : "Please register to secure your seat for this scheduled test."}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {exam && (
          <Box>
            {/* Exam Summary Card */}
            <Card variant="outlined" sx={{ borderRadius: 3, mb: 3, borderColor: '#CBD5E1', bgcolor: '#F8FAFC' }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5} gap={1} flexWrap="wrap">
                  <Typography variant="h6" fontWeight="700" color="#0F172A">
                    {exam.title}
                  </Typography>
                  {isRegistered ? (
                    <Chip 
                      icon={<CheckCircleIcon sx={{ fontSize: '16px !important' }} />} 
                      label="Registered" 
                      color="success" 
                      size="small" 
                      sx={{ fontWeight: 700 }} 
                    />
                  ) : (
                    <Chip 
                      label="Invited (Pending)" 
                      color="warning" 
                      size="small" 
                      sx={{ fontWeight: 700 }} 
                    />
                  )}
                </Box>

                {exam.description && (
                  <Typography variant="body2" color="#475569" mb={2.5}>
                    {exam.description}
                  </Typography>
                )}

                <Divider sx={{ my: 2 }} />

                <Box display="flex" flexDirection="column" gap={1.2}>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <EventIcon sx={{ color: '#0F172A', fontSize: 20 }} />
                    <Typography variant="body2" color="#334155">
                      <strong>Window:</strong> {new Date(exam.start_time).toLocaleString()} – {new Date(exam.end_time).toLocaleString()}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" gap={1.5}>
                    <TimerIcon sx={{ color: '#0F172A', fontSize: 20 }} />
                    <Typography variant="body2" color="#334155">
                      <strong>Duration:</strong> {exam.duration_minutes} minutes
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" gap={1.5}>
                    <InfoIcon sx={{ color: '#64748B', fontSize: 20 }} />
                    <Typography variant="body2" color="#64748B">
                      <strong>Candidate Email:</strong> {user?.email}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Registration State Actions */}
            {!isRegistered ? (
              <Box>
                <Button 
                  variant="contained" 
                  size="large" 
                  fullWidth 
                  onClick={handleRegister}
                  disabled={submitting || isExpired}
                  sx={{ 
                    py: 1.5, 
                    fontWeight: 700, 
                    borderRadius: 2.5,
                    bgcolor: '#0F172A',
                    '&:hover': { bgcolor: '#020617' },
                    textTransform: 'none',
                    fontSize: '1rem',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.3)'
                  }}
                >
                  {submitting ? <CircularProgress size={24} color="inherit" /> : 'Register for Exam'}
                </Button>
                
                <Button 
                  variant="text" 
                  fullWidth 
                  onClick={() => navigate('/dashboard')}
                  sx={{ mt: 1.5, textTransform: 'none', color: '#64748B' }}
                >
                  Return to Dashboard
                </Button>
              </Box>
            ) : (
              /* Already Registered -> Two Step Action Options */
              <Box>
                <Alert 
                  severity="success" 
                  icon={<CheckCircleIcon fontSize="inherit" />}
                  sx={{ mb: 3, borderRadius: 2.5 }}
                >
                  {justRegistered ? (
                    <span><strong>Registration Successful!</strong> You are confirmed for this test.</span>
                  ) : (
                    <span><strong>You are registered for this exam.</strong></span>
                  )}
                </Alert>

                {isWindowOpen ? (
                  <Box display="flex" flexDirection="column" gap={1.5}>
                    <Typography variant="body2" color="#475569" textAlign="center" mb={0.5}>
                      The exam window is currently <strong>active and open</strong>. You may proceed to start your test.
                    </Typography>

                    <Button 
                      variant="contained" 
                      color="success"
                      size="large" 
                      fullWidth 
                      startIcon={<PlayArrowIcon />}
                      onClick={() => navigate(`/exam/take/${examId}`)}
                      sx={{ 
                        py: 1.5, 
                        fontWeight: 700, 
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontSize: '1.05rem',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      Start Test Now
                    </Button>

                    <Button 
                      variant="outlined" 
                      size="medium"
                      fullWidth 
                      startIcon={<DashboardIcon />}
                      onClick={() => navigate('/dashboard')}
                      sx={{ py: 1.2, textTransform: 'none', borderRadius: 2.5 }}
                    >
                      Back to Dashboard
                    </Button>
                  </Box>
                ) : isUpcoming ? (
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="#64748B" mb={2.5}>
                      This test is scheduled to open on <strong>{new Date(exam.start_time).toLocaleString()}</strong>. Please return during that time window to take the test.
                    </Typography>

                    <Button 
                      variant="contained" 
                      size="large" 
                      fullWidth 
                      startIcon={<DashboardIcon />}
                      onClick={() => navigate('/dashboard')}
                      sx={{ 
                        py: 1.5, 
                        textTransform: 'none', 
                        borderRadius: 2.5,
                        bgcolor: '#0F172A',
                        '&:hover': { bgcolor: '#020617' }
                      }}
                    >
                      Back to Dashboard
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="error.main" mb={2}>
                      This exam's testing window has closed.
                    </Typography>
                    <Button 
                      variant="outlined" 
                      fullWidth 
                      onClick={() => navigate('/dashboard')}
                      sx={{ py: 1.2, textTransform: 'none', borderRadius: 2.5 }}
                    >
                      Back to Dashboard
                    </Button>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}

        {error && !exam && (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button 
              variant="outlined" 
              onClick={() => navigate('/dashboard')}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Back to Dashboard
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default RegisterExam;
