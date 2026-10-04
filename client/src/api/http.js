import axios from 'axios';

/**
 * Shared axios instance.
 * `withCredentials` sends the httpOnly auth cookie; the token itself is never
 * visible to JavaScript, which protects it from XSS.
 */
const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 20000,
});

/**
 * Normalises every failure into an Error whose message is safe to show to
 * the user, and keeps status/details for callers that need them.
 */
http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const body = error.response?.data;
    let message = body?.message;
    if (!message) {
      message = error.code === 'ECONNABORTED' ? 'The server took too long to respond' : 'Network error, please try again';
    }
    const normalised = new Error(message);
    normalised.status = status;
    normalised.details = body?.details;
    return Promise.reject(normalised);
  },
);

export default http;
