/* src/middleware/authMiddleware.js
 *
 * Verifies a Supabase JWT from the Authorization header.
 * Attaches req.user = { id, email, ... } on success.
 *
 * authenticate      — rejects with 401 if token is missing or invalid
 * authenticateOptional — sets req.user if token is present & valid,
 *                        but allows the request through either way
 */

import { supabaseAdmin } from "../config/supabaseAdmin.js";

/**
 * Extract the Bearer token from the Authorization header.
 * Returns null if missing.
 */
function extractToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  // Support token in query parameter for video tag requests
  if (req.query?.token) {
    return req.query.token;
  }
  return null;
}

/**
 * Verify a token and return the Supabase user, or null on failure.
 */
async function verifyToken(token) {
  if (!token) return null;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Strict authentication — 401 if not authenticated.
 */
export async function authenticate(req, res, next) {
  const token = extractToken(req);
  const user = await verifyToken(token);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized. Please provide a valid Supabase session token.",
    });
  }

  req.user = user; // { id, email, ... }
  next();
}

/**
 * Optional authentication — sets req.user if valid token present,
 * otherwise req.user = null and continues.
 */
export async function authenticateOptional(req, res, next) {
  const token = extractToken(req);
  req.user = await verifyToken(token); // null if missing/invalid
  next();
}
