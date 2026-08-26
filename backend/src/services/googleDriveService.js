/* src/services/googleDriveService.js
 *
 * All Google Drive API interactions:
 *  - OAuth2 client creation
 *  - Getting/refreshing access tokens from a stored encrypted refresh token
 *  - Creating or reusing the TextToVideo folder in the user's Drive
 *  - Uploading video files
 *  - Revoking Google authorization (on disconnect)
 *
 * SECURITY:
 * - Refresh tokens are ALWAYS decrypted in memory only.
 * - Access tokens are NEVER stored in the DB or returned to the frontend.
 * - No token is ever logged.
 */

import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { decrypt } from "./encryptionService.js";

const DRIVE_FOLDER_NAME = "TextToVideo";
const VIDEO_MIME_TYPE = "video/mp4";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

/**
 * Create and return a new Google OAuth2 client.
 */
export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Build the OAuth2 client from an encrypted refresh token.
 * Decrypts the token, sets credentials, and returns the configured client.
 */
export async function getAuthClientFromEncryptedToken(encryptedRefreshToken) {
  const oauth2Client = getOAuth2Client();
  const refreshToken = decrypt(encryptedRefreshToken);

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  // Request a fresh access token
  const { credentials } = await oauth2Client.refreshAccessToken();
  oauth2Client.setCredentials(credentials);

  return oauth2Client;
}

/**
 * Find an existing TextToVideo folder in the user's Drive, or create one.
 * Returns the folder ID.
 * Never creates duplicate folders.
 */
export async function getOrCreateTextToVideoFolder(oauth2Client) {
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  // Search for existing folder
  const res = await drive.files.list({
    q: `name = '${DRIVE_FOLDER_NAME}' and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0) {
    // Reuse existing folder
    return res.data.files[0].id;
  }

  // Create new folder
  const folder = await drive.files.create({
    requestBody: {
      name: DRIVE_FOLDER_NAME,
      mimeType: FOLDER_MIME_TYPE,
    },
    fields: "id",
  });

  console.log(`📁 Created Google Drive folder '${DRIVE_FOLDER_NAME}': ${folder.data.id}`);
  return folder.data.id;
}

/**
 * Upload a video file to the user's TextToVideo folder.
 * Returns the Drive file metadata: { id, webViewLink }.
 *
 * @param {object} oauth2Client  — authenticated OAuth2 client
 * @param {string} folderId      — Drive folder ID to upload into
 * @param {string} filePath      — absolute local path to the video file
 * @param {string} filename      — desired filename in Drive (e.g. "crash-python-final.mp4")
 */
export async function uploadVideoToDrive(oauth2Client, folderId, filePath, filename) {
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  if (!fs.existsSync(filePath)) {
    throw new Error(`Video file not found for Drive upload: ${filePath}`);
  }

  const fileSize = fs.statSync(filePath).size;
  console.log(`☁️  Uploading ${filename} (${(fileSize / 1024 / 1024).toFixed(2)} MB) to Google Drive...`);

  const res = await drive.files.create(
    {
      requestBody: {
        name: filename,
        parents: [folderId],
        mimeType: VIDEO_MIME_TYPE,
      },
      media: {
        mimeType: VIDEO_MIME_TYPE,
        body: fs.createReadStream(filePath),
      },
      fields: "id, webViewLink, name",
    },
    {
      // Resume-able upload for large files
      onUploadProgress: (evt) => {
        const pct = Math.round((evt.bytesRead / fileSize) * 100);
        if (pct % 25 === 0) {
          console.log(`  ↑ Drive upload: ${pct}%`);
        }
      },
    }
  );

  console.log(`✅ Drive upload complete: ${res.data.name} (${res.data.id})`);
  return {
    driveFileId: res.data.id,
    driveFileUrl: res.data.webViewLink,
    filename: res.data.name,
  };
}

/**
 * List all mp4 files in the user's TextToVideo Drive folder.
 *
 * @param {object} oauth2Client — authenticated OAuth2 client
 * @param {string} folderId — Drive folder ID
 */
export async function listVideosInDrive(oauth2Client, folderId) {
  try {
    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType = 'video/mp4' and trashed = false`,
      fields: "files(id, name, webViewLink, webContentLink, createdTime)",
      orderBy: "createdTime desc",
      spaces: "drive",
    });
    return res.data.files || [];
  } catch (err) {
    console.warn("⚠️ Failed to list files from Google Drive:", err.message);
    return [];
  }
}

/**
 * Download/stream file binary content directly from Google Drive.
 *
 * @param {object} oauth2Client — authenticated OAuth2 client
 * @param {string} fileId — Google Drive file ID
 */
export async function downloadFileAsStream(oauth2Client, fileId) {
  const drive = google.drive({ version: "v3", auth: oauth2Client });
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );
  return res.data;
}

/**
 * Revoke the Google OAuth authorization for this client.
 * Called when the user disconnects Google Drive.
 * Best-effort — does not throw on failure.
 */
export async function revokeGoogleToken(encryptedRefreshToken) {
  try {
    const oauth2Client = getOAuth2Client();
    const refreshToken = decrypt(encryptedRefreshToken);
    await oauth2Client.revokeToken(refreshToken);
    console.log("🔒 Google OAuth token revoked.");
  } catch (err) {
    // Non-fatal — token may already be expired or revoked
    console.warn("⚠️  Could not revoke Google token (may already be invalid):", err.message);
  }
}
