import { useState, useEffect, useMemo } from 'react';
import type { DishWithIngredients } from '@/types/database';

export type SortOption = 'name-asc' | 'name-desc' | 'newest' | 'oldest' | 'favorites';

export function useDishFilters(dishes: DishWithIngredients[]) {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filteredDishes, setFilteredDishes] = useState<DishWithIngredients[]>([]);

  useEffect(() => {
    let result = [...dishes];

    // Filter by products
    if (selectedProducts.length > 0) {
      result = result.filter(dish =>
        selectedProducts.every(productId =>
          dish.dish_ingredients.some(ing => ing.products.id === productId)
        )
      );
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      result = result.filter(dish =>
        dish.dish_tags && dish.dish_tags.length > 0 && selectedTags.every(tagId =>
          dish.dish_tags!.some(dt => dt.tag_id === tagId)
        )
      );
    }

    // Sort
    switch (sortBy) {
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'favorites':
        // Najpierw ulubione (true), potem nieulubione (false)
        result.sort((a, b) => {
          if (a.favorite === b.favorite) {
            // Jeśli oba mają ten sam status ulubionych, sortuj po dacie (najnowsze pierwsze)
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return a.favorite ? -1 : 1;
        });
        break;
    }

    setFilteredDishes(result);
  }, [dishes, selectedProducts, selectedTags, sortBy]);

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const clearFilters = () => {
    setSelectedProducts([]);
    setSelectedTags([]);
  };

  const hasActiveFilters = selectedProducts.length > 0 || selectedTags.length > 0;

  return {
    filteredDishes,
    selectedProducts,
    selectedTags,
    sortBy,
    setSortBy,
    toggleProduct,
    toggleTag,
    clearFilters,
    hasActiveFilters
  };
}

