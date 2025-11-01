import { createClient } from '@/lib/supabase/client';
import type { DishWithIngredients } from '@/types/database';

export interface NewDish {
  user_id: string;
  name: string;
  source_url?: string | null;
  image_url?: string | null;
}

export interface NewIngredient {
  product_id: string;
  quantity: number;
  unit_code: string;
}

export const dishService = {
  async getAll(userId: string): Promise<DishWithIngredients[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('dishes')
      .select(`
        *,
        dish_ingredients (
          quantity,
          unit_code,
          products (
            id,
            name
          )
        ),
        dish_tags (
          tag_id
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching dishes:', error);
      throw error;
    }

    return data || [];
  },

  async create(dish: NewDish, ingredients: NewIngredient[], tagIds: string[]): Promise<string> {
    const supabase = createClient();

    // Create dish
    const { data: newDish, error: dishError } = await supabase
      .from('dishes')
      .insert(dish)
      .select()
      .single();

    if (dishError) throw dishError;

    // Add ingredients
    if (ingredients.length > 0) {
      const ingredientsToInsert = ingredients.map(ing => ({
        dish_id: newDish.id,
        ...ing
      }));

      const { error: ingredientsError } = await supabase
        .from('dish_ingredients')
        .insert(ingredientsToInsert);

      if (ingredientsError) throw ingredientsError;
    }

    // Add tags
    if (tagIds.length > 0) {
      const tagsToInsert = tagIds.map(tagId => ({
        dish_id: newDish.id,
        tag_id: tagId
      }));

      const { error: tagsError } = await supabase
        .from('dish_tags')
        .insert(tagsToInsert);

      if (tagsError) throw tagsError;
    }

    return newDish.id;
  },

  async update(
    dishId: string,
    updates: Partial<NewDish>,
    ingredients: NewIngredient[],
    tagIds: string[]
  ): Promise<void> {
    const supabase = createClient();

    // Update dish
    const { error: dishError } = await supabase
      .from('dishes')
      .update(updates)
      .eq('id', dishId);

    if (dishError) throw dishError;

    // Delete and re-add ingredients
    await supabase.from('dish_ingredients').delete().eq('dish_id', dishId);

    if (ingredients.length > 0) {
      const ingredientsToInsert = ingredients.map(ing => ({
        dish_id: dishId,
        ...ing
      }));

      const { error: ingredientsError } = await supabase
        .from('dish_ingredients')
        .insert(ingredientsToInsert);

      if (ingredientsError) throw ingredientsError;
    }

    // Delete and re-add tags
    await supabase.from('dish_tags').delete().eq('dish_id', dishId);

    if (tagIds.length > 0) {
      const tagsToInsert = tagIds.map(tagId => ({
        dish_id: dishId,
        tag_id: tagId
      }));

      const { error: tagsError } = await supabase
        .from('dish_tags')
        .insert(tagsToInsert);

      if (tagsError) throw tagsError;
    }
  },

  async delete(dishId: string): Promise<void> {
    const supabase = createClient();

    // Ingredients and tags will be deleted via CASCADE
    const { error } = await supabase
      .from('dishes')
      .delete()
      .eq('id', dishId);

    if (error) throw error;
  },

  async toggleFavorite(dishId: string, favorite: boolean): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('dishes')
      .update({ favorite })
      .eq('id', dishId);

    if (error) throw error;
  }
};

