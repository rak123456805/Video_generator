import axios from "axios";

// Helper to clean up trailing slashes and ensure /api suffix
const getBaseURL = () => {
  let url = import.meta.env.VITE_API_URL || "http://localhost:5000";
  // Remove trailing slash if exists
  if (url.endsWith("/")) url = url.slice(0, -1);
  return `${url}/api`;
};

const apiClient = axios.create({
  baseURL: getBaseURL(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 0, // IMPORTANT: long video generation
});

export default apiClient;
