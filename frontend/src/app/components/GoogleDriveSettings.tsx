/**
 * GoogleDriveSettings.tsx
 *
 * Displays the Google Drive connection card in the Settings tab.
 * Reads and writes Drive connection state via the backend API.
 *
 * States:
 *  - loading    — fetching status from backend
 *  - connected  — shows email, folder path, Disconnect button
 *  - disconnected — shows Connect button
 *  - expired    — Drive token expired, shows Reconnect button
 *  - error      — shows error message with retry
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  RefreshCw,
  FolderOpen,
  Mail,
  Wifi,
  WifiOff,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  getDriveStatus,
  connectGoogleDrive,
  disconnectGoogleDrive,
  DriveStatus,
} from "../../api/googleDriveApi";

type UIState = "loading" | "connected" | "disconnected" | "expired" | "error";

export function GoogleDriveSettings() {
  const { session } = useAuth();
  const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(null);
  const [uiState, setUiState] = useState<UIState>("loading");
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /* ── Fetch Drive status ── */
  const fetchStatus = useCallback(async () => {
    if (!session) {
      setUiState("disconnected");
      return;
    }

    setUiState("loading");
    setErrorMessage(null);

    try {
      const status = await getDriveStatus(session);
      setDriveStatus(status);

      if (status.expired) {
        setUiState("expired");
      } else if (status.connected) {
        setUiState("connected");
      } else {
        setUiState("disconnected");
      }
    } catch (err: any) {
      console.error("Failed to fetch Drive status:", err);
      setErrorMessage(err.message || "Failed to check Drive connection.");
      setUiState("error");
    }
  }, [session]);

  /* ── On mount + check URL params from OAuth callback ── */
  useEffect(() => {
    // Check if we just returned from Google OAuth
    const params = new URLSearchParams(window.location.search);
    const driveConnected = params.get("drive_connected");
    const driveError = params.get("drive_error");

    if (driveConnected) {
      // Clean URL without reloading
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (driveError) {
      const errorMap: Record<string, string> = {
        access_denied: "You declined Google Drive access.",
        no_refresh_token: "Could not get Drive access. Please try reconnecting.",
        invalid_state: "Security validation failed. Please try again.",
        db_error: "Failed to save Drive connection. Please try again.",
        callback_failed: "Drive connection failed. Please try again.",
        connect_failed: "Could not start Drive connection. Please try again.",
      };
      setErrorMessage(errorMap[driveError] || "Drive connection failed.");
      setUiState("error");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    fetchStatus();
  }, [fetchStatus]);

  /* ── Connect ── */
  const handleConnect = async () => {
    if (!session) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await connectGoogleDrive(session);
      // Navigation happens inside connectGoogleDrive() — no further action needed
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to start Drive connection.");
      setActionLoading(false);
    }
  };

  /* ── Disconnect ── */
  const handleDisconnect = async () => {
    if (!session) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await disconnectGoogleDrive(session);
      setDriveStatus(null);
      setUiState("disconnected");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to disconnect Drive.");
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Render ── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl p-6 bg-[#0d041c]/90 border border-purple-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.5)]"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500/10 border border-purple-500/30 flex-shrink-0">
          <HardDrive className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-white font-bold text-base">Google Drive</h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Store generated videos directly in your personal Google Drive
          </p>
        </div>

        {/* Connection badge */}
        <div className="ml-auto">
          <AnimatePresence mode="wait">
            {uiState === "loading" ? (
              <motion.div key="loading-badge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking...
              </motion.div>
            ) : uiState === "connected" ? (
              <motion.div key="connected-badge" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                Connected
              </motion.div>
            ) : uiState === "expired" ? (
              <motion.div key="expired-badge" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400 font-semibold">
                <AlertCircle className="w-3 h-3" />
                Expired
              </motion.div>
            ) : uiState === "error" ? (
              <motion.div key="error-badge" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-semibold">
                <WifiOff className="w-3 h-3" />
                Error
              </motion.div>
            ) : (
              <motion.div key="disconnected-badge" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-700/50 border border-slate-600/50 text-xs text-slate-400">
                <WifiOff className="w-3 h-3" />
                Not connected
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-purple-500/10 mb-5" />

      <AnimatePresence mode="wait">

        {/* LOADING */}
        {uiState === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking Google Drive connection...
          </motion.div>
        )}

        {/* CONNECTED */}
        {uiState === "connected" && driveStatus && (
          <motion.div key="connected" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-4">
            {/* Connection details */}
            <div className="rounded-xl p-4 bg-emerald-500/5 border border-emerald-500/20 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-500/10 flex-shrink-0">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Connected account</p>
                  <p className="text-sm text-white font-medium">{driveStatus.googleEmail}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-purple-500/10 flex-shrink-0">
                  <FolderOpen className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Videos stored in</p>
                  <p className="text-sm text-white font-medium flex items-center gap-1">
                    {driveStatus.driveFolderPath}
                    <ExternalLink className="w-3 h-3 text-slate-500" />
                  </p>
                </div>
              </div>
            </div>

            <p className="text-slate-400 text-xs">
              Generated videos will automatically be saved to your Google Drive in the{" "}
              <span className="text-purple-300 font-medium">TextToVideo</span> folder.
            </p>

            {/* Disconnect button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleDisconnect}
              disabled={actionLoading}
              id="drive-disconnect-btn"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 hover:border-red-400/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              {actionLoading ? "Disconnecting..." : "Disconnect Google Drive"}
            </motion.button>
          </motion.div>
        )}

        {/* EXPIRED */}
        {uiState === "expired" && (
          <motion.div key="expired" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-4">
            <div className="rounded-xl p-4 bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-300 font-semibold text-sm">Google Drive connection expired</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Your Google Drive authorization has expired or been revoked. Reconnect to continue saving videos automatically.
                  </p>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleConnect}
              disabled={actionLoading}
              id="drive-reconnect-btn"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#301979] via-[#6331E8] to-[#906AF3] shadow-[0_0_20px_rgba(144,106,243,0.4)] hover:shadow-[0_0_30px_rgba(144,106,243,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {actionLoading ? "Redirecting to Google..." : "Reconnect Google Drive"}
            </motion.button>
          </motion.div>
        )}

        {/* ERROR */}
        {uiState === "error" && (
          <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-4">
            {errorMessage && (
              <div className="rounded-xl p-4 bg-red-500/5 border border-red-500/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{errorMessage}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleConnect}
                disabled={actionLoading}
                id="drive-connect-after-error-btn"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#301979] via-[#6331E8] to-[#906AF3] shadow-[0_0_20px_rgba(144,106,243,0.4)] hover:shadow-[0_0_30px_rgba(144,106,243,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
                {actionLoading ? "Redirecting..." : "Connect Google Drive"}
              </motion.button>
              <button
                onClick={fetchStatus}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline underline-offset-2"
              >
                Retry check
              </button>
            </div>
          </motion.div>
        )}

        {/* DISCONNECTED */}
        {uiState === "disconnected" && (
          <motion.div key="disconnected" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-5">
            {/* Info card */}
            <div className="rounded-xl p-4 bg-purple-500/5 border border-purple-500/15 space-y-3">
              <div className="flex items-start gap-3">
                <Wifi className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="text-slate-200 text-sm font-medium">Auto-save to Google Drive</p>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Connect your Google Drive to automatically save every generated video to a{" "}
                    <span className="text-purple-300 font-medium">TextToVideo</span> folder in your personal Drive.
                    Only files created by this app are accessible.
                  </p>
                  <ul className="space-y-1 pt-1">
                    {[
                      "Videos saved automatically after generation",
                      "Stored in My Drive / TextToVideo",
                      "Only app-created files accessible (drive.file scope)",
                      "Disconnect anytime — your Drive files remain",
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-xl p-3 bg-red-500/5 border border-red-500/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-xs">{errorMessage}</p>
              </div>
            )}

            {/* Connect button */}
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleConnect}
              disabled={actionLoading}
              id="drive-connect-btn"
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#301979] via-[#6331E8] to-[#906AF3] border border-purple-400/40 shadow-[0_0_25px_rgba(144,106,243,0.45)] hover:shadow-[0_0_35px_rgba(144,106,243,0.7)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <HardDrive className="w-4 h-4" />
              )}
              {actionLoading ? "Redirecting to Google..." : "Connect Google Drive"}
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}
