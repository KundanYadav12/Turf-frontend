/**
 * Client-Side Image Compression & Optimization Utility
 * Automatically resizes, strips unnecessary canvas data, and converts to WebP/JPEG.
 */

export async function compressAndOptimizeImage(file, maxWidth = 512, maxHeight = 512, quality = 0.85) {
  if (!file) return null;

  return new Promise((resolve, reject) => {
    // If not an image, reject
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for processing'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio preserving dimensions
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas context unavailable'));
        }

        // Draw image resized onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Prefer WebP if supported, fallback to image/jpeg
        let mimeType = 'image/webp';
        // Test webp support
        if (canvas.toDataURL('image/webp').indexOf('data:image/webp') !== 0) {
          mimeType = 'image/jpeg';
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('Image compression failed'));
            }
            const optimizedFile = new File([blob], file.name.replace(/\.[^.]+$/, `.${mimeType === 'image/webp' ? 'webp' : 'jpg'}`), {
              type: mimeType,
              lastModified: Date.now()
            });

            const previewUrl = URL.createObjectURL(blob);

            resolve({
              file: optimizedFile,
              previewUrl,
              width,
              height,
              sizeBytes: blob.size,
              mimeType
            });
          },
          mimeType,
          quality
        );
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}
