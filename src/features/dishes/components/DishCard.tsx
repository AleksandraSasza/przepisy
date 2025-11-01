import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import type { DishWithIngredients, Tag } from '@/types/database';

interface DishCardProps {
  dish: DishWithIngredients;
  tags: Tag[];
  onClick: () => void;
  onToggleFavorite: (dishId: string, favorite: boolean) => void;
}

export function DishCard({ dish, tags, onClick, onToggleFavorite }: DishCardProps) {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Zapobiega wywołaniu onClick karty
    onToggleFavorite(dish.id, !dish.favorite);
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow relative"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle>{dish.name}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 ml-2"
            onClick={handleFavoriteClick}
            aria-label={dish.favorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
          >
            <Heart
              className={`h-5 w-5 transition-colors ${
                dish.favorite
                  ? 'fill-[#66323A] text-[#66323A]'
                  : 'fill-none text-gray-400 hover:text-gray-600'
              }`}
            />
          </Button>
        </div>
        <CardDescription>
          Dodano: {new Date(dish.created_at).toLocaleDateString('pl-PL')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Ingredients */}
        {dish.dish_ingredients.length > 0 && (
          <div className="mb-3">
            <p className="text-sm font-semibold mb-2">Składniki:</p>
            <div className="flex flex-wrap gap-1">
              {dish.dish_ingredients.slice(0, 3).map((ing, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {ing.products.name}
                </Badge>
              ))}
              {dish.dish_ingredients.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{dish.dish_ingredients.length - 3} więcej
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {dish.dish_tags && dish.dish_tags.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">Tagi:</p>
            <div className="flex flex-wrap gap-1">
              {dish.dish_tags.map((dt, idx) => {
                const tag = tags.find(t => t.id === dt.tag_id);
                return tag ? (
                  <Badge key={idx} className="bg-[#57221B] text-white text-xs">
                    {tag.name}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Source link */}
        {dish.source_url && (
          <div className="mt-3">
            <a
              href={dish.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Zobacz przepis →
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

