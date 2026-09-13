/* src/services/tts/engine.js
 *
 * Single source of truth for TTS in Node.js.
 * Primary: Microsoft Edge TTS via WebSocket with updated 2026 authentication headers.
 * Fallback: Google Translate TTS via HTTP GET if Edge TTS chunk retries fail.
 *
 * Key features:
 *  - High quality neural voices for English and Indic languages via Edge TTS.
 *  - Updated Sec-MS-GEC and extension headers matching Edge browser version 143+.
 *  - Per-chunk timeout and retry with exponential backoff.
 *  - Automatic fallback to Google Translate TTS if Edge TTS fails, guaranteeing pipeline success.
 */

import fs from "fs";
import path from "path";
import https from "https";
import crypto from "crypto";
import WebSocket from "ws";
import { TTS_LANGUAGES } from "./voices.js";

/* ── Constants ───────────────────────────────────────────────────────────── */

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WIN_EPOCH = 11644473600;

/** Maximum characters per Edge TTS chunk. */
const MAX_CHARS_EDGE = 2000;

/** Per-chunk timeout (ms). */
const CHUNK_TIMEOUT_MS = 25_000;

/** Maximum retries per chunk for Edge TTS before falling back. */
const CHUNK_MAX_RETRIES = 2;

/** Backoff between retries (ms). */
const CHUNK_RETRY_BACKOFF_MS = 2_000;

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toError(e) {
  if (e instanceof Error) return e;
  if (typeof e === "string" && e) return new Error(e);
  if (e && typeof e === "object" && e.message) return new Error(String(e.message));
  return new Error(`TTS threw non-Error value: ${JSON.stringify(e)}`);
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`TTS chunk ${label} timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

/* ── Primary Edge TTS Chunk Generator ────────────────────────────────────── */

function generateEdgeTTSChunkStream(voiceName, text, writer) {
  return new Promise((resolve, reject) => {
    try {
      let ticks = Math.floor(Date.now() / 1000) + WIN_EPOCH;
      ticks -= ticks % 300;
      ticks = Math.floor(ticks * 10000000);

      const strToHash = ticks + TRUSTED_CLIENT_TOKEN;
      const hash = crypto.createHash("sha256").update(strToHash).digest("hex").toUpperCase();
      const reqId = crypto.randomUUID().replace(/-/g, "");
      const muid = crypto.randomBytes(16).toString("hex").toUpperCase();

      const secVersion = "1-143.0.3650.75";
      const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${hash}&Sec-MS-GEC-Version=${secVersion}&ConnectionId=${reqId}`;

      const langMatch = /\w{2}-\w{2}/.exec(voiceName);
      const locale = langMatch ? langMatch[0] : "en-US";

      const ws = new WebSocket(url, {
        headers: {
          "Pragma": "no-cache",
          "Cache-Control": "no-cache",
          "Origin": "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Accept-Language": "en-US,en;q=0.9",
          "Cookie": `muid=${muid};`
        }
      });

      let bytesWritten = 0;
      let finished = false;

      const cleanup = () => {
        try { ws.close(); } catch {}
      };

      ws.on("open", () => {
        const configMsg =
          `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: { sentenceBoundaryEnabled: "false", wordBoundaryEnabled: "false" },
                  outputFormat: "audio-24khz-48kbitrate-mono-mp3"
                }
              }
            }
          });
        ws.send(configMsg);

        const ssml =
          `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${locale}">` +
          `<voice name="${voiceName}">` +
          `<prosody pitch="+0Hz" rate="+0%" volume="+0%">` +
          `${escapeXml(text)}` +
          `</prosody>` +
          `</voice>` +
          `</speak>`;

        const ssmlMsg =
          `X-RequestId:${reqId}\r\n` +
          `Content-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n` +
          ssml;
        ws.send(ssmlMsg);
      });

      ws.on("message", (data) => {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const str = buf.toString("utf8");

        if (str.includes("Path:turn.end")) {
          finished = true;
          cleanup();
          if (bytesWritten > 0) resolve(bytesWritten);
          else reject(new Error("Edge TTS finished but 0 audio bytes received"));
          return;
        }

        if (buf.length >= 2) {
          const headerLength = buf.readUInt16BE(0);
          if (buf.length >= 2 + headerLength) {
            const headerStr = buf.subarray(2, 2 + headerLength).toString("utf8");
            if (headerStr.includes("Path:audio")) {
              const audioData = buf.subarray(2 + headerLength);
              if (audioData.length > 0) {
                writer.write(audioData);
                bytesWritten += audioData.length;
              }
            }
          }
        }
      });

      ws.on("error", (err) => {
        cleanup();
        reject(toError(err));
      });

      ws.on("close", () => {
        if (!finished) {
          if (bytesWritten > 0) resolve(bytesWritten);
          else reject(new Error("Edge TTS connection closed prematurely"));
        }
      });
    } catch (e) {
      reject(toError(e));
    }
  });
}

