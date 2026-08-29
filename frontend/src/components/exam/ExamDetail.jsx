import React, { useEffect, useState } from 'react';
import { 
  Container, Typography, Box, Paper, CircularProgress, Alert, Divider, 
  IconButton, Button, Dialog, DialogTitle, DialogContent, DialogContentText, 
  DialogActions, TextField, Tabs, Tab, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, InputAdornment, Grid, Card, CardContent, Avatar
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Edit as EditIcon, 
  Add as AddIcon, 
  CloudUpload as CloudUploadIcon,
  People as PeopleIcon,
  Quiz as QuizIcon,
  Gavel as GavelIcon,
  Assessment as AssessmentIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  Image as ImageIcon,
  Save as SaveIcon,
  Email as EmailIcon,
  Chat as ChatIcon,
  Send as SendIcon,
  EditCalendar as EditCalendarIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import examService from '../../api/examService';
import DisputeChatModal from '../common/DisputeChatModal';

const toLocalISOString = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  const pad = (n) => (n < 10 ? '0' + n : n);
  return d.getFullYear() +
    '-' + pad(d.getMonth() + 1) +
    '-' + pad(d.getDate()) +
    'T' + pad(d.getHours()) +
    ':' + pad(d.getMinutes());
};

const ExamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Core Data States
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [eligibility, setEligibility] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active Tab: 0 = Candidates, 1 = Questions, 2 = Disputes, 3 = Submissions
  const [activeTab, setActiveTab] = useState(0);

  // Time Dialog
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');

  // Delete Exam Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Candidates Tab States
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateDialogOpen, setCandidateDialogOpen] = useState(false);
  const [newCandidateEmail, setNewCandidateEmail] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [addingCandidate, setAddingCandidate] = useState(false);

  // Questions Tab States (Single Question Palette Navigator & Editor)
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [qText, setQText] = useState('');
  const [qImageFile, setQImageFile] = useState(null);
  const [qImagePreview, setQImagePreview] = useState(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [addQuestionDialogOpen, setAddQuestionDialogOpen] = useState(false);
  const [newQText, setNewQText] = useState('');
  const [newQImage, setNewQImage] = useState(null);

  // Disputes Tab States
  const [disputeFilterQ, setDisputeFilterQ] = useState('ALL'); // 'ALL' | 'OVERALL' | question_id
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);

  // Submissions Tab Bulk Publish States
  const [bulkPublishOpen, setBulkPublishOpen] = useState(false);
  const [bulkPublishing, setBulkPublishing] = useState(false);

  const handleBulkPublish = async () => {
    setBulkPublishing(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await examService.publishAllResults(id);
      setSuccessMsg(res.data.message || 'Results published to all candidates successfully!');
      setBulkPublishOpen(false);
      await fetchAllData();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to publish all results.');
    } finally {
      setBulkPublishing(false);
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [examRes, qRes, eligRes, dispRes, subRes] = await Promise.all([
        examService.getExam(id),
        examService.getQuestions(id),
        examService.getEligibilities(id),
        examService.getExamDisputes(id),
        examService.getExamSubmissions(id)
      ]);
      setExam(examRes.data);
      setQuestions(qRes.data || []);
      setEligibility(eligRes.data || []);
      setDisputes(dispRes.data.results || dispRes.data || []);
      setSubmissions(subRes.data || []);
    } catch (err) {
      console.error('Failed to load exam hub data:', err);
      setError(err.response?.data?.error || 'Failed to load exam details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [id]);

  // Sync Question Editor form with active question index
  useEffect(() => {
    if (questions.length > 0 && questions[currentQIndex]) {
      const activeQ = questions[currentQIndex];
      setQText(activeQ.text || '');
      setQImageFile(null);
      setQImagePreview(activeQ.image || null);
      setRemoveExistingImage(false);
    } else {
      setQText('');
      setQImageFile(null);
      setQImagePreview(null);
      setRemoveExistingImage(false);
    }
  }, [currentQIndex, questions]);

  // -------------------------------------------------------------
  // Exam Actions
  // -------------------------------------------------------------
  const handleSaveTime = async () => {
    try {
      const startIso = new Date(newStartTime).toISOString();
      const endIso = new Date(newEndTime).toISOString();
      await examService.patchExam(id, { start_time: startIso, end_time: endIso });
      setExam(prev => ({ ...prev, start_time: startIso, end_time: endIso }));
      setTimeDialogOpen(false);
      setSuccessMsg('Exam time window updated successfully.');
    } catch (_err) {
      alert("Failed to update exam time window.");
    }
  };

  const handleDeleteExam = async () => {
    try {
      setDeleting(true);
      await examService.deleteExam(id);
      navigate('/exams');
    } catch (_err) {
      alert("Failed to delete exam.");
      setDeleting(false);
    }
  };

  // -------------------------------------------------------------
  // Candidates Actions
  // -------------------------------------------------------------
  const handleAddCandidate = async () => {
    if (!newCandidateEmail && !csvFile) return;
    try {
      setAddingCandidate(true);
      if (newCandidateEmail) {
        const res = await examService.addEligibility(id, { email: newCandidateEmail.trim() });
        setEligibility(prev => [...prev, res.data]);
      }
      if (csvFile) {
        await examService.uploadEligibilityCSV(id, csvFile);
        const eligRes = await examService.getEligibilities(id);
        setEligibility(eligRes.data || []);
      }
      setCandidateDialogOpen(false);
      setNewCandidateEmail('');
      setCsvFile(null);
      setSuccessMsg('Candidate(s) added successfully.');
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add candidate(s)");
    } finally {
      setAddingCandidate(false);
    }
  };

  const handleRemoveCandidate = async (eligId) => {
    if (!window.confirm("Are you sure you want to remove this candidate from the exam?")) return;
    try {
      await examService.deleteEligibility(id, eligId);
      setEligibility(prev => prev.filter(c => c.id !== eligId));
      setSuccessMsg('Candidate removed from exam.');
    } catch (_err) {
      alert("Failed to remove candidate.");
    }
  };

  const filteredCandidates = eligibility.filter(c => {
    const email = (c.email || c.candidate_email || '').toLowerCase();
    return email.includes(candidateSearch.toLowerCase().trim());
  });

  // -------------------------------------------------------------
  // Questions Actions
  // -------------------------------------------------------------
  const handleImageFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setQImageFile(file);
      setQImagePreview(URL.createObjectURL(file));
      setRemoveExistingImage(false);
    }
  };

  const handleRemoveImagePreview = () => {
    setQImageFile(null);
    setQImagePreview(null);
    setRemoveExistingImage(true);
  };

  const handleSaveQuestionChanges = async () => {
    if (!questions[currentQIndex]) return;
    const activeQ = questions[currentQIndex];
    if (!qText.trim()) {
      alert('Question text cannot be empty.');
      return;
    }

    try {
      setSavingQuestion(true);
      const formData = new FormData();
      formData.append('text', qText.trim());
      formData.append('order', activeQ.order !== undefined ? activeQ.order : currentQIndex);

      if (qImageFile) {
        formData.append('image', qImageFile);
      } else if (removeExistingImage) {
        formData.append('image', '');
      }

      const res = await examService.updateQuestion(id, activeQ.id, formData);
      const updatedList = [...questions];
      updatedList[currentQIndex] = res.data;
      setQuestions(updatedList);
      setSuccessMsg(`Question ${currentQIndex + 1} updated successfully!`);
    } catch (_err) {
      alert('Failed to update question.');
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteCurrentQuestion = async () => {
    if (!questions[currentQIndex]) return;
    const activeQ = questions[currentQIndex];
    if (!window.confirm(`Are you sure you want to delete Question ${currentQIndex + 1}?`)) return;

    try {
      await examService.deleteQuestion(id, activeQ.id);
      const updatedList = questions.filter((_, idx) => idx !== currentQIndex);
      setQuestions(updatedList);
      if (currentQIndex >= updatedList.length) {
        setCurrentQIndex(Math.max(0, updatedList.length - 1));
      }
      setSuccessMsg(`Question ${currentQIndex + 1} deleted.`);
    } catch (_err) {
      alert('Failed to delete question.');
    }
  };

  const handleAddNewQuestion = async () => {
    if (!newQText.trim()) {
      alert('Please provide question text.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('text', newQText.trim());
      formData.append('order', questions.length);
      if (newQImage) {
        formData.append('image', newQImage);
      }

      const res = await examService.addQuestion(id, formData);
      const updatedList = [...questions, res.data];
      setQuestions(updatedList);
      setCurrentQIndex(updatedList.length - 1);
      setAddQuestionDialogOpen(false);
      setNewQText('');
      setNewQImage(null);
      setSuccessMsg(`New Question ${updatedList.length} added successfully!`);
    } catch (_err) {
      alert('Failed to add new question.');
    }
  };

  // -------------------------------------------------------------
  // Disputes Actions
  // -------------------------------------------------------------
  const handleOpenReply = (dispute) => {
    setSelectedDispute(dispute);
    setReplyModalOpen(true);
  };

  const handleResolveDispute = async (disputeId) => {
    if (!window.confirm("Are you sure you want to mark this dispute as resolved?")) return;
    try {
      await examService.resolveDispute(disputeId);
      const dispRes = await examService.getExamDisputes(id);
      setDisputes(dispRes.data.results || dispRes.data || []);
      setSuccessMsg('Dispute marked as resolved.');
    } catch (_err) {
      alert("Failed to resolve dispute.");
    }
  };

  const getDisputeStatusChip = (status) => {
    switch (status) {
      case 'open':
        return <Chip label="Open" color="warning" size="small" sx={{ fontWeight: 600 }} />;
      case 'in_progress':
        return <Chip label="In Progress" color="info" size="small" sx={{ fontWeight: 600 }} />;
      case 'resolved':
        return <Chip label="Resolved" color="success" size="small" sx={{ fontWeight: 600 }} />;
      case 'closed':
        return <Chip label="Closed" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const filteredDisputes = disputes.filter(d => {
    if (disputeFilterQ === 'ALL') return true;
    if (disputeFilterQ === 'OVERALL') return !d.question;
    return d.question === disputeFilterQ;
  });

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="50vh">
        <CircularProgress size={48} />
        <Typography variant="body1" sx={{ mt: 2 }} color="textSecondary">Loading Exam Management Hub...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!exam) return null;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      {/* Header Banner */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3.5, 
          mb: 3, 
          borderRadius: 3, 
          background: 'linear-gradient(135deg, #09090B 0%, #170C0E 50%, #200D11 100%)', 
          border: '1px solid rgba(239, 68, 68, 0.45)',
          color: '#fff',
          boxShadow: '0 8px 30px rgba(0,0,0,0.35), 0 0 20px rgba(239, 68, 68, 0.1)'
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
          <Box maxWidth="70%">
            <Box display="flex" alignItems="center" gap={1.5} mb={1}>
              <Typography variant="h4" fontWeight="800" sx={{ letterSpacing: '-0.5px' }}>
                {exam.title}
              </Typography>
              <Chip 
                label={exam.is_published ? "Published" : "Draft"} 
                color={exam.is_published ? "success" : "warning"} 
                size="small"
                sx={{ fontWeight: 700, borderRadius: 1.5 }}
              />
            </Box>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2 }}>
              {exam.description || 'No description provided.'}
            </Typography>

            <Box display="flex" gap={3} flexWrap="wrap" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>Duration</Typography>
                <Typography variant="body2" fontWeight="600">{exam.duration_minutes} minutes</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>Start Window</Typography>
                <Typography variant="body2" fontWeight="600">
                  {new Date(exam.start_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>End Window</Typography>
                <Typography variant="body2" fontWeight="600">
                  {new Date(exam.end_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>Total Questions</Typography>
                <Typography variant="body2" fontWeight="600">{questions.length} questions</Typography>
              </Box>
            </Box>
          </Box>

          <Box display="flex" gap={1.5} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<EditCalendarIcon />}
              onClick={() => {
                setNewStartTime(exam.start_time ? new Date(exam.start_time).toISOString().slice(0, 16) : '');
                setNewEndTime(exam.end_time ? new Date(exam.end_time).toISOString().slice(0, 16) : '');
                setTimeDialogOpen(true);
              }}
              sx={{ 
                color: '#FDA4AF', 
                borderColor: 'rgba(239, 68, 68, 0.6)', 
                '&:hover': { borderColor: '#EF4444', bgcolor: 'rgba(239, 68, 68, 0.12)', boxShadow: '0 0 12px rgba(239, 68, 68, 0.25)' },
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 700
              }}
            >
              Edit Schedule
            </Button>

            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialogOpen(true)}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Delete Exam
            </Button>
          </Box>
        </Box>
      </Paper>

      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg('')} sx={{ mb: 3, borderRadius: 2 }}>
          {successMsg}
        </Alert>
      )}

      {/* Main Tabs Navigation */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden', mb: 4 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, val) => setActiveTab(val)}
          variant="fullWidth"
          sx={{
            bgcolor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            '& .MuiTab-root': {
              py: 2,
              fontWeight: 600,
              fontSize: '0.95rem',
              textTransform: 'none',
              transition: 'all 0.2s',
              '&.Mui-selected': {
                color: '#0F172A',
                bgcolor: '#fff'
              }
            },
            '& .MuiTabs-indicator': {
              background: 'linear-gradient(90deg, #FDA4AF, #F43F5E, #E11D48)',
              height: 3,
              boxShadow: '0 0 8px rgba(225, 29, 72, 0.8)'
            }
          }}
        >
          <Tab icon={<PeopleIcon />} iconPosition="start" label={`Candidates (${eligibility.length})`} />
          <Tab icon={<QuizIcon />} iconPosition="start" label={`Questions (${questions.length})`} />
          <Tab icon={<GavelIcon />} iconPosition="start" label={`Disputes (${disputes.length})`} />
          <Tab icon={<AssessmentIcon />} iconPosition="start" label={`Submissions (${submissions.length})`} />
        </Tabs>
      </Paper>

      {/* ------------------------------------------------------------- */}
      {/* TAB 0: CANDIDATES MANAGEMENT                                  */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 0 && (
        <Paper elevation={0} sx={{ p: 3.5, borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h6" fontWeight="700" color="#1E293B">
                Candidate Whitelist & Access
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Manage all candidates eligible to take this exam.
              </Typography>
            </Box>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={() => setCandidateDialogOpen(true)}
              sx={{ bgcolor: '#0F172A', '&:hover': { bgcolor: '#020617' }, textTransform: 'none', borderRadius: 2 }}
            >
              Add Candidate(s)
            </Button>
          </Box>

          {/* Real-time Email Search Bar */}
          <Box mb={3}>
            <TextField
              placeholder="Search candidate by email or Gmail..."
              value={candidateSearch}
              onChange={(e) => setCandidateSearch(e.target.value)}
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: candidateSearch && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setCandidateSearch('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
                sx: { borderRadius: 2, bgcolor: '#F8FAFC' }
              }}
            />
          </Box>

          {/* Candidate Roster Table */}
          {filteredCandidates.length === 0 ? (
            <Box textAlign="center" py={6} bgcolor="#F8FAFC" borderRadius={2}>
              <PeopleIcon sx={{ fontSize: 48, color: '#94A3B8', mb: 1 }} />
              <Typography variant="body1" fontWeight="600" color="#64748B">
                {candidateSearch ? `No candidates matching "${candidateSearch}"` : 'No candidates assigned to this exam yet.'}
              </Typography>
              <Typography variant="body2" color="#94A3B8" mt={0.5}>
                Click "Add Candidate(s)" above to invite candidates via email or CSV.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Candidate</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Exam Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Registered At</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCandidates.map((c) => {
                    const email = c.email || c.candidate_email || 'N/A';
                    return (
                      <TableRow key={c.id} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: '#F1F5F9', color: '#0F172A', fontSize: '0.85rem', fontWeight: 700 }}>
                              {email[0]?.toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="600" color="#1E293B">
                                {c.candidate_name || email}
                              </Typography>
                              <Typography variant="caption" color="textSecondary" display="flex" alignItems="center" gap={0.5}>
                                <EmailIcon sx={{ fontSize: 13 }} /> {email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={c.status || 'eligible'} 
                            color={
                              c.status === 'submitted' ? 'success' : 
                              c.status === 'started' ? 'info' : 
                              c.status === 'registered' ? 'primary' : 'default'
                            } 
                            size="small" 
                            sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="textSecondary">
                            {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleRemoveCandidate(c.id)}
                            title="Remove candidate from exam"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: QUESTIONS MANAGEMENT WITH QUESTION PALETTE NAVIGATOR  */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 1 && (
        <Paper elevation={0} sx={{ p: 3.5, borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h6" fontWeight="700" color="#1E293B">
                Questions & Visual Diagrams ({questions.length})
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Navigate questions using the palette on the right, and edit question text or diagram attachments directly.
              </Typography>
            </Box>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={() => setAddQuestionDialogOpen(true)}
              sx={{ bgcolor: '#0F172A', '&:hover': { bgcolor: '#020617' }, textTransform: 'none', borderRadius: 2 }}
            >
              + Add Question
            </Button>
          </Box>

          {questions.length === 0 ? (
            <Box textAlign="center" py={6} bgcolor="#F8FAFC" borderRadius={2}>
              <QuizIcon sx={{ fontSize: 48, color: '#94A3B8', mb: 1 }} />
              <Typography variant="body1" fontWeight="600" color="#64748B">
                No questions added to this exam yet.
              </Typography>
              <Button 
                variant="outlined" 
                startIcon={<AddIcon />} 
                onClick={() => setAddQuestionDialogOpen(true)}
                sx={{ mt: 2, textTransform: 'none' }}
              >
                Add Your First Question
              </Button>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {/* Left Column: Active Question Editor */}
              <Grid item xs={12} md={8}>
                <Card variant="outlined" sx={{ borderRadius: 2.5, borderColor: '#CBD5E1' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="subtitle1" fontWeight="700" color="#1E293B">
                        Editing Question {currentQIndex + 1} of {questions.length}
                      </Typography>
                      <IconButton 
                        color="error" 
                        size="small" 
                        onClick={handleDeleteCurrentQuestion}
                        title="Delete this question"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    <TextField
                      label={`Question ${currentQIndex + 1} Statement`}
                      multiline
                      rows={6}
                      fullWidth
                      value={qText}
                      onChange={(e) => setQText(e.target.value)}
                      placeholder="Type the full question prompt or statement here..."
                      sx={{ mb: 2.5 }}
                    />

                    {/* Diagram / Image Preview & Upload */}
                    <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px dashed #CBD5E1', mb: 3 }}>
                      <Typography variant="subtitle2" fontWeight="600" color="#475569" mb={1}>
                        Diagram / Reference Image
                      </Typography>

                      {qImagePreview ? (
                        <Box display="flex" alignItems="flex-start" gap={2} mb={1.5} flexWrap="wrap">
                          <img 
                            src={qImagePreview} 
                            alt="Question Diagram" 
                            style={{ maxWidth: '280px', maxHeight: '180px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #E2E8F0' }} 
                          />
                          <Box>
                            <Button 
                              variant="outlined" 
                              color="error" 
                              size="small" 
                              onClick={handleRemoveImagePreview}
                              sx={{ textTransform: 'none', mb: 1, display: 'block' }}
                            >
                              Remove Image
                            </Button>
                            <Button 
                              component="label" 
                              variant="outlined" 
                              size="small"
                              sx={{ textTransform: 'none' }}
                            >
                              Replace Image
                              <input type="file" hidden accept="image/*" onChange={handleImageFileChange} />
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <Box display="flex" alignItems="center" gap={2}>
                          <Button 
                            component="label" 
                            variant="outlined" 
                            startIcon={<ImageIcon />}
                            size="small"
                            sx={{ textTransform: 'none' }}
                          >
                            Attach Diagram / Image
                            <input type="file" hidden accept="image/*" onChange={handleImageFileChange} />
                          </Button>
                          <Typography variant="caption" color="textSecondary">
                            PNG, JPG, or SVG diagram image
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Save & Navigation Bar */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" pt={1}>
                      <Box display="flex" gap={1}>
                        <Button 
                          variant="outlined" 
                          startIcon={<PrevIcon />}
                          disabled={currentQIndex === 0}
                          onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                          size="small"
                          sx={{ textTransform: 'none' }}
                        >
                          Previous
                        </Button>
                        <Button 
                          variant="outlined" 
                          endIcon={<NextIcon />}
                          disabled={currentQIndex === questions.length - 1}
                          onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))}
                          size="small"
                          sx={{ textTransform: 'none' }}
                        >
                          Next
                        </Button>
                      </Box>

                      <Button 
                        variant="contained" 
                        color="primary"
                        startIcon={savingQuestion ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                        disabled={savingQuestion}
                        onClick={handleSaveQuestionChanges}
                        sx={{ bgcolor: '#0F172A', '&:hover': { bgcolor: '#020617' }, textTransform: 'none' }}
                      >
                        {savingQuestion ? 'Saving...' : 'Save Question Changes'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Right Column: Interactive Question Palette */}
              <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ borderRadius: 2.5, borderColor: '#CBD5E1', bgcolor: '#F8FAFC' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="subtitle2" fontWeight="700" color="#334155" mb={1.5} textAlign="center">
                      Question Palette ({questions.length})
                    </Typography>

                    <Box 
                      sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(5, 1fr)', 
                        gap: 1.2, 
                        maxHeight: '340px', 
                        overflowY: 'auto',
                        p: 1
                      }}
                    >
                      {questions.map((q, idx) => {
                        const isCurrent = idx === currentQIndex;
                        const hasImage = !!q.image;

                        return (
                          <Button
                            key={q.id || idx}
                            variant={isCurrent ? "contained" : "outlined"}
                            onClick={() => setCurrentQIndex(idx)}
                            sx={{
                              minWidth: '42px',
                              height: '42px',
                              p: 0,
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              borderRadius: '8px',
                              bgcolor: isCurrent ? '#0F172A' : '#fff',
                              color: isCurrent ? '#fff' : '#334155',
                              borderColor: isCurrent ? '#0F172A' : '#CBD5E1',
                              boxShadow: isCurrent ? '0 4px 10px rgba(15, 23, 42, 0.35)' : 'none',
                              position: 'relative',
                              '&:hover': {
                                bgcolor: isCurrent ? '#020617' : '#F1F5F9',
                                borderColor: '#0F172A'
                              }
                            }}
                          >
                            {idx + 1}
                            {hasImage && (
                              <Box 
                                sx={{ 
                                  position: 'absolute', 
                                  bottom: 2, 
                                  right: 2, 
                                  width: 6, 
                                  height: 6, 
                                  borderRadius: '50%', 
                                  bgcolor: isCurrent ? '#FCD34D' : '#3B82F6' 
                                }} 
                              />
                            )}
                          </Button>
                        );
                      })}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Palette Legend */}
                    <Box display="flex" flexDirection="column" gap={1} px={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ width: 14, height: 14, borderRadius: '4px', bgcolor: '#0F172A' }} />
                        <Typography variant="caption" color="textSecondary">Active Question</Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ width: 14, height: 14, borderRadius: '4px', bgcolor: '#fff', border: '1px solid #CBD5E1' }} />
                        <Typography variant="caption" color="textSecondary">Other Questions</Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3B82F6' }} />
                        <Typography variant="caption" color="textSecondary">Has Diagram / Image</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Paper>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: DISPUTES WITH QUESTION-WISE FILTERING & PALETTE NAV    */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 2 && (
        <Paper elevation={0} sx={{ p: 3.5, borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="gap" gap={2}>
            <Box>
              <Typography variant="h6" fontWeight="700" color="#1E293B">
                Candidate Dispute Resolution Hub ({disputes.length})
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Filter disputes by overall exam or by specific question numbers to view candidate grievances and reply.
              </Typography>
            </Box>
          </Box>

          {/* Question Filter Navigation Bar */}
          <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0', mb: 3 }}>
            <Typography variant="caption" fontWeight="700" color="#475569" display="block" mb={1}>
              FILTER BY QUESTION:
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
              <Button
                size="small"
                variant={disputeFilterQ === 'ALL' ? "contained" : "outlined"}
                onClick={() => setDisputeFilterQ('ALL')}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  bgcolor: disputeFilterQ === 'ALL' ? '#0F172A' : '#fff',
                  fontWeight: 600
                }}
              >
                All Disputes ({disputes.length})
              </Button>

              <Button
                size="small"
                variant={disputeFilterQ === 'OVERALL' ? "contained" : "outlined"}
                onClick={() => setDisputeFilterQ('OVERALL')}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  bgcolor: disputeFilterQ === 'OVERALL' ? '#0F172A' : '#fff',
                  fontWeight: 600
                }}
              >
                Overall Exam ({disputes.filter(d => !d.question).length})
              </Button>

              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

              {questions.map((q, idx) => {
                const count = disputes.filter(d => d.question === q.id).length;
                const isSelected = disputeFilterQ === q.id;

                return (
                  <Button
                    key={q.id}
                    size="small"
                    variant={isSelected ? "contained" : "outlined"}
                    onClick={() => setDisputeFilterQ(q.id)}
                    sx={{
                      minWidth: '40px',
                      textTransform: 'none',
                      borderRadius: 2,
                      bgcolor: isSelected ? '#0F172A' : '#fff',
                      fontWeight: 600,
                      position: 'relative'
                    }}
                  >
                    Q{idx + 1} {count > 0 ? `(${count})` : ''}
                  </Button>
                );
              })}
            </Box>
          </Box>

          {/* Filtered Disputes List */}
          {filteredDisputes.length === 0 ? (
            <Box textAlign="center" py={6} bgcolor="#F8FAFC" borderRadius={2}>
              <GavelIcon sx={{ fontSize: 48, color: '#94A3B8', mb: 1 }} />
              <Typography variant="body1" fontWeight="600" color="#64748B">
                No disputes found for this filter.
              </Typography>
              <Typography variant="body2" color="#94A3B8" mt={0.5}>
                Select another question or view all disputes.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Candidate</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Target Question</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Dispute Message</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDisputes.map((dispute) => {
                    const qIndex = questions.findIndex(q => q.id === dispute.question);
                    const qLabel = qIndex !== -1 ? `Question ${qIndex + 1}` : 'Overall Exam';

                    return (
                      <TableRow key={dispute.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="700" color="#1E293B">
                            {dispute.raised_by_name || 'Candidate'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={qLabel} 
                            size="small" 
                            variant="outlined" 
                            color={qIndex !== -1 ? "primary" : "default"} 
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: '280px' }}>
                          <Typography variant="body2" color="#334155" sx={{ wordBreak: 'break-word' }}>
                            {dispute.message}
                          </Typography>
                          {dispute.reply && (
                            <Box sx={{ mt: 0.5, p: 0.8, bgcolor: '#F1F5F9', borderRadius: 1, borderLeft: '3px solid #0F172A' }}>
                              <Typography variant="caption" color="#0F172A" fontWeight="600" display="block">
                                Your Reply:
                              </Typography>
                              <Typography variant="caption" color="#334155">
                                {dispute.reply}
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>
                          {getDisputeStatusChip(dispute.status)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="textSecondary">
                            {new Date(dispute.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button 
                            size="small" 
                            variant="contained" 
                            startIcon={<ChatIcon fontSize="small" />}
                            onClick={() => handleOpenReply(dispute)}
                            sx={{ mr: 1, textTransform: 'none', borderRadius: 1.5, bgcolor: '#0F172A', '&:hover': { bgcolor: '#020617' } }}
                          >
                            Open Chat
                          </Button>
                          {dispute.status !== 'resolved' && (
                            <Button 
                              size="small" 
                              color="success" 
                              variant="outlined"
                              onClick={() => handleResolveDispute(dispute.id)}
                              sx={{ textTransform: 'none', borderRadius: 1.5 }}
                            >
                              Resolve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: SUBMISSIONS & GRADING TABLE                            */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 3 && (
        <Paper elevation={0} sx={{ p: 3.5, borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h6" fontWeight="700" color="#1E293B">
                Candidate Submissions & Grading ({submissions.length})
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Review candidate answer sheets, proctoring videos, logs, and grade or edit marks.
              </Typography>
            </Box>
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<SendIcon />}
              onClick={() => setBulkPublishOpen(true)}
              disabled={submissions.length === 0}
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700, bgcolor: '#0F172A', '&:hover': { bgcolor: '#020617' } }}
            >
              Publish
            </Button>
          </Box>

          {submissions.length === 0 ? (
            <Box textAlign="center" py={6} bgcolor="#F8FAFC" borderRadius={2}>
              <AssessmentIcon sx={{ fontSize: 48, color: '#94A3B8', mb: 1 }} />
              <Typography variant="body1" fontWeight="600" color="#64748B">
                No submissions received yet for this exam.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Candidate</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Submitted At</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Total Score</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow key={sub.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600" color="#1E293B">
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
                          sx={{ textTransform: 'none', borderRadius: 1.5 }}
                        >
                          {sub.status === 'evaluated' ? 'Edit Marks / View' : 'Grade Submission'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DIALOGS                                                       */}
      {/* ------------------------------------------------------------- */}

      {/* Edit Time Window Dialog */}
      <Dialog open={timeDialogOpen} onClose={() => setTimeDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Exam Time Window</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Start Time"
            type="datetime-local"
            fullWidth
            value={newStartTime}
            onChange={(e) => setNewStartTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            label="End Time"
            type="datetime-local"
            fullWidth
            value={newEndTime}
            onChange={(e) => setNewEndTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setTimeDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveTime} variant="contained" sx={{ bgcolor: '#0F172A' }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Add Candidate Dialog */}
      <Dialog 
        open={candidateDialogOpen} 
        onClose={() => {
          setCandidateDialogOpen(false);
          setNewCandidateEmail('');
          setCsvFile(null);
        }}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Add Candidate(s) to Whitelist</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" mb={2}>
            Enter an email manually or upload a CSV with candidate email addresses.
          </Typography>
          <TextField
            margin="dense"
            label="Candidate Email"
            type="email"
            placeholder="e.g. student@gmail.com"
            fullWidth
            value={newCandidateEmail}
            onChange={(e) => setNewCandidateEmail(e.target.value)}
            sx={{ mb: 2.5 }}
          />
          <Divider sx={{ mb: 2.5 }}>OR</Divider>
          <Button 
            component="label" 
            variant="outlined" 
            startIcon={<CloudUploadIcon />} 
            fullWidth
            sx={{ py: 1.5, textTransform: 'none' }}
          >
            Upload Candidate CSV
            <input type="file" hidden accept=".csv" onChange={e => setCsvFile(e.target.files[0])} />
          </Button>
          {csvFile && (
            <Typography variant="body2" mt={1} textAlign="center" color="primary.main" fontWeight="600">
              Selected: {csvFile.name}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCandidateDialogOpen(false)} disabled={addingCandidate}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddCandidate} 
            variant="contained" 
            disabled={(!newCandidateEmail && !csvFile) || addingCandidate}
            sx={{ bgcolor: '#0F172A', textTransform: 'none' }}
          >
            {addingCandidate ? <CircularProgress size={20} color="inherit" /> : 'Add Candidate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add New Question Dialog */}
      <Dialog 
        open={addQuestionDialogOpen} 
        onClose={() => setAddQuestionDialogOpen(false)}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Add New Question</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Question Statement"
            fullWidth
            multiline
            rows={4}
            value={newQText}
            onChange={(e) => setNewQText(e.target.value)}
            placeholder="Enter the question text here..."
            sx={{ mb: 2, mt: 1 }}
          />
          <Button component="label" variant="outlined" startIcon={<ImageIcon />} size="small" sx={{ textTransform: 'none' }}>
            Attach Diagram / Image (Optional)
            <input type="file" hidden accept="image/*" onChange={e => setNewQImage(e.target.files[0])} />
          </Button>
          {newQImage && (
            <Typography variant="caption" display="block" mt={1} color="primary.main" fontWeight="600">
              Attached: {newQImage.name}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddQuestionDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddNewQuestion} 
            variant="contained" 
            disabled={!newQText.trim()}
            sx={{ bgcolor: '#0F172A', textTransform: 'none' }}
          >
            Add Question
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Exam Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>
          Delete Exam Permanently?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>"{exam.title}"</strong>?
          </DialogContentText>
          <DialogContentText sx={{ mt: 1.5, fontSize: '0.875rem', color: 'text.secondary' }}>
            This action will permanently delete all questions, candidates, submissions, and proctoring recordings for this exam.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteExam} 
            color="error" 
            variant="contained" 
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={18} color="inherit" /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete Exam'}
          </Button>
        </DialogActions>
      </Dialog>

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

      {/* Dispute Chat Modal */}
      {replyModalOpen && selectedDispute && (
        <DisputeChatModal
          open={replyModalOpen}
          onClose={() => setReplyModalOpen(false)}
          dispute={selectedDispute}
          onDisputeUpdated={async () => {
            const dispRes = await examService.getExamDisputes(id);
            setDisputes(dispRes.data.results || dispRes.data || []);
          }}
        />
      )}
    </Container>
  );
};

export default ExamDetail;
