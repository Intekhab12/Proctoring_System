import axios from 'axios';

// Automatic environment detection
let defaultApiUrl = 'http://localhost:8000';
if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
  defaultApiUrl = 'https://proctorbuddy-backend.onrender.com';
}

const rawApiUrl = import.meta.env.VITE_API_URL || defaultApiUrl;
const apiUrl = rawApiUrl.replace(/\/+$/, '');

const axiosInstance = axios.create({
  baseURL: apiUrl,
});

// Add a request interceptor to include the JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
