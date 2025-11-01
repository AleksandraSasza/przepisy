import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X } from 'lucide-react';
import type { Product, Tag } from '@/types/database';
import type { SortOption } from '../hooks/useDishFilters';

interface DishFiltersProps {
  products: Product[];
  tags: Tag[];
  selectedProducts: string[];
  selectedTags: string[];
  sortBy: SortOption;
  hasActiveFilters: boolean;
  onProductToggle: (productId: string) => void;
  onTagToggle: (tagId: string) => void;
  onSortChange: (sortBy: SortOption) => void;
  onClearFilters: () => void;
}

export function DishFilters({
  products,
  tags,
  selectedProducts,
  selectedTags,
  sortBy,
  hasActiveFilters,
  onProductToggle,
  onTagToggle,
  onSortChange,
  onClearFilters
}: DishFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtry i sortowanie
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-1" />
              Wyczyść filtry
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Products filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Produkty ({selectedProducts.length} wybrane)
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {products.map(product => (
                <Badge
                  key={product.id}
                  variant={selectedProducts.includes(product.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => onProductToggle(product.id)}
                >
                  {product.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Tags filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Tagi ({selectedTags.length} wybrane)
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {tags.map(tag => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => onTagToggle(tag.id)}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Sortowanie
            </label>
            <Select
              value={sortBy}
              onValueChange={(value) => onSortChange(value as SortOption)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Najnowsze</SelectItem>
                <SelectItem value="oldest">Najstarsze</SelectItem>
                <SelectItem value="name-asc">Nazwa A-Z</SelectItem>
                <SelectItem value="name-desc">Nazwa Z-A</SelectItem>
                <SelectItem value="favorites">Ulubione</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

