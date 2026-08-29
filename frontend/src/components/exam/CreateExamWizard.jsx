import React, { useState } from 'react';
import { 
  Container, Typography, Box, Button, Stepper, Step, StepLabel, 
  Paper, TextField, FormControlLabel, Checkbox, IconButton, 
  Table, TableBody, TableCell, TableHead, TableRow, Alert, Divider, Tooltip, Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AddIcon from '@mui/icons-material/Add';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
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
    title: '', description: '', duration_minutes: 60,
    start_time: '', end_time: '', randomize_questions: false
  });

  // Step 2: Eligibility
  const [candidates, setCandidates] = useState([]);
  const [newCandidate, setNewCandidate] = useState({ email: '' });
  const [csvFile, setCsvFile] = useState(null);

  // Step 3: Questions
  const [questions, setQuestions] = useState([{ text: '', image: null }]);
  const [numQuestions, setNumQuestions] = useState(1);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isPublished, setIsPublished] = useState(false);

  const handleNext = async () => {
    setError('');
    try {
      if (activeStep === 0) {
        if (!basicInfo.title || !basicInfo.duration_minutes || !basicInfo.start_time || !basicInfo.end_time) {
          setError('Please fill in all required fields (Title, Duration, Start Time, and End Time).');
          return;
        }
        
        let startDate = new Date(basicInfo.start_time);
        let endDate = new Date(basicInfo.end_time);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          setError('Please provide valid dates for Start Time and End Time.');
          return;
        }

        if (endDate <= startDate) {
          setError('End Time must be after Start Time.');
          return;
        }

        const payload = {
          ...basicInfo,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString()
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
        // Clear existing questions to prevent duplicates if user navigates back and forth
        try {
          const existing = await examService.getQuestions(examId);
          for (let eq of existing.data) {
            await examService.deleteQuestion(examId, eq.id);
          }
        } catch (e) {
          console.error("Failed to clear existing questions", e);
        }

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
      setCandidates([...candidates, { email: newCandidate.email.trim() }]);
      setNewCandidate({ email: '' });
    }
  };

  const removeCandidate = (index) => {
    setCandidates(candidates.filter((_, i) => i !== index));
  };

  const generateQuestionForms = () => {
    const count = Math.max(1, parseInt(numQuestions, 10) || 1);
    const newQuestions = Array.from({ length: count }, (_, i) => 
      questions[i] || { text: '', image: null }
    );
    setQuestions(newQuestions);
    if (currentQIndex >= count) {
      setCurrentQIndex(count - 1);
    }
  };

  const addSingleQuestion = () => {
    const newQuestions = [...questions, { text: '', image: null }];
    setQuestions(newQuestions);
    setNumQuestions(newQuestions.length);
    setCurrentQIndex(newQuestions.length - 1);
  };

  const removeCurrentQuestion = (indexToRemove) => {
    if (questions.length <= 1) {
      setQuestions([{ text: '', image: null }]);
      return;
    }
    const newQuestions = questions.filter((_, i) => i !== indexToRemove);
    setQuestions(newQuestions);
    setNumQuestions(newQuestions.length);
    if (currentQIndex >= newQuestions.length) {
      setCurrentQIndex(newQuestions.length - 1);
    }
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField fullWidth label="Exam Title" value={basicInfo.title} onChange={e => setBasicInfo({...basicInfo, title: e.target.value})} required variant="outlined" />
            
            <TextField fullWidth label="Description" multiline rows={3} value={basicInfo.description} onChange={e => setBasicInfo({...basicInfo, description: e.target.value})} variant="outlined" />
            
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 3 }}>
              <Box>
                <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: 'block' }}>Duration (minutes) *</Typography>
                <TextField fullWidth type="number" value={basicInfo.duration_minutes} onChange={e => setBasicInfo({...basicInfo, duration_minutes: e.target.value})} required variant="outlined" />
              </Box>
              
              <Box>
                <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: 'block' }}>Start Time *</Typography>
                <TextField 
                  fullWidth 
                  type="datetime-local" 
                  value={basicInfo.start_time} 
                  onChange={e => setBasicInfo({...basicInfo, start_time: e.target.value})} 
                  required 
                  variant="outlined" 
                />
              </Box>

              <Box>
                <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: 'block' }}>End Time *</Typography>
                <TextField 
                  fullWidth 
                  type="datetime-local" 
                  value={basicInfo.end_time} 
                  onChange={e => setBasicInfo({...basicInfo, end_time: e.target.value})} 
                  required 
                  variant="outlined" 
                />
              </Box>
            </Box>

            <FormControlLabel 
              control={<Checkbox checked={basicInfo.randomize_questions} onChange={e => setBasicInfo({...basicInfo, randomize_questions: e.target.checked})} color="primary" />} 
              label="Randomize Question Order" 
            />
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6">Manual Entry</Typography>
            <Box display="flex" gap={2} mb={2}>
              <TextField 
                label="Candidate Email" 
                fullWidth
                value={newCandidate.email} 
                onChange={e => setNewCandidate({...newCandidate, email: e.target.value})} 
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCandidate();
                  }
                }}
              />
              <Button variant="contained" onClick={addCandidate} sx={{ px: 4 }}>Add</Button>
            </Box>
            {candidates.length > 0 && (
              <Table size="small">
                <TableHead><TableRow><TableCell>Email</TableCell><TableCell align="right">Action</TableCell></TableRow></TableHead>
                <TableBody>
                  {candidates.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>{c.email}</TableCell>
                      <TableCell align="right"><IconButton onClick={() => removeCandidate(i)} color="error"><DeleteIcon /></IconButton></TableCell>
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
        const currentQ = questions[currentQIndex] || { text: '', image: null };
        return (
          <Box>
            {/* Top Control Bar */}
            <Paper 
              elevation={0}
              sx={{ 
                p: 2.5, mb: 4, bgcolor: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '12px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2
              }}
            >
              <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                <TextField 
                  label="Number of Questions" 
                  type="number" 
                  size="small"
                  inputProps={{ min: 1 }}
                  value={numQuestions} 
                  onChange={e => setNumQuestions(e.target.value)} 
                  sx={{ width: 170 }}
                />
                <Button variant="contained" onClick={generateQuestionForms} sx={{ px: 3 }}>
                  Generate / Resize
                </Button>
              </Box>
              <Button 
                variant="outlined" 
                startIcon={<AddIcon />} 
                onClick={addSingleQuestion}
                sx={{ px: 3 }}
              >
                + Add Question
              </Button>
            </Paper>

            {/* Main Area: Editor + Sidebar Palette */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 320px' }, gap: 4, alignItems: 'start' }}>
              {/* Question Editor Card */}
              <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: '16px', border: '1px solid #e0e0e0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Chip 
                      label={`Question ${currentQIndex + 1} of ${questions.length}`} 
                      color="primary" 
                      sx={{ fontWeight: 'bold', fontSize: '0.95rem', py: 2, px: 1 }} 
                    />
                    {currentQ.text && currentQ.text.trim().length > 0 && (
                      <Chip label="Configured" size="small" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 600, px: 0.5 }} />
                    )}
                  </Box>
                  <Tooltip title="Delete this question">
                    <span>
                      <IconButton 
                        onClick={() => removeCurrentQuestion(currentQIndex)} 
                        color="error"
                        disabled={questions.length === 1 && !currentQ.text && !currentQ.image}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>

                <TextField 
                  fullWidth 
                  multiline 
                  rows={6} 
                  label="Question Text *" 
                  placeholder="Type the full question / problem statement here..." 
                  value={currentQ.text} 
                  onChange={e => updateQuestion(currentQIndex, 'text', e.target.value)} 
                  sx={{ mb: 3.5 }} 
                  required 
                  variant="outlined" 
                />

                <Box sx={{ p: 2.5, bgcolor: '#fafafa', borderRadius: '12px', border: '1px dashed #bdbdbd', mb: 4 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: '#333' }}>
                    Attach Diagram / Image (Optional)
                  </Typography>
                  <Button component="label" variant="outlined" startIcon={<ImageIcon />} size="medium" sx={{ textTransform: 'none' }}>
                    {currentQ.image ? 'Change Selected Image' : 'Select Image File'}
                    <input type="file" hidden accept="image/*" onChange={e => updateQuestion(currentQIndex, 'image', e.target.files[0])} />
                  </Button>
                  {currentQ.image && (
                    <Box mt={2} p={1.5} sx={{ bgcolor: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <ImageIcon color="primary" />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>
                          {currentQ.image.name}
                        </Typography>
                      </Box>
                      <IconButton size="small" onClick={() => updateQuestion(currentQIndex, 'image', null)} color="error">
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>

                {/* Sub-navigation inside Question Editor */}
                <Box display="flex" justifyContent="space-between" alignItems="center" pt={2.5} sx={{ borderTop: '1px solid #f0f0f0' }}>
                  <Button 
                    variant="outlined" 
                    startIcon={<NavigateBeforeIcon />}
                    disabled={currentQIndex === 0}
                    onClick={() => setCurrentQIndex(prev => prev - 1)}
                    sx={{ px: 3, py: 1 }}
                  >
                    Previous Question
                  </Button>
                  <Button 
                    variant="contained" 
                    endIcon={currentQIndex === questions.length - 1 ? <AddIcon /> : <NavigateNextIcon />}
                    onClick={() => {
                      if (currentQIndex < questions.length - 1) {
                        setCurrentQIndex(prev => prev + 1);
                      } else {
                        addSingleQuestion();
                      }
                    }}
                    sx={{ px: 3.5, py: 1 }}
                  >
                    {currentQIndex === questions.length - 1 ? 'Save & Add Next' : 'Next Question'}
                  </Button>
                </Box>
              </Paper>

              {/* Right Side Question Palette */}
              <Paper elevation={0} sx={{ p: 3, bgcolor: '#fafafa', borderRadius: '16px', border: '1px solid #e0e0e0' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '1.1rem' }}>
                  Question Palette
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block" mb={2}>
                  Click any question number to navigate
                </Typography>
                <Divider sx={{ mb: 2.5 }} />

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1.25, maxHeight: '340px', overflowY: 'auto', p: 0.5 }}>
                  {questions.map((q, index) => {
                    const isFilled = q.text && q.text.trim().length > 0;
                    const isCurrent = index === currentQIndex;

                    let bgColor = '#f0f0f0';
                    let textColor = '#333';

                    if (isCurrent) {
                      bgColor = '#1976d2';
                      textColor = '#fff';
                    } else if (isFilled) {
                      bgColor = '#4caf50';
                      textColor = '#fff';
                    }

                    return (
                      <Button
                        key={index}
                        variant="contained"
                        sx={{
                          minWidth: '46px',
                          height: '46px',
                          p: 0,
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          borderRadius: '8px',
                          backgroundColor: bgColor,
                          color: textColor,
                          boxShadow: isCurrent ? 3 : 'none',
                          border: isCurrent ? '2px solid #1565c0' : '1px solid rgba(0,0,0,0.06)',
                          '&:hover': {
                            backgroundColor: isCurrent ? '#115293' : (isFilled ? '#388e3c' : '#e0e0e0')
                          }
                        }}
                        onClick={() => setCurrentQIndex(index)}
                      >
                        {index + 1}
                      </Button>
                    );
                  })}
                </Box>

                {/* Legend */}
                <Box mt={3.5} pt={2.5} sx={{ borderTop: '1px solid #e0e0e0' }}>
                  <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                    <Box sx={{ width: 20, height: 20, bgcolor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px' }} />
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#555' }}>Unanswered / Empty</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                    <Box sx={{ width: 20, height: 20, bgcolor: '#4caf50', borderRadius: '4px' }} />
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#555' }}>Filled / Configured</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Box sx={{ width: 20, height: 20, bgcolor: '#1976d2', borderRadius: '4px' }} />
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#555' }}>Current Question</Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Paper sx={{ p: { xs: 3, sm: 4.5 }, borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <Typography variant="h4" mb={4} align="center" sx={{ fontWeight: 700 }}>Create New Exam</Typography>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {renderStepContent(activeStep)}

        {!isPublished && (
          <Box display="flex" justifyContent="space-between" mt={5} pt={3} sx={{ borderTop: '1px solid #eee' }}>
            <Button disabled={activeStep === 0} onClick={handleBack} variant="outlined" sx={{ px: 4, py: 1 }}>Back</Button>
            <Button variant="contained" onClick={handleNext} sx={{ px: 4, py: 1 }}>
              {activeStep === steps.length - 1 ? 'Publish Exam' : 'Next'}
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default CreateExamWizard;
