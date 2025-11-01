export interface Database {
  public: {
    Tables: {
      dishes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          source_url: string | null;
          image_url: string | null;
          created_at: string;
          favorite: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          source_url?: string | null;
          image_url?: string | null;
          created_at?: string;
          favorite?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          source_url?: string | null;
          image_url?: string | null;
          created_at?: string;
          favorite?: boolean;
        };
      };
      products: {
        Row: {
          id: string;
          user_id: string;
          name: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
        };
      };
      default_products: {
        Row: {
          id: string;
          name: string;
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
      };
      dish_ingredients: {
        Row: {
          id: string;
          dish_id: string;
          product_id: string;
          quantity: number | null;
          unit_code: string | null;
        };
        Insert: {
          id?: string;
          dish_id: string;
          product_id: string;
          quantity?: number | null;
          unit_code?: string | null;
        };
        Update: {
          id?: string;
          dish_id?: string;
          product_id?: string;
          quantity?: number | null;
          unit_code?: string | null;
        };
      };
      tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
        };
      };
      dish_tags: {
        Row: {
          id: string;
          dish_id: string;
          tag_id: string;
        };
        Insert: {
          id?: string;
          dish_id: string;
          tag_id: string;
        };
        Update: {
          id?: string;
          dish_id?: string;
          tag_id?: string;
        };
      };
    };
  };
}

export type Dish = Database['public']['Tables']['dishes']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type DishIngredient = Database['public']['Tables']['dish_ingredients']['Row'];
export type Tag = Database['public']['Tables']['tags']['Row'];

export interface DishWithIngredients extends Dish {
  dish_ingredients: (DishIngredient & {
    products: Product;
  })[];
  dish_tags?: { tag_id: string }[];
}

export const UNITS = [
  { value: 'szt', label: 'szt.' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'l', label: 'l' },
  { value: 'łyżka', label: 'łyżka' },
  { value: 'łyżeczka', label: 'łyżeczka' },
  { value: 'szklanka', label: 'szklanka' },
] as const;

