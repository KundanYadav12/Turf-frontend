/**
 * Client-Side Image Compression & Optimization Utility
 * Automatically resizes, strips unnecessary metadata, and converts to WebP/JPEG
 * with guaranteed maximum file size to prevent HTTP 413 (Payload/Request Entity Too Large).
 */

/**
 * Compress and optimize any image file in the browser using HTML5 Canvas.
 * 
 * @param {File|Blob} file The input image file selected by the user
 * @param {Object} options Configuration options
 * @param {number} options.maxWidth Maximum width in pixels (default: 1600)
 * @param {number} options.maxHeight Maximum height in pixels (default: 1000)
 * @param {number} options.maxSizeBytes Maximum target size in bytes (default: 800 KB, ensures safely under 1MB)
 * @param {number} options.quality Initial WebP/JPEG quality from 0.1 to 1.0 (default: 0.85)
 * @returns {Promise<{file: File, previewUrl: string, width: number, height: number, sizeBytes: number, originalSizeBytes: number, compressionRatio: string, mimeType: string}>}
 */
export async function compressAndOptimizeImage(file, options = {}) {
  if (!file) return null;

  const {
    maxWidth = 1600,
    maxHeight = 1000,
    maxSizeBytes = 800 * 1024, // 800 KB threshold (safely under 1MB reverse proxy limits)
    quality = 0.85
  } = typeof options === 'number'
    ? { maxWidth: arguments[1] || 1600, maxHeight: arguments[2] || 1000, quality: arguments[3] || 0.85 }
    : options;

  const originalSizeBytes = file.size || 0;

  // 1. Preserve vector SVGs without rasterizing to canvas
  if (file.type === 'image/svg+xml' || file.name?.toLowerCase().endsWith('.svg')) {
    return {
      file,
      previewUrl: URL.createObjectURL(file),
      width: null,
      height: null,
      sizeBytes: originalSizeBytes,
      originalSizeBytes,
      compressionRatio: '0%',
      mimeType: 'image/svg+xml'
    };
  }

  // 2. Validate image mime-type
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('The selected file is not a valid image format.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file from device.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image into browser canvas.'));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // If file is already small (< 300KB) and dimensions are within limits, skip canvas re-encoding
        if (originalSizeBytes > 0 && originalSizeBytes <= 300 * 1024 && width <= maxWidth && height <= maxHeight) {
          return resolve({
            file,
            previewUrl: URL.createObjectURL(file),
            width,
            height,
            sizeBytes: originalSizeBytes,
            originalSizeBytes,
            compressionRatio: '0%',
            mimeType: file.type || 'image/jpeg'
          });
        }

        // Calculate aspect ratio preserving dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) {
          return reject(new Error('Canvas 2D context unavailable in current browser.'));
        }

        // Better image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Prefer modern WebP (supports both lossy compression and alpha transparency)
        let mimeType = 'image/webp';
        try {
          const testData = canvas.toDataURL('image/webp');
          if (!testData.startsWith('data:image/webp')) {
            mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          }
        } catch {
          mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        }

        /**
         * Adaptive multi-pass compression to strictly guarantee <= maxSizeBytes
         */
        const attemptCompression = (currentQuality, currentScale = 1.0) => {
          let targetCanvas = canvas;
          if (currentScale < 1.0) {
            targetCanvas = document.createElement('canvas');
            targetCanvas.width = Math.round(width * currentScale);
            targetCanvas.height = Math.round(height * currentScale);
            const tCtx = targetCanvas.getContext('2d', { alpha: true });
            tCtx.imageSmoothingEnabled = true;
            tCtx.imageSmoothingQuality = 'high';
            tCtx.drawImage(canvas, 0, 0, targetCanvas.width, targetCanvas.height);
          }

          targetCanvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error('Failed to encode optimized image blob.'));
              }

              // If still exceeds maxSizeBytes and we can compress more, do an adaptive second pass
              if (blob.size > maxSizeBytes && currentQuality > 0.55) {
                return attemptCompression(Math.max(0.55, currentQuality - 0.15), currentScale * 0.85);
              }

              const ext = mimeType === 'image/webp' ? 'webp' : (mimeType === 'image/png' ? 'png' : 'jpg');
              const baseName = (file.name || 'image').replace(/\.[^.]+$/, '');
              const optimizedFile = new File([blob], `${baseName}.${ext}`, {
                type: mimeType,
                lastModified: Date.now()
              });

              const previewUrl = URL.createObjectURL(blob);
              const savedPct = originalSizeBytes > 0
                ? Math.max(0, Math.round(((originalSizeBytes - blob.size) / originalSizeBytes) * 100))
                : 0;

              resolve({
                file: optimizedFile,
                previewUrl,
                width: targetCanvas.width,
                height: targetCanvas.height,
                sizeBytes: blob.size,
                originalSizeBytes,
                compressionRatio: `${savedPct}%`,
                mimeType
              });
            },
            mimeType,
            currentQuality
          );
        };

        attemptCompression(quality);
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Dedicated helper specifically for stadium and mobile advertisements
 */
export async function compressAdImage(file) {
  return compressAndOptimizeImage(file, {
    maxWidth: 1600,
    maxHeight: 900,
    maxSizeBytes: 700 * 1024, // 700 KB (strictly below 1MB to avoid proxy 413)
    quality: 0.84
  });
}
