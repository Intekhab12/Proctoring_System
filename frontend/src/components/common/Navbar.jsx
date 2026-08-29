import React, { useContext, useState, useEffect } from 'react';
import { 
  AppBar, Toolbar, Typography, Button, Box, Avatar, IconButton, 
  Badge, Menu, MenuItem, ListItemText, ListItemIcon, Divider, Chip, Tooltip,
  Container
} from '@mui/material';
import { 
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Assignment as AssignmentIcon,
  HistoryEdu as HistoryEduIcon,
  QuestionAnswer as DisputeIcon,
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  DoneAll as DoneAllIcon,
  FiberManualRecord as UnreadDotIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import notificationService from '../../api/notificationService';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);

  useEffect(() => {
    if (user) {
      notificationService.getNotifications()
        .then(res => setNotifications(res.data))
        .catch(err => console.error("Failed to load notifications", err));
    }
  }, [user]);

  if (location.pathname.startsWith('/exam/take/')) {
    return null;
  }

  const handleLogout = () => {
    setProfileAnchorEl(null);
    logout();
    navigate('/login');
  };

  const handleOpenNotifMenu = (event) => setNotifAnchorEl(event.currentTarget);
  const handleCloseNotifMenu = () => setNotifAnchorEl(null);

  const handleOpenProfileMenu = (event) => setProfileAnchorEl(event.currentTarget);
  const handleCloseProfileMenu = () => setProfileAnchorEl(null);

  const handleNotificationClick = async (notif) => {
    handleCloseNotifMenu();
    if (!notif.is_read) {
      try {
        await notificationService.markAsRead(notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      } catch (err) {
        console.error("Failed to mark as read", err);
      }
    }
    if (notif.link) {
      if (window.location.pathname === notif.link) {
        window.location.reload();
      } else {
        navigate(notif.link);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadList = notifications.filter(n => !n.is_read);
      await Promise.all(unreadList.map(n => notificationService.markAsRead(n.id)));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const isActive = (path) => {
    if (path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard')) return true;
    return location.pathname.startsWith(path);
  };

  return (
    <AppBar 
      position="sticky" 
      elevation={0}
      sx={{ 
        bgcolor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        color: '#0F172A',
        backdropFilter: 'blur(8px)'
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: '68px', px: 2, display: 'flex', justifyContent: 'space-between' }}>
          {/* Brand Logo & Title */}
          <Box 
            display="flex" 
            alignItems="center" 
            gap={1.2} 
            sx={{ cursor: 'pointer' }} 
            onClick={() => navigate('/dashboard')}
          >
            <Box 
              sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: 1, 
                background: 'linear-gradient(135deg, #1C1917 0%, #09090B 100%)', 
                border: '1.5px solid #EF4444',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 0 14px rgba(239, 68, 68, 0.45), inset 0 0 6px rgba(239, 68, 68, 0.2)'
              }}
            >
              <SecurityIcon sx={{ color: '#EF4444', fontSize: 23, filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.8))' }} />
            </Box>
            <Box display="flex" alignItems="baseline" gap={0.8}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 800, 
                  letterSpacing: '-0.02em',
                  color: '#0F172A',
                  fontSize: '1.2rem'
                }}
              >
                Proctor<Box 
                  component="span" 
                  sx={{ 
                    background: 'linear-gradient(135deg, #FDA4AF 0%, #F43F5E 35%, #E11D48 70%, #BE123C 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    display: 'inline-block',
                    fontWeight: 900,
                    filter: 'drop-shadow(0 1px 2px rgba(225,29,72,0.35))'
                  }}
                >
                  Buddy
                </Box>
              </Typography>
            </Box>
          </Box>

          {/* Navigation Links & User Controls */}
          {user ? (
            <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 2 }}>
              {/* Primary Navigation Pills */}
              <Box display={{ xs: 'none', md: 'flex' }} alignItems="center" gap={1}>
                <Button 
                  startIcon={<DashboardIcon sx={{ fontSize: 18 }} />}
                  onClick={() => navigate('/dashboard')}
                  sx={{ 
                    color: '#0F172A',
                    bgcolor: isActive('/dashboard') ? '#F1F5F9' : 'transparent',
                    fontWeight: isActive('/dashboard') ? 700 : 500,
                    px: 1.8,
                    py: 0.8,
                    borderRadius: 1,
                    '&:hover': { bgcolor: '#E2E8F0', color: '#0F172A' }
                  }}
                >
                  Dashboard
                </Button>

                {user?.is_examiner && (
                  <Button 
                    startIcon={<AssignmentIcon sx={{ fontSize: 18 }} />}
                    onClick={() => navigate('/exams')}
                    sx={{ 
                      color: '#0F172A',
                      bgcolor: isActive('/exams') ? '#F1F5F9' : 'transparent',
                      fontWeight: isActive('/exams') ? 700 : 500,
                      px: 1.8,
                      py: 0.8,
                      borderRadius: 1,
                      '&:hover': { bgcolor: '#E2E8F0', color: '#0F172A' }
                    }}
                  >
                    Exams
                  </Button>
                )}

                {user?.is_candidate && (
                  <>
                    <Button 
                      startIcon={<HistoryEduIcon sx={{ fontSize: 18 }} />}
                      onClick={() => navigate('/my-tests')}
                      sx={{ 
                        color: '#0F172A',
                        bgcolor: isActive('/my-tests') ? '#F1F5F9' : 'transparent',
                        fontWeight: isActive('/my-tests') ? 700 : 500,
                        px: 1.8,
                        py: 0.8,
                        borderRadius: 1,
                        '&:hover': { bgcolor: '#E2E8F0', color: '#0F172A' }
                      }}
                    >
                      My Tests
                    </Button>
                    <Button 
                      startIcon={<DisputeIcon sx={{ fontSize: 18 }} />}
                      onClick={() => navigate('/my-disputes')}
                      sx={{ 
                        color: '#0F172A',
                        bgcolor: isActive('/my-disputes') ? '#F1F5F9' : 'transparent',
                        fontWeight: isActive('/my-disputes') ? 700 : 500,
                        px: 1.8,
                        py: 0.8,
                        borderRadius: 1,
                        '&:hover': { bgcolor: '#E2E8F0', color: '#0F172A' }
                      }}
                    >
                      Disputes
                    </Button>
                  </>
                )}
              </Box>

              <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1.5, display: { xs: 'none', md: 'block' } }} />

              {/* Notification Center */}
              <Tooltip title="Notifications">
                <IconButton 
                  onClick={handleOpenNotifMenu}
                  sx={{ 
                    bgcolor: notifAnchorEl ? '#F1F5F9' : 'transparent',
                    border: '1px solid #E2E8F0',
                    borderRadius: 1,
                    p: 1
                  }}
                >
                  <Badge 
                    badgeContent={unreadCount} 
                    color="error"
                    sx={{ '& .MuiBadge-badge': { fontWeight: 700, fontSize: '0.7rem' } }}
                  >
                    <NotificationsIcon sx={{ color: '#475569', fontSize: 20 }} />
                  </Badge>
                </IconButton>
              </Tooltip>

              <Menu
                anchorEl={notifAnchorEl}
                open={Boolean(notifAnchorEl)}
                onClose={handleCloseNotifMenu}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{ 
                  sx: { 
                    maxHeight: 460, 
                    width: 360,
                    borderRadius: 2,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    border: '1px solid #E2E8F0',
                    mt: 1.2
                  } 
                }}
              >
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" fontWeight="700">Notifications</Typography>
                  {unreadCount > 0 && (
                    <Button 
                      size="small" 
                      startIcon={<DoneAllIcon sx={{ fontSize: 16 }} />} 
                      onClick={handleMarkAllAsRead}
                      sx={{ textTransform: 'none', fontSize: '0.78rem', py: 0.3 }}
                    >
                      Mark all read
                    </Button>
                  )}
                </Box>
                <Divider />
                {notifications.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="textSecondary">No notifications yet.</Typography>
                  </Box>
                ) : (
                  notifications.slice(0, 15).map(notif => (
                    <MenuItem 
                      key={notif.id} 
                      onClick={() => handleNotificationClick(notif)}
                      sx={{ 
                        py: 1.5,
                        px: 2,
                        backgroundColor: notif.is_read ? 'transparent' : '#F8FAFC',
                        borderLeft: notif.is_read ? '3px solid transparent' : '3px solid #0F172A',
                        '&:hover': { bgcolor: '#F1F5F9' }
                      }}
                    >
                      <ListItemText 
                        primary={
                          <Box display="flex" alignItems="center" gap={0.8}>
                            {!notif.is_read && <UnreadDotIcon sx={{ fontSize: 8, color: '#0F172A' }} />}
                            <Typography variant="body2" fontWeight={notif.is_read ? 500 : 700} color="#0F172A">
                              {notif.title}
                            </Typography>
                          </Box>
                        } 
                        secondary={
                          <Typography variant="caption" color="#64748B" sx={{ display: 'block', mt: 0.3 }}>
                            {notif.message}
                          </Typography>
                        } 
                      />
                    </MenuItem>
                  ))
                )}
              </Menu>

              {/* User Profile Trigger */}
              <Box 
                onClick={handleOpenProfileMenu}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1.2, 
                  cursor: 'pointer',
                  p: 0.6,
                  pr: 1.5,
                  borderRadius: 1,
                  border: '1px solid #E2E8F0',
                  bgcolor: profileAnchorEl ? '#F1F5F9' : '#FFFFFF',
                  transition: 'all 0.2s ease',
                  '&:hover': { bgcolor: '#F8FAFC', borderColor: '#CBD5E1' }
                }}
              >
                <Avatar 
                  src={user.profile_picture ? (user.profile_picture.startsWith('http') ? user.profile_picture : `${import.meta.env.VITE_API_URL}${user.profile_picture}`) : ''}
                  sx={{ 
                    width: 32, 
                    height: 32, 
                    bgcolor: '#0F172A', 
                    fontSize: '0.85rem',
                    fontWeight: 700
                  }}
                >
                  {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
                </Avatar>
                <Typography variant="body2" fontWeight="600" color="#0F172A" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  {user.full_name || user.handle || user.email?.split('@')[0]}
                </Typography>
              </Box>

              {/* Profile Dropdown Popover */}
              <Menu
                anchorEl={profileAnchorEl}
                open={Boolean(profileAnchorEl)}
                onClose={handleCloseProfileMenu}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{ 
                  sx: { 
                    width: 240,
                    borderRadius: 2,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    border: '1px solid #E2E8F0',
                    mt: 1.2,
                    p: 0.5
                  } 
                }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight="700" color="#0F172A" noWrap>
                    {user.full_name || 'User'}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" noWrap sx={{ display: 'block', mb: 1 }}>
                    {user.email}
                  </Typography>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {user.is_examiner && <Chip label="Examiner" size="small" color="primary" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }} />}
                    {user.is_candidate && <Chip label="Candidate" size="small" color="secondary" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }} />}
                  </Box>
                </Box>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={() => { handleCloseProfileMenu(); navigate('/profile'); }} sx={{ borderRadius: 1, py: 1 }}>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" sx={{ color: '#475569' }} />
                  </ListItemIcon>
                  <ListItemText primary={<Typography variant="body2" fontWeight="500">My Profile</Typography>} />
                </MenuItem>
                <MenuItem onClick={handleLogout} sx={{ borderRadius: 1, py: 1, color: 'error.main' }}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
                  </ListItemIcon>
                  <ListItemText primary={<Typography variant="body2" fontWeight="600" color="error.main">Logout</Typography>} />
                </MenuItem>
              </Menu>
            </Box>
          ) : (
            <Box display="flex" gap={1.5}>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/login')}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1 }}
              >
                Sign In
              </Button>
              <Button 
                variant="contained" 
                onClick={() => navigate('/signup')}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1 }}
              >
                Sign Up
              </Button>
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
