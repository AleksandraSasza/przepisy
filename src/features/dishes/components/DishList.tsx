import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DishCard } from './DishCard';
import type { DishWithIngredients, Tag } from '@/types/database';

interface DishListProps {
  dishes: DishWithIngredients[];
  tags: Tag[];
  loading: boolean;
  onDishClick: (dish: DishWithIngredients) => void;
  onAddClick: () => void;
  onToggleFavorite: (dishId: string, favorite: boolean) => void;
}

export function DishList({ dishes, tags, loading, onDishClick, onAddClick, onToggleFavorite }: DishListProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-gray-500">Ładowanie...</p>
        </CardContent>
      </Card>
    );
  }

  if (dishes.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-gray-500 mb-4">
            Brak przepisów spełniających kryteria filtrowania
          </p>
          <Button onClick={onAddClick}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj pierwszy przepis
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {dishes.map(dish => (
        <DishCard
          key={dish.id}
          dish={dish}
          tags={tags}
          onClick={() => onDishClick(dish)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}

