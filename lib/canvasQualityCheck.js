/**
 * Kiểm tra độ mờ (Laplacian Variance) và độ sáng (Luminance) trên Canvas 500x500px (< 10ms)
 * @param {HTMLImageElement} imgElement - Thẻ ảnh đã load
 * @returns {{ isPassed: boolean, reason: string|null, blurScore: number, luminance: number }}
 */
export function checkImageQuality(imgElement) {
  // Guard Clause kiểm tra ảnh đã tải xong chưa
  if (!imgElement || !imgElement.complete || !imgElement.naturalWidth) {
    throw new Error("Image Element chưa load xong hoặc bị lỗi URL.");
  }

  const canvas = document.createElement('canvas');
  // Bổ sung willReadFrequently: true để tối ưu hiệu năng getImageData trên trình duyệt modern
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  // Downsample về 500px chiều rộng để tối ưu tốc độ < 10ms
  const targetWidth = 500;
  const scale = targetWidth / imgElement.naturalWidth;
  canvas.width = targetWidth;
  canvas.height = Math.round(imgElement.naturalHeight * scale); // Làm tròn số nguyên tránh lệch pixel
  
  ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  let totalLuminance = 0;
  const grayPixels = new Float32Array(canvas.width * canvas.height);
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    grayPixels[i / 4] = gray;
    totalLuminance += gray;
  }
  
  const avgLuminance = (totalLuminance / grayPixels.length) / 255;
  
  let lapSum = 0, lapSumSq = 0;
  const w = canvas.width, h = canvas.height;
  
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const val = grayPixels[idx - w] + grayPixels[idx - 1] + grayPixels[idx + 1] + grayPixels[idx + w] - 4 * grayPixels[idx];
      lapSum += val;
      lapSumSq += val * val;
    }
  }
  
  const count = (w - 2) * (h - 2);
  const mean = lapSum / count;
  const blurVariance = (lapSumSq / count) - (mean * mean);
  
  // Luminance threshold: 0.01 (chỉ chặn ảnh đen tuyền 100%)
  if (avgLuminance < 0.01) {
    return { isPassed: false, reason: "Ảnh quá tối, không nhìn thấy gì. Hãy bật đèn flash hoặc chụp nơi sáng hơn.", blurScore: blurVariance, luminance: avgLuminance };
  }
  // Blur threshold: 5 (rất nới lỏng để không đánh rớt bất kỳ ảnh thật nào của người dùng)
  if (blurVariance < 5) {
    return { isPassed: false, reason: "Ảnh bị mờ nhòe quá mức. Hãy giữ chắc tay và chụp lại.", blurScore: blurVariance, luminance: avgLuminance };
  }
  
  return { isPassed: true, reason: null, blurScore: blurVariance, luminance: avgLuminance };
}
