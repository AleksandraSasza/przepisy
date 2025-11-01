import { useState } from 'react';
import { storageService } from '../services/storageService';
import { toast } from 'sonner';

export interface ImageUploadResult {
  file: File;
  preview: string;
  url?: string;
}

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);

  const convertHeicToJpg = async (file: File): Promise<File> => {
    if (!file.name.toLowerCase().endsWith('.heic') && file.type !== 'image/heic') {
      return file;
    }

    toast.info('Konwertuję zdjęcie HEIC do JPG...');
    
    const heic2any = (await import('heic2any')).default;
    
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9
    });

    const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
    const convertedFile = new File(
      [blob], 
      file.name.replace(/\.heic$/i, '.jpg'), 
      { type: 'image/jpeg' }
    );
    
    toast.success('Zdjęcie skonwertowane!');
    return convertedFile;
  };

  const processFile = async (file: File): Promise<{ file: File; preview: string }> => {
    // Convert HEIC if needed
    const processedFile = await convertHeicToJpg(file);

    // Create preview
    let preview = 'PDF';
    
    if (processedFile.type.startsWith('image/')) {
      preview = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(processedFile);
      });
    }

    return { file: processedFile, preview };
  };

  const uploadImage = async (file: File, userId: string): Promise<string> => {
    setUploading(true);
    try {
      const processedFile = await convertHeicToJpg(file);
      const url = await storageService.uploadFile(processedFile, userId);
      toast.success('Plik został przesłany!');
      return url;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(`Nie udało się przesłać pliku: ${error.message || 'Nieznany błąd'}`);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (url: string): Promise<void> => {
    try {
      await storageService.deleteFile(url);
      toast.success('Plik usunięty z serwera');
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast.error('Nie udało się usunąć pliku z serwera');
      throw error;
    }
  };

  return {
    uploading,
    processFile,
    uploadImage,
    deleteImage,
    convertHeicToJpg
  };
}

