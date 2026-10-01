import axios from 'axios';
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from '../storage/authStorage';

// For local testing on a physical device, EXPO_PUBLIC_API_URL should be your machine's LAN IP
// E.g. http://192.168.1.100:5000/api
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
console.log('[API Client] Initializing with API_URL:', API_URL);

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach token and log
apiClient.interceptors.request.use(
  async (config) => {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL || ''}${config.url}`);
    if (config.data) {
      const payload = { ...config.data };
      if (payload.password) payload.password = '***';
      console.log(`[API Request Payload]`, JSON.stringify(payload, null, 2));
    }
    const token = await getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401s, token refresh, and log
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
    return response;
  },
  async (error) => {
    console.log(`[API Error] ${error.config?.method?.toUpperCase() || 'UNKNOWN'} ${error.config?.baseURL || ''}${error.config?.url || 'UNKNOWN'}`);
    console.log(`[API Error Details] Message: ${error.message}`);
    console.log(`[API Error Details] Code: ${error.code}`);
    if (error.response) {
      console.log(`[API Error Response Status] ${error.response.status}`);
      console.log(`[API Error Response Body]`, JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log(`[API Error Network] No response received from server. Request details:`, error.request);
    }
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await getRefreshToken();

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
            clientType: 'mobile',
          });

          if (res.data?.success && res.data?.tokens) {
            const { accessToken, refreshToken: newRefreshToken } = res.data.tokens;
            await saveTokens(accessToken, newRefreshToken);
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          await clearTokens();
          // Optionally dispatch a global event to redirect to login
          return Promise.reject(refreshError);
        }
      } else {
        await clearTokens();
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