/* ── Fallback Google Translate TTS ────────────────────────────────────────── */

function fetchGoogleTTSChunk(text, langCode, writer) {
  return new Promise((resolve, reject) => {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${encodeURIComponent(langCode)}&client=tw-ob`;
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Google TTS status code: ${res.statusCode}`));
      }
      res.pipe(writer, { end: false });
      res.on("end", resolve);
      res.on("error", (e) => reject(toError(e)));
    }).on("error", (e) => reject(toError(e)));
  });
}

async function streamFallbackGoogleTTS(text, langCode, writer) {
  // Google Translate TTS accepts up to 200 chars per chunk
  const chunks = [];
  const chunkSize = 180;
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  for (let i = 0; i < chunks.length; i++) {
    await fetchGoogleTTSChunk(chunks[i], langCode, writer);
  }
}

/* ── Robust Chunk Process with Fallback ──────────────────────────────────── */

async function streamChunkWithRetryAndFallback(voiceName, chunkText, writer, chunkIndex, totalChunks, langCode) {
  const label = `${chunkIndex + 1}/${totalChunks}`;
  let lastErr;

  // Try Edge TTS with retries
  for (let attempt = 0; attempt <= CHUNK_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.warn(`   ♻️  Retry ${attempt}/${CHUNK_MAX_RETRIES} for chunk ${label}…`);
      await sleep(CHUNK_RETRY_BACKOFF_MS);
    }

    try {
      console.log(`   ▶️  Generating chunk ${label} (attempt ${attempt + 1})`);
      await withTimeout(
        generateEdgeTTSChunkStream(voiceName, chunkText, writer),
        CHUNK_TIMEOUT_MS,
        label
      );
      return; // Edge TTS succeeded!
    } catch (rawErr) {
      lastErr = toError(rawErr);
      console.warn(`   ⚠️  Edge TTS Chunk ${label} failed (attempt ${attempt + 1}): ${lastErr.message}`);
    }
  }

  // Fallback to Google Translate TTS if Edge TTS retries fail
  console.warn(`   🔄 Edge TTS failed after ${CHUNK_MAX_RETRIES + 1} attempts for chunk ${label}. Using Google TTS fallback…`);
  try {
    await withTimeout(
      streamFallbackGoogleTTS(chunkText, langCode, writer),
      CHUNK_TIMEOUT_MS,
      `${label} Google fallback`
    );
    console.log(`   ✅ Chunk ${label} completed using Google TTS fallback`);
  } catch (fallbackErr) {
    throw new Error(`TTS chunk ${label} failed with both Edge TTS (${lastErr?.message}) and Google TTS (${toError(fallbackErr).message})`);
  }
}

/* ── Main Export ──────────────────────────────────────────────────────────── */

/**
 * Generate speech for `text` and write it to `outputFile`.
 *
 * @param {string} text       - Full narration text.
 * @param {string} outputFile - Output filename (placed in /generated/).
 * @param {string} langCode   - Language code, e.g. "en", "hi", "kn".
 * @returns {Promise<string>} - Absolute path to the generated MP3 file.
 */
export const generateSpeech = async (text, outputFile, langCode = "en") => {
  const outputDir = path.resolve(process.cwd(), "generated");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, path.basename(outputFile));
  if (fs.existsSync(outputPath)) fs.rmSync(outputPath, { force: true });

  const langConfig = TTS_LANGUAGES.find((v) => v.code === langCode) || TTS_LANGUAGES[0];
  const voiceName = langConfig.voice;

  const cleanText = text.replace(/\s+/g, " ").trim();

  // Split into ≤MAX_CHARS_EDGE chunks
  const chunks = [];
  for (let i = 0; i < cleanText.length; i += MAX_CHARS_EDGE) {
    chunks.push(cleanText.slice(i, i + MAX_CHARS_EDGE));
  }

  console.log(`🎙️  TTS Engine: language=${langCode} voice=${voiceName}`);
  console.log(`🔊  Total chunks to process: ${chunks.length}`);

  const writer = fs.createWriteStream(outputPath);

  try {
    for (let i = 0; i < chunks.length; i++) {
      await streamChunkWithRetryAndFallback(voiceName, chunks[i], writer, i, chunks.length, langCode);
    }

    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log("✅ Full audio generated and saved successfully");
        resolve(outputPath);
      });
      writer.on("error", (e) => reject(toError(e)));
      writer.end();
    });

  } catch (rawError) {
    writer.destroy();
    const err = toError(rawError);
    console.error("❌ TTS Engine Error:", err.message);
    throw err;
  }
};