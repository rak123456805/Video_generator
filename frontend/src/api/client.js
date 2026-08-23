import axios from "axios";
import { supabase } from "../lib/supabaseClient";

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

/**
 * Request interceptor: attach Supabase access token to every request.
 * If no session exists, the request proceeds without the header
 * (backend optional-auth middleware handles this gracefully).
 */
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch {
      // Non-fatal — proceed without auth header
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
