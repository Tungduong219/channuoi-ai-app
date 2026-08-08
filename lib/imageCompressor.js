/**
 * imageCompressor.js
 * Client-side image compression using Canvas API.
 * Designed for ChănNuôi AI — compresses before sending to Gemini API
 * to keep multi-image requests lean on 4G rural networks.
 *
 * @param {File} file - The raw image File object from <input type="file">
 * @param {number} maxDimension - Max width or height in pixels (default 1280px)
 * @param {number} quality - JPEG compression quality 0.0–1.0 (default 0.7)
 * @returns {Promise<string>} - Base64 data URL of compressed image (image/jpeg)
 */
export function compressImage(file, maxDimension = 1280, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.onerror = reject;

    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else if (height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;

    reader.readAsDataURL(file);
  });
}
