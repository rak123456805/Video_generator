import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000, // ⏱️ allow long video generation (60s)
  withCredentials: false, // can be true later if auth is added
});

// Optional: global error logging (very useful)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error?.response || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
