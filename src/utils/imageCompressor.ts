const MAX_BYTES = 115 * 1024; // Strictly under 120KB for fast Firestore sync

function dataUrlByteSize(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] || '';
  return Math.ceil((base64.length * 3) / 4);
}

export async function compressImageToUnder120KB(file: File): Promise<{
  dataUrl: string;
  sizeKB: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('فشل في قراءة ملف الصورة.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('الملف المختار ليس صورة صالحة.'));
      img.onload = () => {
        let maxDim = 1000;
        let quality = 0.86;
        let resultDataUrl = '';

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('المتصفح لا يدعم ضغط الصور عبر Canvas.'));
          return;
        }

        for (let attempt = 0; attempt < 10; attempt++) {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const targetW = Math.max(1, Math.round(img.width * scale));
          const targetH = Math.max(1, Math.round(img.height * scale));

          canvas.width = targetW;
          canvas.height = targetH;
          ctx.clearRect(0, 0, targetW, targetH);
          ctx.fillStyle = '#0B0F17';
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);

          resultDataUrl = canvas.toDataURL('image/jpeg', quality);
          const bytes = dataUrlByteSize(resultDataUrl);

          if (bytes <= MAX_BYTES) {
            resolve({
              dataUrl: resultDataUrl,
              sizeKB: Math.round(bytes / 1024),
            });
            return;
          }

          if (quality > 0.45) {
            quality -= 0.12;
          } else {
            maxDim = Math.round(maxDim * 0.78);
            quality = 0.72;
          }
        }

        resolve({
          dataUrl: resultDataUrl,
          sizeKB: Math.round(dataUrlByteSize(resultDataUrl) / 1024),
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
