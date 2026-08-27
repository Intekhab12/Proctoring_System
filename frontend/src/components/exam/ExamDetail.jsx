import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Paper, CircularProgress, Alert, Divider, List, ListItem, ListItemText, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import examService from '../../api/examService';

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
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [eligibility, setEligibility] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Dialog States
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');

  const [candidateDialogOpen, setCandidateDialogOpen] = useState(false);
  const [newCandidateEmail, setNewCandidateEmail] = useState('');
  const [csvFile, setCsvFile] = useState(null);

  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionImage, setNewQuestionImage] = useState(null);

  useEffect(() => {
    fetchExamDetails();
  }, [id]);

  const fetchExamDetails = async () => {
    try {
      setLoading(true);
      const [examRes, qRes, eligRes] = await Promise.all([
        examService.getExam(id),
        examService.getQuestions(id),
        examService.getEligibilities(id)
      ]);
      setExam(examRes.data);
      setQuestions(qRes.data);
      setEligibility(eligRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch exam details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTime = async () => {
    try {
      const startIso = new Date(newStartTime).toISOString();
      const endIso = new Date(newEndTime).toISOString();
      await examService.patchExam(id, { start_time: startIso, end_time: endIso });
      setExam(prev => ({ ...prev, start_time: startIso, end_time: endIso }));
      setTimeDialogOpen(false);
    } catch (err) {
      alert("Failed to update time");
    }
  };

  const handleAddCandidate = async () => {
    if (!newCandidateEmail && !csvFile) return;
    try {
      if (newCandidateEmail) {
        const res = await examService.addEligibility(id, { email: newCandidateEmail });
        setEligibility(prev => [...prev, res.data]);
      }
      if (csvFile) {
        await examService.uploadEligibilityCSV(id, csvFile);
        const eligRes = await examService.getEligibilities(id);
        setEligibility(eligRes.data);
      }
      setCandidateDialogOpen(false);
      setNewCandidateEmail('');
      setCsvFile(null);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add candidate(s)");
    }
  };

  const handleRemoveCandidate = async (eligId) => {
    try {
      await examService.deleteEligibility(id, eligId);
      setEligibility(eligibility.filter(c => c.id !== eligId));
    } catch (err) {
      alert("Failed to remove candidate");
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestionText) return;
    try {
      const formData = new FormData();
      formData.append('text', newQuestionText);
      formData.append('order', questions.length);
      if (newQuestionImage) formData.append('image', newQuestionImage);
      
      const res = await examService.addQuestion(id, formData);
      setQuestions([...questions, res.data]);
      setQuestionDialogOpen(false);
      setNewQuestionText('');
      setNewQuestionImage(null);
    } catch (err) {
      alert("Failed to add question");
    }
  };

  const handleRemoveQuestion = async (qId) => {
    try {
      await examService.deleteQuestion(id, qId);
      setQuestions(questions.filter(q => q.id !== qId));
    } catch (err) {
      alert("Failed to remove question");
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
  if (error) return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
  if (!exam) return null;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4">{exam.title}</Typography>
          <Box display="flex" gap={2}>
            <Button 
              variant="outlined" 
              color="warning"
              onClick={() => navigate(`/exams/${id}/disputes`)}
            >
              View Disputes
            </Button>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => navigate(`/exams/${id}/submissions`)}
            >
              View Submissions
            </Button>
          </Box>
        </Box>
        <Typography variant="body1" color="textSecondary" paragraph>{exam.description}</Typography>
        
        <Box display="flex" gap={4} mb={3}>
          <Box>
            <Typography variant="subtitle2" color="textSecondary">Duration</Typography>
            <Typography>{exam.duration_minutes} minutes</Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="textSecondary">Time Window</Typography>
            <Box display="flex" alignItems="center">
              <Typography>
                {new Date(exam.start_time).toLocaleString()} - {new Date(exam.end_time).toLocaleString()}
              </Typography>
              <IconButton size="small" onClick={() => {
                setNewStartTime(toLocalISOString(exam.start_time));
                setNewEndTime(toLocalISOString(exam.end_time));
                setTimeDialogOpen(true);
              }}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="textSecondary">Status</Typography>
            <Typography color={exam.is_published ? "success.main" : "warning.main"}>
              {exam.is_published ? "Published" : "Draft"}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Questions ({questions.length})</Typography>
          <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={() => setQuestionDialogOpen(true)}>Add Question</Button>
        </Box>
        <List>
          {questions.map((q, idx) => (
            <ListItem 
              key={q.id} 
              alignItems="flex-start" 
              sx={{ bgcolor: 'grey.50', mb: 1, borderRadius: 1 }}
              secondaryAction={
                <IconButton edge="end" onClick={() => handleRemoveQuestion(q.id)}>
                  <DeleteIcon color="error" />
                </IconButton>
              }
            >
              <ListItemText 
                primary={`Q${idx + 1}. ${q.text}`} 
                secondary={q.image ? "Has attached image" : ""}
              />
              {q.image && (
                <Box ml={2}>
                  <img src={q.image} alt="Question" style={{ maxHeight: '100px', borderRadius: '4px' }} />
                </Box>
              )}
            </ListItem>
          ))}
          {questions.length === 0 && <Typography variant="body2" color="textSecondary">No questions added.</Typography>}
        </List>

        <Divider sx={{ my: 3 }} />

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Eligible Candidates ({eligibility.length})</Typography>
          <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={() => setCandidateDialogOpen(true)}>Add Candidate</Button>
        </Box>
        <List>
          {eligibility.map((c) => (
            <ListItem key={c.id} secondaryAction={
              <IconButton edge="end" onClick={() => handleRemoveCandidate(c.id)}>
                <DeleteIcon color="error" />
              </IconButton>
            }>
              <ListItemText primary={c.email || c.candidate_email} secondary={`Status: ${c.status}`} />
            </ListItem>
          ))}
          {eligibility.length === 0 && <Typography variant="body2" color="textSecondary">No candidates added.</Typography>}
        </List>

        {/* Edit Time Dialog */}
        <Dialog open={timeDialogOpen} onClose={() => setTimeDialogOpen(false)}>
          <DialogTitle>Edit Time Window</DialogTitle>
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
          <DialogActions>
            <Button onClick={() => setTimeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTime} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>

        {/* Add Candidate Dialog */}
        <Dialog open={candidateDialogOpen} onClose={() => {
          setCandidateDialogOpen(false);
          setNewCandidateEmail('');
          setCsvFile(null);
        }}>
          <DialogTitle>Add Candidate</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="textSecondary" mb={2}>
              Enter an email manually, or upload a CSV file containing an "email" column.
            </Typography>
            <TextField
              margin="dense"
              label="Candidate Email"
              type="email"
              fullWidth
              value={newCandidateEmail}
              onChange={(e) => setNewCandidateEmail(e.target.value)}
              sx={{ mb: 3 }}
            />
            <Divider sx={{ mb: 3 }}>OR</Divider>
            <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} fullWidth>
              Upload CSV
              <input type="file" hidden accept=".csv" onChange={e => setCsvFile(e.target.files[0])} />
            </Button>
            {csvFile && <Typography variant="body2" mt={1} textAlign="center" color="textSecondary">{csvFile.name}</Typography>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setCandidateDialogOpen(false);
              setNewCandidateEmail('');
              setCsvFile(null);
            }}>Cancel</Button>
            <Button onClick={handleAddCandidate} variant="contained" disabled={!newCandidateEmail && !csvFile}>Add</Button>
          </DialogActions>
        </Dialog>

        {/* Add Question Dialog */}
        <Dialog open={questionDialogOpen} onClose={() => setQuestionDialogOpen(false)}>
          <DialogTitle>Add Question</DialogTitle>
          <DialogContent>
            <TextField
              margin="dense"
              label="Question Text"
              fullWidth
              multiline
              rows={3}
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button component="label" variant="outlined" size="small">
              Attach Image (Optional)
              <input type="file" hidden accept="image/*" onChange={e => setNewQuestionImage(e.target.files[0])} />
            </Button>
            {newQuestionImage && <Typography variant="body2" mt={1} color="textSecondary">{newQuestionImage.name}</Typography>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setQuestionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddQuestion} variant="contained" disabled={!newQuestionText}>Add Question</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default ExamDetail;
