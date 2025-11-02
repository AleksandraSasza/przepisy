'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Package, Tag as TagIcon, X } from 'lucide-react';
import type { Product, Tag } from '@/types/database';
import type { SortOption } from '../hooks/useDishFilters';

interface MobileFriendlyFiltersProps {
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

export function MobileFriendlyFilters({
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
}: MobileFriendlyFiltersProps) {
  const [isProductsDialogOpen, setIsProductsDialogOpen] = useState(false);
  const [isTagsDialogOpen, setIsTagsDialogOpen] = useState(false);
  const [isSortDialogOpen, setIsSortDialogOpen] = useState(false);

  const sortLabels = {
    newest: 'Najnowsze',
    oldest: 'Najstarsze',
    'name-asc': 'Nazwa A-Z',
    'name-desc': 'Nazwa Z-A',
    favorites: 'Ulubione'
  };

  return (
    <div className="space-y-3">
      {/* Przyciski filtrowania */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => setIsProductsDialogOpen(true)}
          className="flex-1 md:flex-initial"
        >
          <Package className="h-4 w-4 mr-2" />
          Produkty
          {selectedProducts.length > 0 && (
            <Badge variant="default" className="ml-2 bg-[#57221B]">
              {selectedProducts.length}
            </Badge>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={() => setIsTagsDialogOpen(true)}
          className="flex-1 md:flex-initial"
        >
          <TagIcon className="h-4 w-4 mr-2" />
          Tagi
          {selectedTags.length > 0 && (
            <Badge variant="default" className="ml-2 bg-[#57221B]">
              {selectedTags.length}
            </Badge>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={() => setIsSortDialogOpen(true)}
          className="flex-1 md:flex-initial"
          title={sortLabels[sortBy]}
        >
          <Filter className="h-4 w-4 mr-2" />
          Sortuj: {sortLabels[sortBy]}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-red-600 hover:text-red-700"
          >
            <X className="h-4 w-4 mr-1" />
            Wyczyść
          </Button>
        )}
      </div>

      {/* Wybrane filtry jako chipy */}
      {(selectedProducts.length > 0 || selectedTags.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {selectedProducts.map(productId => {
            const product = products.find(p => p.id === productId);
            return product ? (
              <Badge
                key={productId}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => onProductToggle(productId)}
              >
                <Package className="h-3 w-3 mr-1" />
                {product.name}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ) : null;
          })}
          {selectedTags.map(tagId => {
            const tag = tags.find(t => t.id === tagId);
            return tag ? (
              <Badge
                key={tagId}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => onTagToggle(tagId)}
              >
                <TagIcon className="h-3 w-3 mr-1" />
                {tag.name}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ) : null;
          })}
        </div>
      )}

      {/* Dialog produktów */}
      <Dialog open={isProductsDialogOpen} onOpenChange={setIsProductsDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Wybierz produkty</DialogTitle>
            <DialogDescription>
              Zaznacz produkty, po których chcesz filtrować przepisy
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 mt-4">
            {products.map(product => (
              <Badge
                key={product.id}
                variant={selectedProducts.includes(product.id) ? 'default' : 'outline'}
                className="cursor-pointer"
                style={selectedProducts.includes(product.id) ? { backgroundColor: '#57221B', borderColor: '#57221B' } : {}}
                onClick={() => onProductToggle(product.id)}
              >
                {product.name}
              </Badge>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsProductsDialogOpen(false)}>
              Gotowe
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog tagów */}
      <Dialog open={isTagsDialogOpen} onOpenChange={setIsTagsDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Wybierz tagi</DialogTitle>
            <DialogDescription>
              Zaznacz tagi, po których chcesz filtrować przepisy
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 mt-4">
            {tags.map(tag => (
              <Badge
                key={tag.id}
                variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                className="cursor-pointer"
                style={selectedTags.includes(tag.id) ? { backgroundColor: '#57221B', borderColor: '#57221B' } : {}}
                onClick={() => onTagToggle(tag.id)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsTagsDialogOpen(false)}>
              Gotowe
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog sortowania */}
      <Dialog open={isSortDialogOpen} onOpenChange={setIsSortDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sortuj przepisy</DialogTitle>
            <DialogDescription>
              Wybierz sposób sortowania przepisów
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {(Object.keys(sortLabels) as SortOption[]).map(option => (
              <Button
                key={option}
                variant={sortBy === option ? 'default' : 'outline'}
                className="w-full justify-start"
                style={sortBy === option ? { backgroundColor: '#57221B', borderColor: '#57221B' } : {}}
                onClick={() => {
                  onSortChange(option);
                  setIsSortDialogOpen(false);
                }}
              >
                {sortLabels[option]}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

