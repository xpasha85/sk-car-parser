import axios from 'axios';

export const api = axios.create({
  baseURL: '/api', // Vite прокси перенаправит это на localhost:8000
});

// Автоматически добавляем токен (пароль) в заголовки
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sk_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});