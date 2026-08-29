import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Button, TextField, 
  CircularProgress, Alert, Divider, Chip, Grid, Slider,
  Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Link, Modal, Fade, Backdrop, IconButton
} from '@mui/material';
import { Brush as BrushIcon, Save as SaveIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import examService from '../../api/examService';

const GradingPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [proctoringLogs, setProctoringLogs] = useState([]);
  const [videoRecording, setVideoRecording] = useState(null);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoBlobUrl, setVideoBlobUrl] = useState(null);
  const [videoDownloading, setVideoDownloading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoPlayerRef = useRef(null);
  const [selectedWhiteboard, setSelectedWhiteboard] = useState(null);

  // Local state for edits
  const [edits, setEdits] = useState({});

  useEffect(() => {
    fetchSubmission();
  }, [submissionId]);

  const fetchSubmission = async () => {
    try {
      const res = await examService.getSubmissionDetail(submissionId);
      setSubmission(res.data);
      
      // Initialize edits state
      const initialEdits = {};
      res.data.answers.forEach(ans => {
        initialEdits[ans.id] = {
          marks_awarded: ans.marks_awarded !== null && ans.marks_awarded !== undefined ? ans.marks_awarded : '',
          feedback: ans.feedback || ''
        };
      });
      setEdits(initialEdits);

      // Fetch proctoring logs
      try {
        const logsRes = await examService.getProctoringLogs(submissionId);
        setProctoringLogs(logsRes.data);
      } catch(logErr) {
        console.error('Failed to fetch proctoring logs', logErr);
      }

      // Fetch video recording
      try {
        const videoRes = await examService.getExamVideo(submissionId);
        setVideoRecording(videoRes.data);
      } catch(videoErr) {
        console.error('Failed to fetch exam video recording', videoErr);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch submission details.');
    } finally {
      setLoading(false);
    }
  };

  // Download the entire video file as a blob so Chrome can seek freely.
  useEffect(() => {
    if (!videoRecording?.video_url) return;
    
    if (videoBlobUrl) {
      URL.revokeObjectURL(videoBlobUrl);
      setVideoBlobUrl(null);
    }

    setVideoDownloading(true);
    setVideoLoaded(false);

    fetch(videoRecording.video_url)
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        setVideoBlobUrl(url);
        setVideoDownloading(false);
      })
      .catch(err => {
        console.error('[GradingPage] Failed to download video blob:', err);
        setVideoDownloading(false);
        setVideoBlobUrl(videoRecording.video_url);
      });

    return () => {
      if (videoBlobUrl) {
        URL.revokeObjectURL(videoBlobUrl);
      }
    };
  }, [videoRecording?.video_url]);

  const handleEditChange = (answerId, field, value) => {
    setEdits(prev => ({
      ...prev,
      [answerId]: {
        ...prev[answerId],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaveSuccess('');
    try {
      const answersPayload = Object.entries(edits).map(([id, val]) => ({
        id,
        marks_awarded: val.marks_awarded !== '' && val.marks_awarded !== null ? parseInt(val.marks_awarded, 10) : null,
        feedback: val.feedback || ''
      }));

      const res = await examService.saveDraftGrades(submissionId, { answers: answersPayload });
      setSaveSuccess(res.data.message || 'Results saved for this candidate! When you click "Publish" on the Submissions dashboard, all candidates will see their results.');
      fetchSubmission();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to save evaluation.');
    } finally {
      setSaving(false);
    }
  };

  const getOffsetForLog = (log) => {
    // 1. Direct measured video offset recorded during exam (if > 0)
    if (log.details && typeof log.details.video_offset_sec === 'number' && log.details.video_offset_sec > 0) {
      return log.details.video_offset_sec;
    }

    const logMs = new Date(log.timestamp).getTime();

    // 2. Exact video end-minus-duration offset
    const video = videoPlayerRef.current;
    if (videoRecording?.uploaded_at && video && isFinite(video.duration) && video.duration > 0) {
      const videoStartMs = new Date(videoRecording.uploaded_at).getTime() - (video.duration * 1000);
      return Math.max(0, Math.floor((logMs - videoStartMs) / 1000));
    }

    // 3. Use submission.started_at as true 0:00 baseline
    if (submission?.started_at) {
      const startMs = new Date(submission.started_at).getTime();
      return Math.max(0, Math.floor((logMs - startMs) / 1000));
    }

    // 4. Earliest proctoring log fallback
    if (proctoringLogs.length > 0) {
      const earliestMs = Math.min(...proctoringLogs.map(l => new Date(l.timestamp).getTime()));
      return Math.max(0, Math.floor((logMs - earliestMs) / 1000));
    }

    return 0;
  };

  const handleJumpToTime = (targetSec) => {
    console.log(`[GradingPage] ⏩ Requesting jump to timestamp ${targetSec}s...`);
    const video = videoPlayerRef.current;
    if (!video) return;

    try {
      video.currentTime = targetSec;
      console.log(`[GradingPage] 🎯 Set video.currentTime = ${targetSec}s (actual: ${video.currentTime}s)`);
    } catch (e) {
      console.warn("[GradingPage] Seek error:", e);
    }

    const p = video.play();
    if (p !== undefined) {
      p.catch(err => console.warn("[GradingPage] Play error:", err));
    }
  };

  if (loading) return <Container sx={{ mt: 4 }}><CircularProgress /></Container>;
  if (error) return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
  if (!submission) return null;

  const isEvaluated = submission.status === 'evaluated';

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Grading: {submission.exam_title}
        </Typography>
        <Button variant="outlined" onClick={() => navigate(`/exams/${submission.exam}/submissions`)}>
          Back to Submissions
        </Button>
      </Box>

      {saveSuccess && <Alert severity="success" sx={{ mb: 2 }}>{saveSuccess}</Alert>}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Candidate Information</Typography>
        <Typography><strong>Name:</strong> {submission.candidate.full_name || 'N/A'}</Typography>
        <Typography><strong>Email:</strong> {submission.candidate.email}</Typography>
        <Typography><strong>Submitted At:</strong> {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'Not submitted'}</Typography>
        <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip 
            label={isEvaluated ? "Published" : (submission.total_score !== null && submission.total_score !== undefined ? "Saved (Unpublished)" : "Submitted")} 
            color={isEvaluated ? "success" : (submission.total_score !== null && submission.total_score !== undefined ? "primary" : "warning")} 
            sx={{ fontWeight: 600 }} 
          />
          {submission.total_score !== null && submission.total_score !== undefined && (
            <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
              Total Score: {submission.total_score}
            </Typography>
          )}
        </Box>
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
          {isEvaluated 
            ? "ℹ️ Results are currently published. Edit marks or feedback below and click 'Save' to update this candidate's score."
            : "ℹ️ Enter marks and feedback below and click 'Save'. When you click 'Publish' on the Submissions dashboard, all candidates will receive their results."}
        </Typography>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Answers & Grading" />
          <Tab label={`Proctoring Logs (${proctoringLogs.length})`} />
          <Tab label={videoRecording?.video_url ? "Video Proctoring (1)" : "Video Proctoring (0)"} />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Box>
          {submission.answers.map((answer, index) => (
            <Paper key={answer.id} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Question {index + 1}</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>{answer.question.text}</Typography>
              
              {answer.question.image && (
                <Box sx={{ mb: 2 }}>
                  <img 
                    src={answer.question.image} 
                    alt="Question" 
                    style={{ maxWidth: '100%', maxHeight: '300px' }} 
                  />
                </Box>
              )}

              <Box sx={{ bgcolor: '#f8fafc', p: 2.5, borderRadius: 2, border: '1px solid #e2e8f0', mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight="700" color="#334155">
                    Candidate's Response:
                  </Typography>
                  {answer.whiteboard_data ? (
                    <Button 
                      variant="outlined" 
                      size="small" 
                      color="primary"
                      startIcon={<BrushIcon />}
                      onClick={() => setSelectedWhiteboard(answer.whiteboard_data)}
                      sx={{ textTransform: 'none', borderRadius: 1.5 }}
                    >
                      View Whiteboard Drawing
                    </Button>
                  ) : (
                    <Chip 
                      label="No Drawing" 
                      size="small" 
                      variant="outlined" 
                      sx={{ color: '#94A3B8', borderColor: '#CBD5E1', fontSize: '0.75rem' }} 
                    />
                  )}
                </Box>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: '#1E293B' }}>
                  {answer.text_answer || <span style={{ fontStyle: 'italic', color: '#94A3B8' }}>No text answer provided.</span>}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" fontWeight="700" color="#1E293B" gutterBottom>Grading & Feedback</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Marks Awarded"
                  type="number"
                  value={edits[answer.id]?.marks_awarded}
                  onChange={(e) => handleEditChange(answer.id, 'marks_awarded', e.target.value)}
                  sx={{ width: '220px' }}
                  placeholder="Enter marks"
                />
                <TextField
                  label="Feedback (Optional)"
                  multiline
                  rows={3}
                  value={edits[answer.id]?.feedback}
                  onChange={(e) => handleEditChange(answer.id, 'feedback', e.target.value)}
                  fullWidth
                  placeholder="Provide personalized remarks or explanation for the candidate..."
                />
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {tabValue === 1 && (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Event Type</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell>Evidence</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {proctoringLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">No proctoring incidents logged.</TableCell>
                  </TableRow>
                ) : (
                  proctoringLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip size="small" label={log.event_type} color={log.event_type.includes('exit') || log.event_type.includes('spike') || log.event_type.includes('face') ? 'error' : 'warning'} />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {JSON.stringify(log.details)}
                      </TableCell>
                      <TableCell>
                        {log.evidence ? (
                          <Link 
                            component="button" 
                            variant="body2" 
                            onClick={() => setSelectedEvidence(log.evidence)}
                          >
                            View
                          </Link>
                        ) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {tabValue === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Full Session Video Proctoring</Typography>
          <Typography variant="body2" color="textSecondary" mb={3}>
            Watch full session video recording. Click any incident in the timeline to jump to that moment in the video.
          </Typography>
          {!videoRecording || !videoRecording.video_url ? (
            <Alert severity="info">No video recording available for this submission.</Alert>
          ) : videoDownloading || !videoBlobUrl ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={6}>
              <CircularProgress />
              <Typography variant="body2" color="textSecondary">
                Loading video for seekable playback...
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'black', borderRadius: 2 }}>
                  <video 
                    ref={videoPlayerRef} 
                    controls 
                    preload="auto"
                    src={videoBlobUrl} 
                    onLoadedMetadata={() => setVideoLoaded(true)}
                    onClick={(e) => {
                      const video = e.currentTarget;
                      const rect = video.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const clickY = e.clientY - rect.top;
                      const width = rect.width;
                      const height = rect.height;

                      if (clickY > height * 0.70 && width > 0 && isFinite(video.duration) && video.duration > 0) {
                        const clickPercent = Math.max(0, Math.min(1, clickX / width));
                        const targetSec = Math.floor(clickPercent * video.duration);
                        console.log(`[GradingPage] 📍 Progress bar clicked at ${(clickPercent * 100).toFixed(1)}% -> Jumping to ${targetSec}s`);
                        handleJumpToTime(targetSec);
                      }
                    }}
                    style={{ width: '100%', maxHeight: '420px', borderRadius: '4px' }} 
                  />
                  <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                    <Typography variant="caption" color="grey.400">
                      Uploaded: {new Date(videoRecording.uploaded_at).toLocaleString()}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={5}>
                <Paper variant="outlined" sx={{ p: 2, maxHeight: 480, overflowY: 'auto' }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Incident Timeline ({proctoringLogs.length})
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  {proctoringLogs.length === 0 ? (
                    <Typography variant="body2" color="textSecondary">No incidents recorded.</Typography>
                  ) : (
                    <Box display="flex" flexDirection="column" gap={1.5}>
                      {proctoringLogs.map((log, idx) => {
                        const rawOffsetSec = getOffsetForLog(log);
                        const seekTimeSec = Math.max(0, rawOffsetSec - 2);

                        return (
                          <Paper 
                            key={log.id || idx} 
                            variant="outlined" 
                            sx={{ 
                              p: 1.5, 
                              cursor: 'pointer', 
                              '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' } 
                            }}
                            onClick={() => handleJumpToTime(seekTimeSec)}
                          >
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                              <Chip 
                                size="small" 
                                label={log.event_type} 
                                color={log.event_type.includes('exit') || log.event_type.includes('spike') || log.event_type.includes('face') ? 'error' : 'warning'} 
                              />
                              <Typography variant="caption" color="primary" fontWeight="bold">
                                Jump to {Math.floor(seekTimeSec / 60)}m {seekTimeSec % 60}s
                              </Typography>
                            </Box>
                          </Paper>
                        );
                      })}
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          )}
        </Paper>
      )}

      {/* Evidence Modal */}
      <Modal
        open={!!selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500,
          },
        }}
      >
        <Fade in={!!selectedEvidence}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: 24,
            p: 1,
            bgcolor: 'background.paper',
            outline: 'none',
            maxWidth: '90vw',
            maxHeight: '90vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {selectedEvidence && (
              <audio 
                src={selectedEvidence} 
                controls
                autoPlay
                style={{ maxWidth: '100%' }} 
              />
            )}
          </Box>
        </Fade>
      </Modal>

      {/* Whiteboard Modal */}
      <Modal
        open={!!selectedWhiteboard}
        onClose={() => setSelectedWhiteboard(null)}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{ backdrop: { timeout: 500 } }}
      >
        <Fade in={!!selectedWhiteboard}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: 24,
            p: 1,
            bgcolor: '#fff',
            outline: 'none',
            maxWidth: '90vw',
            maxHeight: '90vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 2
          }}>
            {selectedWhiteboard && (
              <img 
                src={selectedWhiteboard} 
                alt="Candidate Drawing"
                style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' }}
              />
            )}
          </Box>
        </Fade>
      </Modal>

      {/* Action Footer */}
      <Paper elevation={0} sx={{ p: 3, mt: 4, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="body2" color="textSecondary" sx={{ maxWidth: '460px' }}>
            💡 <strong>Save</strong> stores marks and feedback for this candidate. Click <strong>"Publish"</strong> on the Submissions dashboard when you are ready to release all results to candidates.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined" 
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(`/exams/${submission.exam}/submissions`)}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Back to Submissions
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3.5, bgcolor: '#0F172A', '&:hover': { bgcolor: '#020617' } }}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default GradingPage;
