import { Font } from "@react-pdf/renderer";

const FONT_FAMILY = "Noto";

let registered = false;

/** Register same-origin font (copied to public/fonts by postinstall). */
export function registerPdfFonts(): void {
  if (registered) return;
  Font.register({
    family: FONT_FAMILY,
    src: "/fonts/noto-sans-sc-chinese-simplified-400-normal.woff2",
    fontWeight: 400,
  });
  registered = true;
}

/** Must await before pdf() or CJK text renders blank. */
export async function preloadPdfFonts(): Promise<void> {
  registerPdfFonts();
  await Font.load({
    fontFamily: FONT_FAMILY,
    fontWeight: 400,
    fontStyle: "normal",
  });
}
