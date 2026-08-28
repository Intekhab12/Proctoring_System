import React, { useContext, useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Avatar, IconButton, Badge, Menu, MenuItem, ListItemText } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import notificationService from '../../api/notificationService';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);

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
    logout();
    navigate('/login');
  };

  const handleOpenMenu = (event) => setAnchorEl(event.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  const handleNotificationClick = async (notif) => {
    handleCloseMenu();
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

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, cursor: 'pointer', textAlign: 'left' }} onClick={() => navigate('/')}>
          Proctoring System
        </Typography>
        {user ? (
          <Box display="flex" alignItems="center" gap={2}>
            {user?.is_examiner && (
              <Button color="inherit" onClick={() => navigate('/exams')}>Exams</Button>
            )}
            {user?.is_candidate && (
              <>
                <Button color="inherit" onClick={() => navigate('/my-tests')}>My Tests</Button>
                <Button color="inherit" onClick={() => navigate('/my-disputes')}>My Disputes</Button>
              </>
            )}
            
            <IconButton color="inherit" onClick={handleOpenMenu}>
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleCloseMenu}
              PaperProps={{ style: { maxHeight: 400, width: '30ch' } }}
            >
              {notifications.length === 0 ? (
                <MenuItem onClick={handleCloseMenu}>No notifications</MenuItem>
              ) : (
                notifications.map(notif => (
                  <MenuItem 
                    key={notif.id} 
                    onClick={() => handleNotificationClick(notif)}
                    sx={{ backgroundColor: notif.is_read ? 'transparent' : 'action.hover' }}
                  >
                    <ListItemText 
                      primary={notif.title} 
                      secondary={notif.message} 
                      primaryTypographyProps={{ fontWeight: notif.is_read ? 'normal' : 'bold' }}
                    />
                  </MenuItem>
                ))
              )}
            </Menu>
            <Box display="flex" alignItems="center" gap={1} onClick={() => navigate('/profile')} sx={{ cursor: 'pointer' }}>
              <Avatar src={user.profile_picture ? (user.profile_picture.startsWith('http') ? user.profile_picture : `${import.meta.env.VITE_API_URL}${user.profile_picture}`) : ''}>
                {user.full_name ? user.full_name[0] : 'U'}
              </Avatar>
              <Typography variant="body1">{user.handle || user.full_name}</Typography>
            </Box>
            <Button color="inherit" onClick={handleLogout}>Logout</Button>
          </Box>
        ) : (
          <Box>
            <Button color="inherit" onClick={() => navigate('/login')}>Login</Button>
            <Button color="inherit" onClick={() => navigate('/signup')}>Sign Up</Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
