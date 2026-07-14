import imageCompression from 'browser-image-compression';

/**
 * Creates an image element from a source URL
 * @param {string} url 
 * @returns {Promise<HTMLImageElement>}
 */
export const loadImage = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (err) => reject(err));
    // Only set crossOrigin for external URLs, not DataURLs
    if (!url.startsWith('data:')) {
      img.setAttribute('crossOrigin', 'anonymous');
    }
    img.src = url;
  });
};

/**
 * Crops an image based on container dimensions, scale, and offset, then compresses it
 * @param {HTMLImageElement} img The HTML Image object
 * @param {object} cropParams { zoom, x, y, containerWidth, containerHeight }
 * @param {number} targetWidth Output canvas width (defaults to 800 for 16:9)
 * @param {number} targetHeight Output canvas height (defaults to 450 for 16:9)
 * @returns {Promise<File>} Compressed File object
 */
export async function cropAndCompressImage(img, cropParams, targetWidth = 800, targetHeight = 450) {
  const { zoom, x, y, containerWidth, containerHeight } = cropParams;

  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get 2D context for image cropping.');
  }

  // Clear canvas
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // Calculate rendering size of the image to cover container
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const containerAspect = containerWidth / containerHeight;

  let renderWidth = 0;
  let renderHeight = 0;

  if (imgAspect > containerAspect) {
    // Image is wider than container, fit height
    renderHeight = containerHeight;
    renderWidth = containerHeight * imgAspect;
  } else {
    // Image is taller than container, fit width
    renderWidth = containerWidth;
    renderHeight = containerWidth / imgAspect;
  }

  // Scale calculations to output canvas dimensions
  const scaleFactor = targetWidth / containerWidth;

  const dWidth = renderWidth * zoom * scaleFactor;
  const dHeight = renderHeight * zoom * scaleFactor;

  // Position calculations (centered, offset by user drag, scaled to canvas size)
  const dx = (targetWidth / 2) + (x * scaleFactor) - (dWidth / 2);
  const dy = (targetHeight / 2) + (y * scaleFactor) - (dHeight / 2);

  // Draw image onto canvas
  ctx.drawImage(img, dx, dy, dWidth, dHeight);

  // Convert canvas to Blob
  const blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9);
  });

  if (!blob) {
    throw new Error('Canvas conversion to Blob failed.');
  }

  // Create a File object from the blob
  const croppedFile = new File([blob], 'cropped_thumbnail.jpg', { type: 'image/jpeg' });

  // Apply client-side size compression
  const compressionOptions = {
    maxSizeMB: 0.15, // 150KB limit
    maxWidthOrHeight: 800,
    useWebWorker: true,
  };

  const compressedFile = await imageCompression(croppedFile, compressionOptions);
  return compressedFile;
}
