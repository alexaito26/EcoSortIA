/**
 * EcoSort AI - Genera los iconos de la PWA desde un unico original.
 *
 * Entrada:  assets/ecosort-icon-source.png (cuadrado, >= 1024 px)
 * Salida:   apps/web/public/icons/*
 *
 * Uso: pnpm icons:generate
 *
 * El icono "maskable" agrega margen interno (safe zone del 80%) para que
 * Android pueda recortarlo en circulo/squircle sin cortar el simbolo.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "assets", "ecosort-icon-source.png");
const OUT_DIR = path.join(ROOT, "apps", "web", "public", "icons");

/** Verde de marca: debe coincidir con theme_color del manifest. */
const BRAND = "#16a34a";

const SIZES = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "favicon-32.png", size: 32 },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const { file, size } of SIZES) {
    await sharp(SOURCE)
      .resize(size, size, { fit: "cover" })
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT_DIR, file));
    console.log(`icons/${file} (${size}x${size})`);
  }

  // Maskable: simbolo al 80% sobre fondo de marca.
  for (const size of [192, 512]) {
    const inner = Math.round(size * 0.8);
    const pad = Math.round((size - inner) / 2);
    const symbol = await sharp(SOURCE).resize(inner, inner, { fit: "cover" }).toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: BRAND,
      },
    })
      .composite([{ input: symbol, top: pad, left: pad }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT_DIR, `maskable-${size}.png`));
    console.log(`icons/maskable-${size}.png (${size}x${size})`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Error inesperado.");
  process.exit(1);
});
