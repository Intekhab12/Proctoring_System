import React, { useState, useContext, useEffect } from 'react';
import { Container, TextField, Button, Typography, Box, Avatar, Alert, Modal, Paper, Badge, IconButton, Dialog, DialogContent } from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import axiosInstance from '../../api/axiosInstance';
import { AuthContext } from '../../context/AuthContext';

const Profile = () => {
  const { user, fetchUserProfile, logout } = useContext(AuthContext);
  const [formData, setFormData] = useState({ full_name: '', contact_number: '', handle: '', institution: '' });
  const [profilePic, setProfilePic] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const [openModal, setOpenModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [imageModalOpen, setImageModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        contact_number: user.contact_number || '',
        handle: user.handle || '',
        institution: user.institution || ''
      });
    }
  }, [user]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.patch('/api/users/me/', formData);
      
      if (profilePic) {
        const data = new FormData();
        data.append('profile_picture', profilePic);
        await axiosInstance.post('/api/users/me/upload-picture/', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      await fetchUserProfile();
      setMessage('Profile updated successfully!');
      setError('');
    } catch (err) {
      setError('Error updating profile');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await axiosInstance.delete('/api/users/me/', { data: { password: deletePassword } });
      logout();
    } catch (err) {
      setError('Incorrect password or error deleting account.');
      setOpenModal(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box mt={4} display="flex" flexDirection="column" alignItems="center">
        <Typography variant="h4" gutterBottom>Profile</Typography>
        
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={
            <IconButton
              component="label"
              sx={{ backgroundColor: 'white', '&:hover': { backgroundColor: '#f0f0f0' } }}
              size="small"
            >
              <PhotoCamera fontSize="small" />
              <input type="file" hidden accept="image/*" onChange={(e) => setProfilePic(e.target.files[0])} />
            </IconButton>
          }
        >
          <Avatar 
            src={profilePic ? URL.createObjectURL(profilePic) : (user?.profile_picture ? (user.profile_picture.startsWith('http') ? user.profile_picture : `${import.meta.env.VITE_API_URL}${user.profile_picture}`) : '')}
            sx={{ width: 100, height: 100, mb: 2, cursor: 'pointer' }}
            onClick={() => {
              if (profilePic || user?.profile_picture) setImageModalOpen(true);
            }}
          >
            {user?.full_name ? user.full_name[0] : 'U'}
          </Avatar>
        </Badge>
        
        {message && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
        
        <Box component="form" onSubmit={handleUpdate} width="100%">
          <TextField fullWidth margin="normal" label="Email" value={user?.email || ''} disabled />
          <TextField fullWidth margin="normal" label="Full Name" name="full_name" value={formData.full_name} onChange={handleChange} required />
          <TextField fullWidth margin="normal" label="Contact Number" name="contact_number" value={formData.contact_number} onChange={handleChange} />
          <TextField fullWidth margin="normal" label="Handle" name="handle" value={formData.handle} onChange={handleChange} />
          <TextField fullWidth margin="normal" label="Institution" name="institution" value={formData.institution} onChange={handleChange} />
          

          
          <Button type="submit" fullWidth variant="contained" color="primary" sx={{ mt: 3, mb: 2 }}>Update Profile</Button>
          <Button fullWidth variant="outlined" color="error" onClick={() => setOpenModal(true)}>Delete Account</Button>
        </Box>
      </Box>

      <Modal open={openModal} onClose={() => setOpenModal(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400 }}>
          <Paper sx={{ p: 4 }}>
            <Typography variant="h6" color="error" gutterBottom>Confirm Account Deletion</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>This action is irreversible. Please enter your password to confirm.</Typography>
            <TextField fullWidth label="Password" type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
            <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
              <Button onClick={() => setOpenModal(false)}>Cancel</Button>
              <Button color="error" variant="contained" onClick={handleDeleteAccount}>Delete</Button>
            </Box>
          </Paper>
        </Box>
      </Modal>
      <Dialog open={imageModalOpen} onClose={() => setImageModalOpen(false)}>
        <DialogContent sx={{ p: 0 }}>
          <img 
            src={profilePic ? URL.createObjectURL(profilePic) : (user?.profile_picture ? (user.profile_picture.startsWith('http') ? user.profile_picture : `${import.meta.env.VITE_API_URL}${user.profile_picture}`) : '')} 
            alt="Profile" 
            style={{ width: '100%', height: 'auto', display: 'block' }} 
          />
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default Profile;
