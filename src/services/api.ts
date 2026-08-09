"use client";

import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the stored JWT (if any) to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export const authApi = {
  register: (payload: { name: string; email: string; password: string }) =>
    api.post<{ success: boolean; message: string; data: { user: AuthUser } }>(
      '/auth/register',
      payload
    ),

  login: (payload: { email: string; password: string }) =>
    api.post<{
      success: boolean;
      message: string;
      data: { token: string; user: AuthUser };
    }>('/auth/login', payload),

  getMe: () =>
    api.get<{ success: boolean; message: string; data: { user: AuthUser } }>(
      '/auth/me'
    ),
};

export const transportApi = {
  getRoutes: (params: Record<string, unknown>) =>
    api.get('/transport/routes', { params }),

  getPredictions: (routeId: string) =>
    api.get(`/transport/predict/${routeId}`),
};

export const weatherApi = {
  getWeather: (city: string) =>
    api.get(`/weather/${city}`),
};

export const aiApi = {
  chat: (message: string) =>
    api.post('/gemini/chat', { message }),
  status: () =>
    api.get('/gemini/status'),
};

export const tripsApi = {
  getTrips: () =>
    api.get('/trips'),

  bookTrip: (trip: Record<string, unknown>) =>
    api.post('/trips/book', trip),

  deleteTrip: (id: string) =>
    api.delete(`/trips/${id}`),
};

export const healthApi = {
  getStatus: () =>
    api.get('/health'),
};

export default api;
