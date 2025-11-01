import { createClient } from '@/lib/supabase/client';

export const storageService = {
  async uploadFile(file: File, userId: string): Promise<string> {
    const supabase = createClient();
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    console.log('Uploading file:', fileName, 'Type:', file.type, 'Size:', file.size);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('dish-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    console.log('Upload successful:', uploadData);

    const { data } = supabase.storage
      .from('dish-images')
      .getPublicUrl(fileName);

    console.log('Public URL:', data.publicUrl);
    
    return data.publicUrl;
  },

  async deleteFile(url: string): Promise<void> {
    if (!url || !url.includes('/storage/v1/object/public/dish-images/')) {
      return; // Not a storage URL, skip
    }

    const supabase = createClient();
    const urlParts = url.split('/dish-images/');
    
    if (urlParts.length > 1) {
      const filePath = urlParts[1];
      
      const { error } = await supabase.storage
        .from('dish-images')
        .remove([filePath]);

      if (error) {
        console.error('Error deleting file from storage:', error);
        throw error;
      }

      console.log('File deleted from storage:', filePath);
    }
  },

  extractFilePath(url: string): string | null {
    if (!url || !url.includes('/storage/v1/object/public/dish-images/')) {
      return null;
    }

    const urlParts = url.split('/dish-images/');
    return urlParts.length > 1 ? urlParts[1] : null;
  }
};

