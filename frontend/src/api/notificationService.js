import axiosInstance from './axiosInstance';

const notificationService = {
  getNotifications: () => axiosInstance.get('/api/users/notifications/'),
  markAsRead: (id) => axiosInstance.patch(`/api/users/notifications/${id}/`, { is_read: true }),
};

export default notificationService;
