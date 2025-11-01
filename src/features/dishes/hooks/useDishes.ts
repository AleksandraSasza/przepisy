import { useState, useCallback } from 'react';
import { dishService } from '../services/dishService';
import type { DishWithIngredients, Product, Tag } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function useDishes(userId: string | null) {
  const [dishes, setDishes] = useState<DishWithIngredients[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    const supabase = createClient();

    try {
      // Load dishes
      const dishesData = await dishService.getAll(userId);
      setDishes(dishesData);

      // Load products (global + user's)
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${userId}`)
        .order('name');

      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Load tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (tagsError) throw tagsError;
      setTags(tagsData || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Błąd ładowania danych');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const addProduct = useCallback((product: Product) => {
    setProducts(prev => [...prev, product].sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  const addTag = useCallback((tag: Tag) => {
    setTags(prev => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  const removeDish = useCallback((dishId: string) => {
    setDishes(prev => prev.filter(d => d.id !== dishId));
  }, []);

  const removeProduct = useCallback((productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  }, []);

  const removeTag = useCallback((tagId: string) => {
    setTags(prev => prev.filter(t => t.id !== tagId));
  }, []);

  const updateDish = useCallback((dishId: string, updates: Partial<DishWithIngredients>) => {
    setDishes(prev => prev.map(d => 
      d.id === dishId ? { ...d, ...updates } : d
    ));
  }, []);

  return {
    dishes,
    products,
    tags,
    loading,
    loadData,
    addProduct,
    addTag,
    removeDish,
    removeProduct,
    removeTag,
    updateDish
  };
}

