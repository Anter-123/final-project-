import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "https://final-project-izjy.vercel.app/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach JWT Token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle global errors (e.g. 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Token expired or invalid
      if (error.response.status === 401) {
        localStorage.removeItem("token");
        // We let the auth context know or trigger a redirect by dispatching a custom event
        window.dispatchEvent(new Event("unauthorized"));
      }
      
      const errorMessage = error.response.data?.message || "An unexpected error occurred.";
      return Promise.reject(new Error(errorMessage));
    }
    return Promise.reject(new Error("Network connection error. Please try again."));
  }
);

export default api;
