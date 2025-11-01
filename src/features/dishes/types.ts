// Re-export types from main database types for convenience
export type {
  Dish,
  DishWithIngredients,
  Product,
  Tag,
  DishIngredient
} from '@/types/database';

// Feature-specific types
export interface DishFormData {
  name: string;
  sourceUrl: string;
  imageUrl: string;
}

export interface IngredientFormData {
  productId: string;
  quantity: string;
  unit: string;
}

