import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default {
  fetchUsers() {
    return apiClient.post('/users/fetch');
  },

  getUsers(page = 1, limit = 25, filters = {}) {
    const params = { page, limit };
    
    if (filters.name) params.name = filters.name;
    if (filters.email) params.email = filters.email;
    if (filters.city) params.city = filters.city;

    return apiClient.get('/users', { params });
  },

  updateUser(uuid, userData) {
    return apiClient.put(`/users/${uuid}`, userData);
  }
};