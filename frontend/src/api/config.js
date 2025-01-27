import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: parseInt(process.env.REACT_APP_API_TIMEOUT),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Перехватчик для обработки ошибок
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // Обработка ошибок от сервера
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      // Обработка ошибок сети
      console.error('Network Error:', error.request);
    } else {
      // Обработка других ошибок
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
