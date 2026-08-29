import React, { useEffect, useState, useMemo } from 'react';
import { 
  Container, Typography, Box, Button, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Chip, Dialog, 
  DialogTitle, DialogContent, DialogContentText, DialogActions, Alert, 
  CircularProgress, Grid, Card, TextField, InputAdornment,
  IconButton, Tooltip
} from '@mui/material';
import { 
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Assignment as ExamIcon,
  CheckCircle as PublishedIcon,
  EditNote as DraftIcon,
  ArrowForward as ArrowForwardIcon,
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import examService from '../../api/examService';

const ExamDashboard = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'published' | 'draft'

  const navigate = useNavigate();

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await examService.getAllExams();
      setExams(res.data);
    } catch (err) {
      console.error('Failed to fetch exams:', err);
      setError('Failed to load exams.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDelete = (exam) => {
    setExamToDelete(exam);
    setDeleteDialogOpen(true);
  };

  const handleCloseDelete = () => {
    setExamToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!examToDelete) return;
    try {
      setDeleting(true);
      await examService.deleteExam(examToDelete.id);
      setExams(prev => prev.filter(e => e.id !== examToDelete.id));
      handleCloseDelete();
    } catch (err) {
      console.error('Failed to delete exam:', err);
      alert(err.response?.data?.detail || err.response?.data?.error || 'Failed to delete exam.');
    } finally {
      setDeleting(false);
    }
  };

  // Stats calculation
  const totalCount = exams.length;
  const publishedCount = useMemo(() => exams.filter(e => e.is_published).length, [exams]);
  const draftCount = useMemo(() => exams.filter(e => !e.is_published).length, [exams]);

  // Filtered exams
  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exam.description && exam.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (!matchesSearch) return false;
      if (filterStatus === 'published') return exam.is_published;
      if (filterStatus === 'draft') return !exam.is_published;
      return true;
    });
  }, [exams, searchQuery, filterStatus]);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      {/* Hero Header */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' }, 
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          mb: 4
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight="800" color="#0F172A" gutterBottom>
            Exam Management
          </Typography>
          <Typography variant="body1" color="#64748B">
            Create, schedule, configure candidates, and monitor live proctored tests.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          size="large"
          startIcon={<AddIcon />} 
          onClick={() => navigate('/exams/create')}
          sx={{ 
            bgcolor: '#0F172A',
            '&:hover': { bgcolor: '#020617' },
            borderRadius: 2.5,
            px: 3,
            py: 1.2,
            fontWeight: 700,
            fontSize: '0.95rem',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.35)',
            whiteSpace: 'nowrap'
          }}
        >
          Create New Exam
        </Button>
      </Box>

      {/* Metric Stat Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={4}>
          <Card 
            elevation={0}
            sx={{ 
              p: 2.5, 
              borderRadius: 3, 
              border: '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: 2.5
            }}
          >
            <Box 
              sx={{ 
                width: 52, 
                height: 52, 
                borderRadius: 2.5, 
                bgcolor: '#F1F5F9', 
                color: '#0F172A',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center'
              }}
            >
              <ExamIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="body2" color="#64748B" fontWeight="600">Total Exams</Typography>
              <Typography variant="h4" fontWeight="800" color="#0F172A">{totalCount}</Typography>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card 
            elevation={0}
            sx={{ 
              p: 2.5, 
              borderRadius: 3, 
              border: '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: 2.5
            }}
          >
            <Box 
              sx={{ 
                width: 52, 
                height: 52, 
                borderRadius: 2.5, 
                bgcolor: '#ECFDF5', 
                color: '#10B981',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center'
              }}
            >
              <PublishedIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="body2" color="#64748B" fontWeight="600">Published Active</Typography>
              <Typography variant="h4" fontWeight="800" color="#0F172A">{publishedCount}</Typography>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card 
            elevation={0}
            sx={{ 
              p: 2.5, 
              borderRadius: 3, 
              border: '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: 2.5
            }}
          >
            <Box 
              sx={{ 
                width: 52, 
                height: 52, 
                borderRadius: 2.5, 
                bgcolor: '#FFFBEB', 
                color: '#F59E0B',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center'
              }}
            >
              <DraftIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="body2" color="#64748B" fontWeight="600">Drafts</Typography>
              <Typography variant="h4" fontWeight="800" color="#0F172A">{draftCount}</Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      {/* Filter and Search Bar */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          mb: 3, 
          borderRadius: 3, 
          border: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <TextField 
          size="small"
          placeholder="Search exams by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: { xs: '100%', sm: 320 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#94A3B8', fontSize: 20 }} />
              </InputAdornment>
            ),
            sx: { borderRadius: 2, bgcolor: '#F8FAFC' }
          }}
        />

        <Box display="flex" gap={1}>
          <Chip 
            label={`All (${totalCount})`}
            onClick={() => setFilterStatus('all')}
            color={filterStatus === 'all' ? 'primary' : 'default'}
            variant={filterStatus === 'all' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600, cursor: 'pointer' }}
          />
          <Chip 
            label={`Published (${publishedCount})`}
            onClick={() => setFilterStatus('published')}
            color={filterStatus === 'published' ? 'success' : 'default'}
            variant={filterStatus === 'published' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600, cursor: 'pointer' }}
          />
          <Chip 
            label={`Drafts (${draftCount})`}
            onClick={() => setFilterStatus('draft')}
            color={filterStatus === 'draft' ? 'warning' : 'default'}
            variant={filterStatus === 'draft' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600, cursor: 'pointer' }}
          />
        </Box>
      </Paper>

      {/* Main Table Container */}
      <TableContainer 
        component={Paper} 
        elevation={0}
        sx={{ 
          borderRadius: 3, 
          border: '1px solid #E2E8F0', 
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
        }}
      >
        <Table sx={{ minWidth: 700 }}>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 2 }}>Exam Details</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 2 }}>Duration</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 2 }}>Schedule Window</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 2 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 2 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1.5 }}>
                    Loading exams...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredExams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                  <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                    <ExamIcon sx={{ fontSize: 44, color: '#CBD5E1' }} />
                    <Typography variant="h6" fontWeight="600" color="#64748B">
                      {searchQuery ? 'No exams match your search criteria' : 'No exams created yet'}
                    </Typography>
                    <Typography variant="body2" color="#94A3B8" mb={1.5}>
                      Get started by creating your first scheduled assessment.
                    </Typography>
                    <Button 
                      variant="contained" 
                      size="small" 
                      startIcon={<AddIcon />} 
                      onClick={() => navigate('/exams/create')}
                      sx={{ borderRadius: 2 }}
                    >
                      Create Exam
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filteredExams.map((exam) => (
                <TableRow 
                  key={exam.id} 
                  hover
                  sx={{ 
                    '&:hover': { bgcolor: '#F8FAFC' },
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  <TableCell sx={{ py: 2 }}>
                    <Typography variant="subtitle1" fontWeight="700" color="#0F172A">
                      {exam.title}
                    </Typography>
                    {exam.description && (
                      <Typography variant="body2" color="#64748B" noWrap sx={{ maxWidth: 360 }}>
                        {exam.description}
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell sx={{ py: 2 }}>
                    <Box display="flex" alignItems="center" gap={0.8}>
                      <TimeIcon sx={{ fontSize: 16, color: '#64748B' }} />
                      <Typography variant="body2" fontWeight="600" color="#334155">
                        {exam.duration_minutes} mins
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell sx={{ py: 2 }}>
                    <Box display="flex" alignItems="center" gap={0.8}>
                      <CalendarIcon sx={{ fontSize: 16, color: '#64748B' }} />
                      <Typography variant="body2" color="#334155">
                        {new Date(exam.start_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} – {new Date(exam.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell sx={{ py: 2 }}>
                    {exam.is_published ? (
                      <Chip 
                        icon={<PublishedIcon sx={{ fontSize: '15px !important' }} />} 
                        label="Published" 
                        color="success" 
                        size="small" 
                        sx={{ fontWeight: 700 }} 
                      />
                    ) : (
                      <Chip 
                        icon={<DraftIcon sx={{ fontSize: '15px !important' }} />} 
                        label="Draft" 
                        color="warning" 
                        size="small" 
                        sx={{ fontWeight: 700 }} 
                      />
                    )}
                  </TableCell>

                  <TableCell sx={{ py: 2 }} align="right">
                    <Box display="flex" justifyContent="flex-end" alignItems="center" gap={1.2}>
                      <Button 
                        size="small" 
                        variant="contained" 
                        color="primary"
                        endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                        onClick={() => navigate(`/exams/${exam.id}`)}
                        sx={{ 
                          fontWeight: 700, 
                          borderRadius: 2,
                          px: 2,
                          py: 0.6,
                          fontSize: '0.82rem'
                        }}
                      >
                        Manage
                      </Button>
                      <Tooltip title="Delete Exam">
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleOpenDelete(exam)}
                          sx={{ 
                            border: '1px solid #FEE2E2', 
                            bgcolor: '#FEF2F2',
                            borderRadius: 2,
                            p: 0.8,
                            '&:hover': { bgcolor: '#FEE2E2' }
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={handleCloseDelete}
        PaperProps={{ sx: { borderRadius: 3, p: 1, maxWidth: 460 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main', pb: 1 }}>
          Delete Assessment
        </DialogTitle>
        <DialogContent>
          <DialogContentText color="#0F172A" fontWeight="600" mb={1}>
            Are you sure you want to permanently delete "{examToDelete?.title}"?
          </DialogContentText>
          <DialogContentText sx={{ fontSize: '0.88rem', color: '#64748B' }}>
            This action cannot be undone. All questions, invited candidates, submitted answers, grades, and proctoring video recordings associated with this exam will be permanently removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
          <Button onClick={handleCloseDelete} disabled={deleting} variant="outlined" sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained" 
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            {deleting ? 'Deleting...' : 'Delete Assessment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ExamDashboard;
