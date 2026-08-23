/* src/controllers/googleDriveController.js
 *
 * Handles all Google Drive OAuth + connection management endpoints.
 *
 * Routes (mounted at /api/google-drive):
 *   GET  /connect      — start OAuth flow (requires auth middleware)
 *   GET  /callback     — Google OAuth callback (no auth middleware, called by Google)
 *   GET  /status       — get connection status (requires auth middleware)
 *   POST /disconnect   — disconnect Drive (requires auth middleware)
 *
 * SECURITY:
 * - User ID is ALWAYS taken from req.user (verified Supabase JWT).
 * - The OAuth `state` param encodes userId + HMAC signature (tamper-proof).
 * - Refresh tokens are encrypted before storage and never returned to clients.
 * - No OAuth tokens appear in logs.
 */

import crypto from "crypto";
import { google } from "googleapis";
import {
  getOAuth2Client,
  getOrCreateTextToVideoFolder,
  getAuthClientFromEncryptedToken,
  revokeGoogleToken,
} from "../services/googleDriveService.js";
import { encrypt } from "../services/encryptionService.js";
import { supabaseAdmin } from "../config/supabaseAdmin.js";

/* ── Google Drive scopes ─────────────────────────────────────────────────── */
// drive.file: access only files created or opened by this app — narrowest practical scope
const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
];

/* ── State parameter helpers (HMAC-signed, tamper-proof) ─────────────────── */

const STATE_SECRET = process.env.GOOGLE_CLIENT_SECRET || "fallback-secret";

function buildState(userId) {
  const nonce = crypto.randomBytes(8).toString("hex");
  const payload = `${userId}|${nonce}`;
  const sig = crypto
    .createHmac("sha256", STATE_SECRET)
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

function parseState(stateParam) {
  try {
    const decoded = Buffer.from(stateParam, "base64url").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 3) return null;
    const [userId, nonce, sig] = parts;
    const expected = crypto
      .createHmac("sha256", STATE_SECRET)
      .update(`${userId}|${nonce}`)
      .digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null; // tampered
    }
    return userId;
  } catch {
    return null;
  }
}

/* ── Helper: Google OAuth2 userinfo API ──────────────────────────────────── */
function getGoogleOAuth2Api(auth) {
  return google.oauth2({ version: "v2", auth });
}

/* ── Controllers ─────────────────────────────────────────────────────────── */

/**
 * GET /api/google-drive/connect-url
 * Returns the Google OAuth URL as JSON so the frontend can fetch it
 * with an Authorization header and then navigate (avoids token in URL bar).
 * Requires: authenticate middleware (req.user set).
 */
export async function getConnectUrl(req, res) {
  try {
    const userId = req.user.id;
    const oauth2Client = getOAuth2Client();
    const state = buildState(userId);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: DRIVE_SCOPES,
      prompt: "consent",
      state,
    });

    res.json({ success: true, authUrl });
  } catch (err) {
    console.error("❌ Drive connect-url error:", err.message);
    res.status(500).json({ success: false, error: "Failed to build OAuth URL." });
  }
}

/**
 * GET /api/google-drive/connect
 * Direct browser redirect to Google OAuth (fallback for non-fetch clients).
 * Requires: authenticate middleware (req.user set).
 */
