/**
 * Copy Noto Sans SC into public/fonts for @react-pdf (same-origin, embeddable).
 * Run from postinstall so `public/fonts` exists after npm ci.
 */
const fs = require("fs");
const path = require("path");

const src = path.join(
  __dirname,
  "..",
  "node_modules",
  "@fontsource",
  "noto-sans-sc",
  "files",
  "noto-sans-sc-chinese-simplified-400-normal.woff2"
);
const destDir = path.join(__dirname, "..", "public", "fonts");
const dest = path.join(destDir, "noto-sans-sc-chinese-simplified-400-normal.woff2");

if (!fs.existsSync(src)) {
  console.warn("[copy-pdf-font] Source font not found, skip:", src);
  process.exit(0);
}
fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log("[copy-pdf-font] Copied to", dest);
