import React, { createContext, useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          await fetchUserProfile();
        }
      } catch (error) {
        logout();
      }
    }
    setLoading(false);
  };

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('/api/users/me/');
      setUser(response.data);
    } catch (error) {
      console.error("Failed to fetch user profile", error);
    }
  };

  const login = async (email, password) => {
    const response = await axiosInstance.post('/api/auth/login/', { email, password });
    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);
    await fetchUserProfile();
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, fetchUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
