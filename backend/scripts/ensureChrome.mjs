// backend/scripts/ensureChrome.mjs
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const cacheDir =
    (process.env.PUPPETEER_CACHE_DIR && process.env.PUPPETEER_CACHE_DIR.trim()) ||
    path.join(process.env.USERPROFILE || "", ".cache", "puppeteer");

console.log("🧩 Puppeteer runtime Chrome setup");
console.log("📌 PUPPETEER_CACHE_DIR =", cacheDir);

// Ensure cache dir exists
fs.mkdirSync(cacheDir, { recursive: true });

// If chrome already exists somewhere inside cache, skip install
function findChromeExecutable(base) {
    try {
        const chromeRoot = path.join(base, "chrome");
        if (!fs.existsSync(chromeRoot)) return null;

        const platformDirs = fs
            .readdirSync(chromeRoot, { withFileTypes: true })
            .filter((d) => d.isDirectory() && (d.name.startsWith("linux-") || d.name.startsWith("win")))
            .map((d) => d.name)
            .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

        for (const d of platformDirs) {
            const baseDir = path.join(chromeRoot, d);
            const candidates = [
                path.join(baseDir, "chrome-linux64", "chrome"),
                path.join(baseDir, "chrome-linux", "chrome"),
                path.join(baseDir, "chrome"),
                path.join(baseDir, "chrome.exe"), // Windows
            ];
            for (const c of candidates) {
                if (fs.existsSync(c)) return c;
            }
        }
        return null;
    } catch {
        return null;
    }
}

const existing = findChromeExecutable(cacheDir);
if (existing) {
    console.log("✅ Chrome already present:", existing);
    process.exit(0);
}

console.log("⬇️ Chrome not found in runtime cache. Installing via Puppeteer...");

try {
    // IMPORTANT: use shell to apply env var in the same command
    execSync(`PUPPETEER_CACHE_DIR="${cacheDir}" npx puppeteer browsers install chrome`, {
        stdio: "inherit",
        shell: true,
    });
    const after = findChromeExecutable(cacheDir);
    if (!after) {
        console.error("❌ Install finished but Chrome still not found in cache dir:", cacheDir);
        process.exit(1);
    }
    console.log("✅ Chrome installed:", after);
} catch (e) {
    console.error("❌ Failed to install Chrome at runtime:", e?.message || e);
    process.exit(1);
}
