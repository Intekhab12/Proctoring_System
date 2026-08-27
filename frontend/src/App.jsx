import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import Navbar from './components/common/Navbar';
import PrivateRoute from './components/common/PrivateRoute';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import Dashboard from './components/Dashboard';
import Profile from './components/profile/Profile';
import ExamDashboard from './components/exam/ExamDashboard';
import CreateExamWizard from './components/exam/CreateExamWizard';
import ExamDetail from './components/exam/ExamDetail';
import RegisterExam from './components/candidate/RegisterExam';
import TakeExam from './components/candidate/TakeExam';
import SubmissionsList from './components/exam/SubmissionsList';
import GradingPage from './components/exam/GradingPage';
import MyTests from './components/candidate/MyTests';
import CandidateResults from './components/candidate/CandidateResults';
import MyDisputes from './components/candidate/MyDisputes';
import DisputesList from './components/exam/DisputesList';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f4f6f8'
    }
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Navbar />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/exams" element={<PrivateRoute><ExamDashboard /></PrivateRoute>} />
            <Route path="/exams/create" element={<PrivateRoute><CreateExamWizard /></PrivateRoute>} />
            <Route path="/exams/:id" element={<PrivateRoute><ExamDetail /></PrivateRoute>} />
            <Route path="/exam/register/:examId" element={<RegisterExam />} />
            <Route path="/exam/take/:examId" element={<PrivateRoute><TakeExam /></PrivateRoute>} />
            <Route path="/exams/:id/submissions" element={<PrivateRoute><SubmissionsList /></PrivateRoute>} />
            <Route path="/submissions/:submissionId" element={<PrivateRoute><GradingPage /></PrivateRoute>} />
            <Route path="/my-tests" element={<PrivateRoute><MyTests /></PrivateRoute>} />
            <Route path="/candidate-results/:submissionId" element={<PrivateRoute><CandidateResults /></PrivateRoute>} />
            <Route path="/my-disputes" element={<PrivateRoute><MyDisputes /></PrivateRoute>} />
            <Route path="/exams/:examId/disputes" element={<PrivateRoute><DisputesList /></PrivateRoute>} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
