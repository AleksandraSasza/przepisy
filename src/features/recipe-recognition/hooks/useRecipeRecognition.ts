import { useState } from 'react';
import { toast } from 'sonner';
import type { RecognizedRecipe } from '../types';

export function useRecipeRecognition() {
  const [recognizing, setRecognizing] = useState(false);

  const recognizeRecipe = async (
    file: File | null,
    imageUrl: string | null,
    sourceUrl: string | null
  ): Promise<RecognizedRecipe | null> => {
    if (!file && !imageUrl && !sourceUrl) {
      toast.error('Wybierz zdjęcie lub podaj link');
      return null;
    }

    setRecognizing(true);
    toast.info('Rozpoznawanie przepisu...');

    try {
      const formData = new FormData();
      
      if (file) {
        formData.append('file', file);
      } else if (imageUrl) {
        formData.append('imageUrl', imageUrl);
      } else if (sourceUrl) {
        formData.append('sourceUrl', sourceUrl);
      }

      const response = await fetch('/api/recognize-recipe', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Błąd podczas rozpoznawania');
      }

      const data: RecognizedRecipe = await response.json();
      
      toast.success('Przepis został rozpoznany!');
      return data;
    } catch (error: any) {
      console.error('Error recognizing recipe:', error);
      toast.error(error.message || 'Nie udało się rozpoznać przepisu');
      return null;
    } finally {
      setRecognizing(false);
    }
  };

  return {
    recognizing,
    recognizeRecipe
  };
}

