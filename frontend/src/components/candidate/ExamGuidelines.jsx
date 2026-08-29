import React, { useState } from 'react';
import { Box, Typography, Checkbox, FormControlLabel, Button, Paper, Divider } from '@mui/material';

const ExamGuidelines = ({ exam, onAccept }) => {
  const [accepted, setAccepted] = useState(false);

  return (
    <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', maxWidth: 800, mx: 'auto', mt: 4, mb: 4 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom align="center">
        {exam?.title ? `${exam.title} - Guidelines` : "Candidate Exam Guidelines"}
      </Typography>
      
      {exam?.description && (
        <Box sx={{ bgcolor: '#e3f2fd', p: 3, borderRadius: 2, mb: 3, mt: 3 }}>
          <Typography variant="subtitle1" color="primary.main" fontWeight="bold" gutterBottom>
            📝 Exam Description
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {exam.description}
          </Typography>
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />
      
      <Box sx={{ 
        maxHeight: '60vh', 
        overflowY: 'auto', 
        p: 2, 
        bgcolor: '#fafafa', 
        border: '1px solid #e0e0e0', 
        borderRadius: 2,
        mb: 3
      }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>📋 General Instructions</Typography>
        <Typography variant="body2" paragraph>
          <strong>Read Carefully</strong> – Please read all instructions carefully before starting the exam. Once you begin, the timer will start and cannot be paused.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Time Limit</strong> – The exam has a fixed duration. A countdown timer will be displayed at the top of your screen. The exam will automatically submit when time runs out.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Internet Connection</strong> – Ensure you have a stable internet connection throughout the exam. Any disconnection may affect your ability to save answers.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Browser Requirements</strong> – Use the latest version of Google Chrome or Microsoft Edge for the best experience. Other browsers may not support all proctoring features.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>No External Help</strong> – You are not permitted to seek help from any person, book, or online resource during the exam. All answers must be your own work.
        </Typography>

        <Typography variant="subtitle1" fontWeight="bold" gutterBottom mt={3}>🧭 Navigation & Exam Interface</Typography>
        <Typography variant="body2" paragraph>
          <strong>Question Palette (Sidebar)</strong> – On the left side of your screen, you will see a numbered grid representing all questions. This helps you track your progress:<br/>
          🟢 Green – You have answered this question.<br/>
          ⚪ White – You have not yet visited this question.<br/>
          🔵 Blue – You are currently viewing this question.<br/>
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Navigation</strong> – You can navigate between questions in two ways: Click the "Previous" and "Next" buttons at the bottom of the question area, or click any question number in the Question Palette to jump directly to that question.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Submitting the Exam</strong> – Once you have completed all questions, click the "Finish Exam" button. A confirmation dialog will appear – confirm only when you are ready to submit. Once submitted, you cannot change your answers.
        </Typography>

        <Typography variant="subtitle1" fontWeight="bold" gutterBottom mt={3}>✍️ Answering Questions</Typography>
        <Typography variant="body2" paragraph>
          <strong>Text Answers</strong> – For text-based questions, type your answer in the provided text box. There is no word limit unless specified in the question.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Whiteboard</strong> – For questions that require diagrams, drawings, or calculations, you will have access to a digital whiteboard. Use the drawing tools to sketch your answer. Your whiteboard submission will be saved along with your text answer.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Save Your Work</strong> – Your answers are saved automatically as you type.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>No Copy-Paste</strong> – Copy-pasting is disabled to maintain fairness. You must type your answers manually.
        </Typography>

        <Typography variant="subtitle1" fontWeight="bold" gutterBottom mt={3}>🎥 Proctoring & Monitoring</Typography>
        <Typography variant="body2" paragraph>
          <strong>Continuous Monitoring</strong> – Your exam session is being monitored through your webcam, microphone, and screen. This is to ensure a fair testing environment for all candidates.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Stay in Frame</strong> – You must remain visible in the camera frame at all times. Ensure your face is clearly visible and well-lit.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Single Person</strong> – Only the registered candidate should be present in the room. No other person is allowed to be visible in the camera frame.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>No Face Visible / Multiple Faces</strong> – If you leave the camera frame, or if more than one face is detected, a warning will be issued. Repeated violations may lead to automatic submission.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Audio Monitoring</strong> – Your microphone is being recorded. Talking, whispering, or any unusual audio spikes may trigger warnings. Please maintain silence throughout the exam.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Screen Monitoring</strong> – Your screen activity is being recorded. Switching tabs, opening new windows, or using other applications will be logged and may result in warnings.
        </Typography>

        <Typography variant="subtitle1" fontWeight="bold" gutterBottom mt={3}>🖥️ Technical Requirements</Typography>
        <Typography variant="body2" paragraph>
          <strong>Full Screen Mode</strong> – The exam will automatically enter full-screen mode. You are not permitted to exit full-screen during the exam. Repeated attempts to exit full-screen may result in automatic submission.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Mobile Devices</strong> – Keep all mobile devices, smartwatches, and other electronic devices away from your desk. They should be turned off or placed in another room.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>No Other Applications</strong> – Close all other applications, browser tabs, and windows before starting the exam.
        </Typography>

        <Typography variant="subtitle1" fontWeight="bold" gutterBottom mt={3}>⚠️ Violations & Consequences</Typography>
        <Typography variant="body2" paragraph>
          <strong>Proctoring Notifications</strong> – You will receive real-time alerts if environmental violations are detected (e.g., audio spikes, talking, leaving camera frame, or multiple faces). These are logged for examiner review.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Warning Limit (3 Strikes)</strong> – Tab switching, exiting full-screen mode, or switching to other application windows will directly increment your official warning count. Reaching <strong>3 warnings</strong> will result in immediate automatic submission of your exam.
        </Typography>

        <Typography variant="subtitle1" fontWeight="bold" gutterBottom mt={3}>🆘 Technical Support</Typography>
        <Typography variant="body2" paragraph>
          <strong>During Exam</strong> – If you face any technical issues during the exam (e.g., camera not working, page not loading), please contact your examiner immediately.
        </Typography>
      </Box>

      <Box display="flex" flexDirection="column" alignItems="center">
        <FormControlLabel
          control={<Checkbox checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />}
          label={<Typography fontWeight="bold">I have read and agree to all the exam guidelines.</Typography>}
          sx={{ mb: 3 }}
        />
        <Button 
          variant="contained" 
          color="primary" 
          size="large" 
          disabled={!accepted}
          onClick={onAccept}
          sx={{ py: 1.5, px: 4, fontSize: '1.1rem', fontWeight: 'bold' }}
        >
          Enter Full-Screen & Start Exam
        </Button>
      </Box>
    </Paper>
  );
};

export default ExamGuidelines;
