/**
 * frontend/src/api/googleDriveApi.ts
 *
 * Client-side API helpers for Google Drive connection management.
 *
 * SECURITY:
 * - All requests send the Supabase access token as Authorization: Bearer.
 * - Responses NEVER contain refresh_token, client_secret, or any OAuth credential.
 * - connectGoogleDrive() fetches the OAuth URL as JSON (with Auth header),
 *   then navigates — so the Supabase token never appears in a browser redirect URL.
 */

import { Session } from "@supabase/supabase-js";

const getBaseUrl = (): string => {
  let url = (import.meta as any).env.VITE_API_URL || "http://localhost:5000";
  if (url.endsWith("/")) url = url.slice(0, -1);
  return url;
};

/** Build Authorization header from Supabase session */
function authHeaders(session: Session): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

export interface DriveStatus {
  connected: boolean;
  expired?: boolean;
  googleEmail?: string;
  driveFolderPath?: string;
  connectedAt?: string;
  message?: string;
}

/**
 * Fetch the Google Drive connection status for the current user.
 */
export async function getDriveStatus(session: Session): Promise<DriveStatus> {
  const res = await fetch(`${getBaseUrl()}/api/google-drive/status`, {
    method: "GET",
    headers: authHeaders(session),
  });

  if (!res.ok) {
    throw new Error(`Drive status request failed: ${res.status}`);
  }

  const data = await res.json();
  return data;
}

/**
 * Initiate Google Drive OAuth connection.
 *
 * Fetches the Google auth URL from the backend (with Authorization header),
 * then navigates the browser there. This avoids having the Supabase token
 * in the browser's navigation bar or URL history.
 */
export async function connectGoogleDrive(session: Session): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/api/google-drive/connect-url`, {
    method: "GET",
    headers: authHeaders(session),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to start Google Drive connection: ${res.status}`);
  }

  const { authUrl } = await res.json();
  if (!authUrl) throw new Error("No auth URL returned from backend.");

  // Navigate to Google's OAuth consent screen
  window.location.href = authUrl;
}

/**
 * Disconnect Google Drive for the current user.
 * Backend revokes the Google token and removes the DB row.
 */
export async function disconnectGoogleDrive(session: Session): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/api/google-drive/disconnect`, {
    method: "POST",
    headers: authHeaders(session),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Disconnect failed: ${res.status}`);
  }
}
