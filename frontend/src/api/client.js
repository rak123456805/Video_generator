import axios from "axios";

const apiClient = axios.create({
  // Use environment variable for API URL in production
  baseURL: (import.meta.env.VITE_API_URL || "http://localhost:5000") + "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 0, // IMPORTANT: long video generation
});

export default apiClient;
