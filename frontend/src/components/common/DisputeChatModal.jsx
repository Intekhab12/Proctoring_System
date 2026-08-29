import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography,
  TextField, IconButton, Button, Chip, Avatar, CircularProgress, Alert,
  Tooltip, Paper
} from '@mui/material';
import {
  Send as SendIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Replay as ReplayIcon,
  Quiz as QuizIcon,
  School as SchoolIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import examService from '../../api/examService';

const DisputeChatModal = ({ open, onClose, dispute: initialDispute, onDisputeUpdated }) => {
  const { user } = useContext(AuthContext);
  const [dispute, setDispute] = useState(initialDispute);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadDisputeData = React.useCallback(async (disputeId) => {
    try {
      setLoading(true);
      setError('');
      const res = await examService.getDisputeDetail(disputeId);
      const data = res.data;
      setDispute(data);
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load dispute conversation:', err);
      if (initialDispute?.messages) {
        setDispute(initialDispute);
        setMessages(initialDispute.messages);
      } else {
        setError('Failed to load full message history.');
      }
    } finally {
      setLoading(false);
    }
  }, [initialDispute]);

  useEffect(() => {
    if (open && initialDispute?.id) {
      loadDisputeData(initialDispute.id);
    }
  }, [open, initialDispute?.id, loadDisputeData]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || sending || !dispute?.id) return;

    try {
      setSending(true);
      setError('');
      const res = await examService.sendDisputeMessage(dispute.id, text);
      setInputText('');
      
      const newMsg = res.data.message;
      const updatedDispute = res.data.dispute;

      if (updatedDispute) {
        setDispute(updatedDispute);
        setMessages(updatedDispute.messages || [...messages, newMsg]);
        if (onDisputeUpdated) onDisputeUpdated(updatedDispute);
      } else {
        setMessages(prev => [...prev, newMsg]);
      }
    } catch (err) {
      console.error('Failed to send dispute message:', err);
      setError(err.response?.data?.error || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleToggleStatus = async (newStatus) => {
    if (!dispute?.id || statusUpdating) return;
    try {
      setStatusUpdating(true);
      const res = await examService.updateDisputeStatus(dispute.id, newStatus);
      setDispute(res.data);
      if (res.data.messages) {
        setMessages(res.data.messages);
      }
      if (onDisputeUpdated) onDisputeUpdated(res.data);
    } catch (err) {
      console.error('Failed to update dispute status:', err);
      alert(err.response?.data?.error || 'Failed to update dispute status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'open':
        return <Chip label="Open" color="warning" size="small" sx={{ fontWeight: 600 }} />;
      case 'in_progress':
        return <Chip label="In Progress" color="info" size="small" sx={{ fontWeight: 600 }} />;
      case 'resolved':
        return <Chip label="Resolved" color="success" size="small" sx={{ fontWeight: 600 }} />;
      case 'closed':
        return <Chip label="Closed" size="small" sx={{ fontWeight: 600 }} />;
      default:
        return <Chip label={status || 'Open'} size="small" sx={{ fontWeight: 600 }} />;
    }
  };

  const isCurrentUserMessage = (msg) => {
    if (!user) return false;
    if (msg.sender === user.id) return true;
    if (msg.sender_email && msg.sender_email.toLowerCase() === user.email.toLowerCase()) return true;
    return false;
  };

  const isExaminer = user?.is_examiner;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          height: '80vh',
          maxHeight: '750px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
        }
      }}
    >
      {/* Chat Header */}
      <DialogTitle sx={{ 
        p: 2, 
        bgcolor: '#1e293b', 
        color: '#ffffff',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <Box display="flex" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
          <Avatar sx={{ bgcolor: isExaminer ? '#0F172A' : '#10b981', width: 42, height: 42 }}>
            {isExaminer ? <SchoolIcon /> : <PersonIcon />}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
                {dispute?.exam_title || 'Exam Dispute'}
              </Typography>
              {getStatusChip(dispute?.status)}
            </Box>
            <Box display="flex" alignItems="center" gap={1} mt={0.5}>
              <Chip 
                icon={<QuizIcon sx={{ fontSize: '14px !important' }} />}
                label={dispute?.question_text ? `Question: ${dispute.question_text.slice(0, 40)}...` : 'Overall Exam'}
                size="small"
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.15)', 
                  color: '#e2e8f0', 
                  fontSize: '0.75rem',
                  maxWidth: '300px'
                }}
              />
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                Raised by: <strong>{dispute?.raised_by_name || dispute?.raised_by_email || 'Candidate'}</strong>
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          {dispute?.status === 'resolved' ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<ReplayIcon fontSize="small" />}
              onClick={() => handleToggleStatus('in_progress')}
              disabled={statusUpdating}
              sx={{ 
                color: '#38bdf8', 
                borderColor: '#38bdf8', 
                fontSize: '0.75rem',
                textTransform: 'none',
                '&:hover': { borderColor: '#7dd3fc', bgcolor: 'rgba(56,189,248,0.1)' }
              }}
            >
              Reopen
            </Button>
          ) : (
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon fontSize="small" />}
              onClick={() => handleToggleStatus('resolved')}
              disabled={statusUpdating}
              sx={{ fontSize: '0.75rem', textTransform: 'none', fontWeight: 600 }}
            >
              Resolve
            </Button>
          )}

          <IconButton onClick={onClose} sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Chat Messages Feed */}
      <DialogContent 
        sx={{ 
          p: 2.5, 
          bgcolor: '#f8fafc', 
          flexGrow: 1, 
          overflowY: 'auto',
          backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5
        }}
      >
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress size={32} />
          </Box>
        ) : messages.length === 0 ? (
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" color="text.secondary">
            <Typography variant="body2">No messages in this dispute thread yet.</Typography>
            <Typography variant="caption" color="textSecondary">Send a message below to start the conversation.</Typography>
          </Box>
        ) : (
          messages.map((msg, index) => {
            const isMe = isCurrentUserMessage(msg);
            const formattedTime = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const formattedDate = msg.created_at ? new Date(msg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';

            return (
              <Box
                key={msg.id || index}
                sx={{
                  display: 'flex',
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end',
                  gap: 1,
                  mb: 0.5
                }}
              >
                {!isMe && (
                  <Tooltip title={msg.sender_name || (msg.is_examiner ? 'Examiner' : 'Candidate')}>
                    <Avatar 
                      src={msg.sender_profile_picture ? (msg.sender_profile_picture.startsWith('http') ? msg.sender_profile_picture : `${import.meta.env.VITE_API_URL}${msg.sender_profile_picture}`) : ''}
                      sx={{ 
                        width: 32, 
                        height: 32, 
                        bgcolor: msg.is_examiner ? '#0F172A' : '#059669',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      {msg.sender_name ? msg.sender_name[0].toUpperCase() : (msg.is_examiner ? 'E' : 'C')}
                    </Avatar>
                  </Tooltip>
                )}

                <Box
                  sx={{
                    maxWidth: { xs: '85%', sm: '70%' },
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start'
                  }}
                >
                  {!isMe && (
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem', ml: 1, mb: 0.25, fontWeight: 600 }}>
                      {msg.sender_name || (msg.is_examiner ? 'Examiner' : 'Candidate')} {msg.is_examiner ? '(Examiner)' : ''}
                    </Typography>
                  )}

                  <Paper
                    elevation={0}
                    sx={{
                      p: '10px 14px',
                      borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                      bgcolor: isMe ? '#2563eb' : '#ffffff',
                      color: isMe ? '#ffffff' : '#1e293b',
                      border: isMe ? 'none' : '1px solid #e2e8f0',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                      position: 'relative'
                    }}
                  >
                    <Typography variant="body2" sx={{ fontSize: '0.9rem', lineHeight: 1.45 }}>
                      {msg.message}
                    </Typography>
                    
                    <Box 
                      display="flex" 
                      justifyContent="flex-end" 
                      alignItems="center" 
                      gap={0.5} 
                      mt={0.5}
                      sx={{ opacity: 0.8 }}
                    >
                      <Typography variant="caption" sx={{ fontSize: '0.68rem', color: isMe ? 'rgba(255,255,255,0.85)' : '#94a3b8' }}>
                        {formattedDate} {formattedTime}
                      </Typography>
                    </Box>
                  </Paper>
                </Box>
              </Box>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </DialogContent>

      {/* Chat Input Bar */}
      <DialogActions sx={{ p: 2, bgcolor: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 1 }}>
        <TextField
          placeholder={dispute?.status === 'resolved' ? "Dispute is resolved. Send a message to reopen & reply..." : "Type your message here..."}
          fullWidth
          size="small"
          multiline
          maxRows={3}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '24px',
              bgcolor: '#f1f5f9',
              px: 2,
              '& fieldset': { borderColor: 'transparent' },
              '&:hover fieldset': { borderColor: '#cbd5e1' },
              '&.Mui-focused fieldset': { borderColor: '#2563eb' }
            }
          }}
        />
        <IconButton 
          color="primary" 
          onClick={handleSendMessage} 
          disabled={!inputText.trim() || sending}
          sx={{ 
            bgcolor: inputText.trim() ? '#2563eb' : '#e2e8f0',
            color: '#ffffff !important',
            width: 42,
            height: 42,
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: '#1d4ed8'
            },
            '&.Mui-disabled': {
              bgcolor: '#e2e8f0',
              color: '#94a3b8 !important'
            }
          }}
        >
          {sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon fontSize="small" />}
        </IconButton>
      </DialogActions>
    </Dialog>
  );
};

export default DisputeChatModal;
