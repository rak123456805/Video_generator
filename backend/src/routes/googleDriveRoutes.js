/* src/routes/googleDriveRoutes.js */

import express from "express";
import {
  connectDrive,
  getConnectUrl,
  driveCallback,
  getDriveStatus,
  disconnectDrive,
} from "../controllers/googleDriveController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET /api/google-drive/connect-url
 * Returns the Google OAuth URL as JSON { authUrl }.
 * The frontend fetches this with Authorization header, then navigates.
 * Avoids embedding the Supabase token in a browser redirect URL.
 */
router.get("/connect-url", authenticate, getConnectUrl);

/**
 * GET /api/google-drive/connect
 * Direct browser redirect to Google OAuth (fallback).
 * Requires a valid Supabase session (Authorization: Bearer <token>).
 */
router.get("/connect", authenticate, connectDrive);

/**
 * GET /api/google-drive/callback
 * Google redirects here after user grants permission.
 * NO auth middleware — this is called by Google's servers.
 * Security is handled via the HMAC-signed `state` parameter.
 */
router.get("/callback", driveCallback);

/**
 * GET /api/google-drive/status
 * Returns whether the authenticated user has Drive connected.
 * Never returns tokens.
 */
router.get("/status", authenticate, getDriveStatus);

/**
 * POST /api/google-drive/disconnect
 * Disconnects Drive for the authenticated user.
 * Revokes Google token and deletes DB row.
 */
router.post("/disconnect", authenticate, disconnectDrive);

export default router;
