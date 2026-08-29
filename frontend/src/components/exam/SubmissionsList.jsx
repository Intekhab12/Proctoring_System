import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Button, Chip, CircularProgress, Alert,
  Grid, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import {
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import examService from '../../api/examService';

const SubmissionsList = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Bulk Publish Dialog state
  const [bulkPublishOpen, setBulkPublishOpen] = useState(false);
  const [bulkPublishing, setBulkPublishing] = useState(false);

  const fetchData = async () => {
    try {
      const [subRes, examRes] = await Promise.all([
        examService.getExamSubmissions(id),
        examService.getExam(id)
      ]);
      setSubmissions(subRes.data);
      setExam(examRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleBulkPublish = async () => {
    setBulkPublishing(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await examService.publishAllResults(id);
      setSuccessMsg(res.data.message || 'Results published to all candidates successfully!');
      setBulkPublishOpen(false);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to publish all results.');
    } finally {
      setBulkPublishing(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 6, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2, color: 'textSecondary' }}>Loading candidate submissions...</Typography>
      </Container>
    );
  }

  const evaluatedCount = submissions.filter(s => s.status === 'evaluated').length;
  const submittedCount = submissions.filter(s => s.status === 'submitted').length;
  const totalSubmissions = submissions.length;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="800" color="#1E293B">
            Submissions & Grading
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {exam?.title || 'Exam Submissions'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button 
            variant="outlined" 
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/exams/${id}`)}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Back to Exam Hub
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<SendIcon />}
            onClick={() => setBulkPublishOpen(true)}
            disabled={totalSubmissions === 0}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700, bgcolor: '#0F172A', '&:hover': { bgcolor: '#020617' } }}
          >
            Publish
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{successMsg}</Alert>}

      {/* Summary Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, bgcolor: '#F8FAFC' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F1F5F9', color: '#0F172A' }}>
                <PeopleIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="caption" fontWeight="600" color="textSecondary">TOTAL SUBMISSIONS</Typography>
                <Typography variant="h5" fontWeight="800" color="#1E293B">{totalSubmissions}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, bgcolor: '#F8FAFC' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#ECFDF5', color: '#10B981' }}>
                <CheckCircleIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="caption" fontWeight="600" color="textSecondary">PUBLISHED / EVALUATED</Typography>
                <Typography variant="h5" fontWeight="800" color="#10B981">{evaluatedCount}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, bgcolor: '#F8FAFC' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#FFFBEB', color: '#D97706' }}>
                <HourglassIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="caption" fontWeight="600" color="textSecondary">PENDING EVALUATION / DRAFTS</Typography>
                <Typography variant="h5" fontWeight="800" color="#D97706">{submittedCount}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Submissions Table */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Candidate Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Submitted At</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Score</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {submissions.map((sub) => (
              <TableRow key={sub.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="700" color="#1E293B">
                    {sub.candidate.full_name || 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="textSecondary">
                    {sub.candidate.email}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="textSecondary">
                    {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'Not submitted'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={sub.status === 'evaluated' ? 'Published' : sub.status} 
                    color={sub.status === 'evaluated' ? 'success' : sub.status === 'submitted' ? 'warning' : 'default'} 
                    size="small" 
                    sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="700" color={sub.status === 'evaluated' ? "primary.main" : "textSecondary"}>
                    {sub.total_score !== null && sub.total_score !== undefined ? sub.total_score : '-'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Button 
                    variant={sub.status === 'evaluated' ? "outlined" : "contained"} 
                    color="primary"
                    size="small" 
                    onClick={() => navigate(`/submissions/${sub.id}`)}
                    disabled={sub.status === 'registered' || sub.status === 'started'}
                    sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 600 }}
                  >
                    {sub.status === 'evaluated' ? 'Edit Marks / View' : 'Grade Submission'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {submissions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography color="textSecondary">No submissions found for this exam.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Bulk Publish Confirmation Dialog */}
      <Dialog 
        open={bulkPublishOpen} 
        onClose={() => !bulkPublishing && setBulkPublishOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#1E293B' }}>
          Publish Results to Candidates
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#475569', mb: 2 }}>
            You are about to publish results for <strong>{submissions.length} candidate(s)</strong> for exam <em>"{exam?.title}"</em>.
          </DialogContentText>
          <DialogContentText sx={{ color: '#475569', fontSize: '0.9rem' }}>
            • All evaluated submissions will be finalized.<br />
            • Email notifications and in-app alerts will be dispatched simultaneously.<br />
            • Candidates will immediately be able to view their final scores and remarks in their portal.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 3 }}>
          <Button 
            onClick={() => setBulkPublishOpen(false)} 
            disabled={bulkPublishing}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleBulkPublish}
            disabled={bulkPublishing}
            startIcon={bulkPublishing ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700, bgcolor: '#0F172A', '&:hover': { bgcolor: '#020617' } }}
          >
            {bulkPublishing ? 'Publishing...' : 'Publish to All Candidates'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SubmissionsList;
