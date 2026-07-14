import imageCompression from 'browser-image-compression';

export const compressImage = async (imageFile) => {
  const options = {
    maxSizeMB: 1, // Compress to max 1MB
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };
  
  try {
    const compressedFile = await imageCompression(imageFile, options);
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
};
