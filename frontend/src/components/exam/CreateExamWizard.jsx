import React, { useState } from 'react';
import { 
  Container, Typography, Box, Button, Stepper, Step, StepLabel, 
  Paper, TextField, FormControlLabel, Checkbox, IconButton, 
  Table, TableBody, TableCell, TableHead, TableRow, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useNavigate } from 'react-router-dom';
import examService from '../../api/examService';

const steps = ['Basic Info', 'Eligibility', 'Questions', 'Publish'];

const CreateExamWizard = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [examId, setExamId] = useState(null);
  const navigate = useNavigate();
  
  const [error, setError] = useState('');
  
  // Step 1: Basic Info
  const [basicInfo, setBasicInfo] = useState({
    title: '', description: '', guidelines: '', duration_minutes: 60,
    start_time: '', end_time: '', randomize_questions: false
  });

  // Step 2: Eligibility
  const [candidates, setCandidates] = useState([]);
  const [newCandidate, setNewCandidate] = useState({ email: '', handle: '' });
  const [csvFile, setCsvFile] = useState(null);

  // Step 3: Questions
  const [questions, setQuestions] = useState([]);
  const [numQuestions, setNumQuestions] = useState(1);
  const [isPublished, setIsPublished] = useState(false);

  const handleNext = async () => {
    setError('');
    try {
      if (activeStep === 0) {
        const payload = {
          ...basicInfo,
          start_time: new Date(basicInfo.start_time).toISOString(),
          end_time: new Date(basicInfo.end_time).toISOString()
        };
        if (!examId) {
          const res = await examService.createExam(payload);
          setExamId(res.data.id);
        } else {
          await examService.updateExam(examId, payload);
        }
      } else if (activeStep === 1) {
        // Upload Candidates
        if (candidates.length > 0) {
          for (let cand of candidates) {
            await examService.addEligibility(examId, cand);
          }
        }
        if (csvFile) {
          await examService.uploadEligibilityCSV(examId, csvFile);
        }
      } else if (activeStep === 2) {
        // Bulk Add Questions (without images for simplicity in bulk, or individual with images)
        // For simplicity in this demo, we'll post them individually so we can support images
        for (let i=0; i<questions.length; i++) {
          const q = questions[i];
          const formData = new FormData();
          formData.append('text', q.text);
          formData.append('order', i);
          if (q.image) formData.append('image', q.image);
          await examService.addQuestion(examId, formData);
        }
      } else if (activeStep === 3) {
        // Publish
        await examService.publishExam(examId);
        setIsPublished(true);
        return; // Don't advance step, just show success message
      }
      setActiveStep((prev) => prev + 1);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred during submission.');
    }
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const addCandidate = () => {
    if (newCandidate.email) {
      setCandidates([...candidates, newCandidate]);
      setNewCandidate({ email: '', handle: '' });
    }
  };

  const removeCandidate = (index) => {
    setCandidates(candidates.filter((_, i) => i !== index));
  };

  const generateQuestionForms = () => {
    const newQuestions = Array.from({ length: numQuestions }, () => ({ text: '', image: null }));
    setQuestions(newQuestions);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField label="Title" value={basicInfo.title} onChange={e => setBasicInfo({...basicInfo, title: e.target.value})} required />
            <TextField label="Description" multiline rows={3} value={basicInfo.description} onChange={e => setBasicInfo({...basicInfo, description: e.target.value})} />
            <TextField label="Guidelines" multiline rows={3} value={basicInfo.guidelines} onChange={e => setBasicInfo({...basicInfo, guidelines: e.target.value})} />
            <TextField label="Duration (minutes)" type="number" value={basicInfo.duration_minutes} onChange={e => setBasicInfo({...basicInfo, duration_minutes: e.target.value})} required />
            <TextField label="Start Time" type="datetime-local" InputLabelProps={{ shrink: true }} value={basicInfo.start_time} onChange={e => setBasicInfo({...basicInfo, start_time: e.target.value})} required />
            <TextField label="End Time" type="datetime-local" InputLabelProps={{ shrink: true }} value={basicInfo.end_time} onChange={e => setBasicInfo({...basicInfo, end_time: e.target.value})} required />
            <FormControlLabel control={<Checkbox checked={basicInfo.randomize_questions} onChange={e => setBasicInfo({...basicInfo, randomize_questions: e.target.checked})} />} label="Randomize Question Order" />
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6">Manual Entry</Typography>
            <Box display="flex" gap={2} mb={2}>
              <TextField label="Email" value={newCandidate.email} onChange={e => setNewCandidate({...newCandidate, email: e.target.value})} />
              <TextField label="Handle (optional)" value={newCandidate.handle} onChange={e => setNewCandidate({...newCandidate, handle: e.target.value})} />
              <Button variant="contained" onClick={addCandidate}>Add</Button>
            </Box>
            {candidates.length > 0 && (
              <Table size="small">
                <TableHead><TableRow><TableCell>Email</TableCell><TableCell>Handle</TableCell><TableCell>Action</TableCell></TableRow></TableHead>
                <TableBody>
                  {candidates.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>{c.email}</TableCell><TableCell>{c.handle}</TableCell>
                      <TableCell><IconButton onClick={() => removeCandidate(i)} color="error"><DeleteIcon /></IconButton></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            <Typography variant="h6" mt={4} mb={1}>CSV Upload</Typography>
            <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />}>
              Upload CSV
              <input type="file" hidden accept=".csv" onChange={e => setCsvFile(e.target.files[0])} />
            </Button>
            {csvFile && <Typography variant="body2" mt={1}>{csvFile.name}</Typography>}
          </Box>
        );
      case 2:
        return (
          <Box>
            <Box display="flex" gap={2} mb={3}>
              <TextField label="Number of Questions" type="number" value={numQuestions} onChange={e => setNumQuestions(e.target.value)} />
              <Button variant="contained" onClick={generateQuestionForms}>Generate Fields</Button>
            </Box>
            {questions.map((q, i) => (
              <Paper key={i} sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" mb={1}>Question {i + 1}</Typography>
                <TextField fullWidth multiline rows={2} label="Question Text" value={q.text} onChange={e => updateQuestion(i, 'text', e.target.value)} sx={{ mb: 2 }} required />
                <Button component="label" variant="outlined" size="small">
                  Attach Image (Optional)
                  <input type="file" hidden accept="image/*" onChange={e => updateQuestion(i, 'image', e.target.files[0])} />
                </Button>
                {q.image && <Typography variant="body2" mt={1} color="textSecondary">{q.image.name}</Typography>}
              </Paper>
            ))}
          </Box>
        );
      case 3:
        return (
          <Box textAlign="center">
            {isPublished ? (
              <Box>
                <Alert severity="success" sx={{ mb: 3 }}>Exam Published Successfully! Candidates have been notified.</Alert>
                <Button variant="contained" onClick={() => navigate('/exams')}>Go to Dashboard</Button>
              </Box>
            ) : (
              <Box>
                <Typography variant="h6" mb={2}>Review & Publish</Typography>
                <Typography>Title: {basicInfo.title}</Typography>
                <Typography>Duration: {basicInfo.duration_minutes} mins</Typography>
                <Typography>Candidates listed: {candidates.length + (csvFile ? 1 : 0)} entries</Typography>
                <Typography>Questions: {questions.length}</Typography>
                <Typography mt={3} color="textSecondary">Once published, invited candidates will receive an in-app notification to register.</Typography>
              </Box>
            )}
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" mb={4} align="center">Create New Exam</Typography>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {renderStepContent(activeStep)}

        {!isPublished && (
          <Box display="flex" justifyContent="space-between" mt={4}>
            <Button disabled={activeStep === 0} onClick={handleBack} variant="outlined">Back</Button>
            <Button variant="contained" onClick={handleNext}>
              {activeStep === steps.length - 1 ? 'Publish Exam' : 'Next'}
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default CreateExamWizard;
