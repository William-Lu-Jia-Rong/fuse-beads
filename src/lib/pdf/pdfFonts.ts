import { Font } from "@react-pdf/renderer";

const FONT_FAMILY = "Noto";
/** Prefer WOFF — @react-pdf/fontkit often fails silently with WOFF2/blob for CJK. */
const FONT_PUBLIC_PATH = "/fonts/noto-sans-sc-chinese-simplified-400-normal.woff";

let registered = false;

function absoluteFontHref(): string {
  if (typeof window !== "undefined" && window.location?.href) {
    return new URL(FONT_PUBLIC_PATH, window.location.href).href;
  }
  return FONT_PUBLIC_PATH;
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("readAsDataURL failed"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Embeds font as a data URL so @react-pdf never has to re-fetch from blob:/relative URLs
 * (which often yields invisible text for custom families).
 */
export async function preloadPdfFonts(): Promise<void> {
  if (typeof window === "undefined") return;

  if (!registered) {
    const href = absoluteFontHref();
    const res = await fetch(href);
    if (!res.ok) {
      throw new Error(
        `无法加载 PDF 字体 (${res.status})，请确认已执行 npm install 且 public/fonts 下存在 ${FONT_PUBLIC_PATH}`
      );
    }
    const blob = new Blob([await res.arrayBuffer()], { type: "font/woff" });
    const dataUrl = await readBlobAsDataUrl(blob);
    Font.register({
      family: FONT_FAMILY,
      src: dataUrl,
      fontWeight: 400,
    });
    registered = true;
  }

  await Font.load({
    fontFamily: FONT_FAMILY,
    fontWeight: 400,
    fontStyle: "normal",
  });
}
