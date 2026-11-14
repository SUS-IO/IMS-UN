// Shrinks a picture in the browser so it is stored in a few KB, not MB.
// Tries lower quality first, then smaller size, until it fits under maxKB.
function encode(canvas, type, q) {
  return new Promise((res) => canvas.toBlob(res, type, q));
}
async function compressImage(file, { maxDim = 800, maxKB = 60, keepAlpha = false } = {}) {
  const bmp = await createImageBitmap(file);
  let dim = Math.min(maxDim, Math.max(bmp.width, bmp.height));
  const limit = maxKB * 1024;
  let type = keepAlpha ? "image/webp" : "image/jpeg";
  let best = null;
  for (let round = 0; round < 8; round++) {
    const scale = Math.min(1, dim / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * scale));
    c.height = Math.max(1, Math.round(bmp.height * scale));
    const ctx = c.getContext("2d");
    if (!keepAlpha) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
    }
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    for (const q of [0.82, 0.7, 0.58, 0.46, 0.36]) {
      let blob = await encode(c, type, q);
      if (blob && blob.type !== type && keepAlpha) {
        type = "image/png";
        blob = await encode(c, type);
      }
      if (!blob) continue;
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= limit) return blob;
      if (type === "image/png") break;
    }
    dim = Math.round(dim * 0.8);
  }
  bmp.close?.();
  if (!best) throw new Error("This image could not be processed. Try another file.");
  return best;
}
const kb = (b) => `${Math.max(1, Math.round(b.size / 1024))} KB`;
export {
  compressImage,
  kb
};