export async function connectDrive(req, res) {
  try {
    const userId = req.user.id;
    const oauth2Client = getOAuth2Client();
    const state = buildState(userId);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: DRIVE_SCOPES,
      prompt: "consent",
      state,
    });

    res.redirect(authUrl);
  } catch (err) {
    console.error("❌ Drive connect error:", err.message);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}?page=dashboard&tab=settings&drive_error=connect_failed`);
  }
}

/**
 * GET /api/google-drive/callback
 * Receives Google OAuth code, exchanges it, stores connection.
 * NO auth middleware here — Google calls this URL.
 * Security: userId is extracted from the HMAC-signed `state` param.
 */
export async function driveCallback(req, res) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const settingsUrl = `${frontendUrl}?page=dashboard&tab=settings`;

  try {
    const { code, state, error } = req.query;

    // User denied Google consent
    if (error) {
      console.warn("⚠️  Google OAuth denied by user:", error);
      return res.redirect(`${settingsUrl}&drive_error=access_denied`);
    }

    if (!code || !state) {
      return res.redirect(`${settingsUrl}&drive_error=missing_params`);
    }

    // Validate state and extract userId
    const userId = parseState(state);
    if (!userId) {
      console.warn("⚠️  Drive callback: invalid or tampered state param");
      return res.redirect(`${settingsUrl}&drive_error=invalid_state`);
    }

    // Exchange auth code for tokens
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      // This can happen if the user already authorized previously.
      // If we already have a valid connection, just redirect as connected.
      const { data: existing } = await supabaseAdmin
        .from("google_drive_connections")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existing) {
        console.log(`ℹ️  No new refresh_token for user ${userId} — existing connection retained.`);
        return res.redirect(`${settingsUrl}&drive_connected=1`);
      }

      // No existing connection and no refresh token — this shouldn't happen with prompt=consent
      return res.redirect(`${settingsUrl}&drive_error=no_refresh_token`);
    }

    // Set credentials to get user info
    oauth2Client.setCredentials(tokens);

    // Get Google account email
    const oauth2Api = getGoogleOAuth2Api(oauth2Client);
    const userInfoRes = await oauth2Api.userinfo.get();
    const googleEmail = userInfoRes.data.email;

    // Create/find the TextToVideo folder in the user's Drive
    const folderId = await getOrCreateTextToVideoFolder(oauth2Client);

    // Encrypt the refresh token before storing
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    // Upsert connection (insert or update on conflict user_id)
    const { error: dbError } = await supabaseAdmin
      .from("google_drive_connections")
      .upsert(
        {
          user_id: userId,
          google_email: googleEmail,
          drive_folder_id: folderId,
          encrypted_refresh_token: encryptedRefreshToken,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (dbError) {
      console.error("❌ DB upsert error:", dbError.message);
      return res.redirect(`${settingsUrl}&drive_error=db_error`);
    }

    console.log(`✅ Google Drive connected for user ${userId} (${googleEmail})`);
    res.redirect(`${settingsUrl}&drive_connected=1`);
  } catch (err) {
    console.error("❌ Drive callback error:", err.message);
    res.redirect(`${settingsUrl}&drive_error=callback_failed`);
  }
}

/**
 * GET /api/google-drive/status
 * Returns connection status for the authenticated user.
 * NEVER returns tokens.
 */
export async function getDriveStatus(req, res) {
  try {
    const userId = req.user.id;

    const { data, error } = await supabaseAdmin
      .from("google_drive_connections")
      .select("google_email, drive_folder_id, connected_at, encrypted_refresh_token")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return res.json({ success: true, connected: false });
    }

    // Verify the stored token is still usable
    let tokenValid = false;
    try {
      await getAuthClientFromEncryptedToken(data.encrypted_refresh_token);
      tokenValid = true;
    } catch {
      tokenValid = false;
    }

    if (!tokenValid) {
      return res.json({
        success: true,
        connected: false,
        expired: true,
        message: "Google Drive connection expired. Please reconnect.",
      });
    }

    // Return status WITHOUT tokens
    res.json({
      success: true,
      connected: true,
      googleEmail: data.google_email,
      driveFolderPath: "My Drive / TextToVideo",
      connectedAt: data.connected_at,
    });
  } catch (err) {
    console.error("❌ Drive status error:", err.message);
    res.status(500).json({ success: false, error: "Failed to get Drive status." });
  }
}

/**
 * POST /api/google-drive/disconnect
 * Removes the Drive connection for the authenticated user.
 * Revokes the Google token and deletes the DB row.
 * Does NOT delete the user's TextToVideo folder or any videos.
 */
export async function disconnectDrive(req, res) {
  try {
    const userId = req.user.id;

    // Fetch encrypted token before deleting (needed to revoke)
    const { data } = await supabaseAdmin
      .from("google_drive_connections")
      .select("encrypted_refresh_token, google_email")
      .eq("user_id", userId)
      .single();

    if (!data) {
      return res.json({ success: true, message: "No Drive connection found." });
    }

    // Delete the connection row (removes token from DB)
    const { error: deleteError } = await supabaseAdmin
      .from("google_drive_connections")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      console.error("❌ Drive disconnect DB error:", deleteError.message);
      return res.status(500).json({ success: false, error: "Failed to remove Drive connection." });
    }

    // Best-effort: revoke the Google token
    if (data.encrypted_refresh_token) {
      await revokeGoogleToken(data.encrypted_refresh_token);
    }

    console.log(`✅ Google Drive disconnected for user ${userId} (${data.google_email})`);
    res.json({ success: true, message: "Google Drive disconnected successfully." });
  } catch (err) {
    console.error("❌ Drive disconnect error:", err.message);
    res.status(500).json({ success: false, error: "Failed to disconnect Drive." });
  }
}
