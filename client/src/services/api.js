import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5002/api",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — but not for the auth endpoints themselves, where
// the caller (Login form / AuthContext bootstrap) already renders the error.
// Otherwise a bad-password 401 force-reloads /login before the form can
// display "Invalid email or password".
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isAuthCall = url.startsWith("/auth/");
    if (error.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
