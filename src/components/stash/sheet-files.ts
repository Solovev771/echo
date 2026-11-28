"use client";

const MAX_EDGE = 1800;
const MAX_DATA = 1_000_000;
const MAX_IMAGES = 3;

function drawJpeg(
  source: CanvasImageSource,
  width: number,
  height: number,
  edge: number,
  quality: number,
): string {
  const scale = Math.min(1, edge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Не удалось подготовить фото");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

function fitJpeg(source: CanvasImageSource, width: number, height: number): string {
  for (const edge of [MAX_EDGE, 1400, 1100]) {
    for (const quality of [0.72, 0.58, 0.45]) {
      const url = drawJpeg(source, width, height, edge, quality);
      if (url.length <= MAX_DATA) return url;
    }
  }
  return drawJpeg(source, width, height, 900, 0.42);
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Фото не открылось. Попробуйте JPG или PDF."));
    };
    img.src = url;
  });
}

function isHeic(file: File) {
  const name = file.name.toLowerCase();
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

async function heicToJpeg(file: File): Promise<Blob> {
  const { default: convert } = await import("heic2any");
  const result = await convert({ blob: file, toType: "image/jpeg", quality: 0.82 });
  const blob = Array.isArray(result) ? result[0] : result;
  if (!blob) throw new Error("Фото HEIC не открылось. Сохраните его как JPG.");
  return blob;
}

async function imageToJpeg(file: File): Promise<string> {
  const source = isHeic(file) ? await heicToJpeg(file) : file;
  try {
    const img = await blobToImage(source);
    return fitJpeg(img, img.naturalWidth, img.naturalHeight);
  } catch (err) {
    if (!isHeic(file)) {
      try {
        const blob = await heicToJpeg(file);
        const img = await blobToImage(blob);
        return fitJpeg(img, img.naturalWidth, img.naturalHeight);
      } catch {
        throw err instanceof Error ? err : new Error("Фото не открылось");
      }
    }
    throw err instanceof Error ? err : new Error("Фото не открылось");
  }
}

async function pdfToJpegs(file: File): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/stash/pdf.worker.min.mjs";
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages = Math.min(doc.numPages, MAX_IMAGES);
  const out: string[] = [];
  for (let number = 1; number <= pages; number += 1) {
    const page = await doc.getPage(number);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({
      scale: Math.min(2.4, MAX_EDGE / Math.max(base.width, base.height)),
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Не удалось открыть PDF");
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    out.push(fitJpeg(canvas, canvas.width, canvas.height));
  }
  return out;
}

export async function fileToJpegs(file: File): Promise<string[]> {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return pdfToJpegs(file);
  return [await imageToJpeg(file)];
}

/** Up to three pages: one PDF, or several photos of the same delivery. */
export async function filesToJpegs(files: File[]): Promise<string[]> {
  const out: string[] = [];
  for (const file of files) {
    if (out.length >= MAX_IMAGES) break;
    const pages = await fileToJpegs(file);
    for (const page of pages) {
      out.push(page);
      if (out.length >= MAX_IMAGES) return out;
    }
  }
  if (out.length === 0) throw new Error("Файл пустой");
  return out;
}
