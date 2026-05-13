/**
 * Copy Noto Sans SC into public/fonts for @react-pdf (same-origin, embeddable).
 * Run from postinstall so `public/fonts` exists after npm ci.
 * WOFF is more reliably embedded by @react-pdf/font than WOFF2 in some environments.
 */
const fs = require("fs");
const path = require("path");

const base = "noto-sans-sc-chinese-simplified-400-normal";
const pairs = [
  [`${base}.woff2`, "woff2"],
  [`${base}.woff`, "woff"],
];

const destDir = path.join(__dirname, "..", "public", "fonts");
const filesDir = path.join(
  __dirname,
  "..",
  "node_modules",
  "@fontsource",
  "noto-sans-sc",
  "files"
);

let copied = 0;
for (const [name] of pairs) {
  const src = path.join(filesDir, name);
  const dest = path.join(destDir, name);
  if (!fs.existsSync(src)) {
    console.warn("[copy-pdf-font] Source font not found, skip:", src);
    continue;
  }
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log("[copy-pdf-font] Copied to", dest);
  copied++;
}

if (copied === 0) {
  process.exit(0);
}
