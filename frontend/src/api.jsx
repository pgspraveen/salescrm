// api.js = central place for all HTTP requests to Django backend
// axios = HTTP client library (like fetch but easier to use)
// Having all API calls here means: if backend URL changes, update only this file

import axios from 'axios';

// axios.create() = creates instance with default settings
// baseURL = prepended to every request URL automatically
const API = axios.create({ baseURL: 'http://localhost:8000/api' });

// interceptors.request = runs before EVERY request is sent
// Reads JWT token from localStorage and attaches to Authorization header
// Django checks this header to verify user identity
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');    // token stored after login
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;  // Bearer = standard JWT prefix
    }
    return config;
});

// AUTH
export const registerUser = (data) => API.post('/register/', data);
export const loginUser    = (data) => API.post('/login/', data);

// CUSTOMERS - CRUD
// data = object with customer fields { name, email, company ... }
export const getCustomers   = (search = '') => API.get(`/customers/?search=${search}`);
export const createCustomer = (data)        => API.post('/customers/', data);
export const updateCustomer = (id, data)    => API.put(`/customers/${id}/`, data);
export const deleteCustomer = (id)          => API.delete(`/customers/${id}/`);

// DEALS - CRUD
export const getDeals   = (stage = '') => API.get(`/deals/?stage=${stage}`);
export const createDeal = (data)       => API.post('/deals/', data);
export const updateDeal = (id, data)   => API.put(`/deals/${id}/`, data);
export const deleteDeal = (id)         => API.delete(`/deals/${id}/`);

// ACTIVITIES - CRUD
// cid = customer id filter, did = deal id filter (both optional)
export const getActivities  = (cid, did) =>
    API.get(`/activities/?customer=${cid || ''}&deal=${did || ''}`);
export const createActivity = (data) => API.post('/activities/', data);
export const deleteActivity = (id)   => API.delete(`/activities/${id}/`);

// AI ENDPOINTS
export const predictDeal      = (id)       => API.get(`/ai/deal/${id}/predict/`);
export const predictChurn     = (id)       => API.get(`/ai/customer/${id}/churn/`);
export const getSalesInsights = (days = 30) => API.get(`/ai/sales-insights/?days=${days}`);