import type { Product } from '@/types/database';

export interface RecognizedIngredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface RecognizedRecipe {
  name: string;
  ingredients: RecognizedIngredient[];
  tags?: string[];
}

export interface ProductMatch {
  recognizedName: string;
  recognizedQuantity: string;
  recognizedUnit: string;
  matchedProduct: Product | null;
  matchScore: number;
  suggestions: Product[];
  action: 'use_existing' | 'create_new' | 'edit';
  editedName?: string;
  selectedProductId?: string; // ID wybranego produktu z listy
}
