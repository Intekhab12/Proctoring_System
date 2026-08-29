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
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    subtitle1: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#0F172A',
      light: '#334155',
      dark: '#020617',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#E11D48',
      light: '#FFE4E6',
      dark: '#9F1239',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#10B981',
      light: '#ECFDF5',
      dark: '#059669',
    },
    warning: {
      main: '#F59E0B',
      light: '#FFFBEB',
      dark: '#D97706',
    },
    error: {
      main: '#EF4444',
      light: '#FEF2F2',
      dark: '#DC2626',
    },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
    },
    divider: '#E2E8F0',
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          },
        },
        containedPrimary: {
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.25)',
          '&:hover': {
            backgroundColor: '#020617',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.4)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 8,
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        notchedOutline: {
          borderRadius: 8,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        rounded: {
          borderRadius: 8,
        },
      },
    },
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
