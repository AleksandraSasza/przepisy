'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from './ui/select';
import { Badge } from './ui/badge';
import { CheckCircle2, Trash2 } from 'lucide-react';
import type { ProductMatch } from '@/features/recipe-recognition/types';
import type { Product } from '@/types/database';

interface ProductMatchingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: ProductMatch[];
  allProducts: Product[];
  onConfirm: (confirmedMatches: ProductMatch[]) => void;
}

export function ProductMatchingDialog({
  open,
  onOpenChange,
  matches,
  allProducts,
  onConfirm
}: ProductMatchingDialogProps) {
  const [editedMatches, setEditedMatches] = useState<ProductMatch[]>(matches);

  // Aktualizuj lokalny stan gdy matches się zmienia
  useEffect(() => {
    setEditedMatches(matches);
  }, [matches]);

  const updateMatch = (index: number, updates: Partial<ProductMatch>) => {
    const updated = [...editedMatches];
    updated[index] = { ...updated[index], ...updates };
    setEditedMatches(updated);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const match = editedMatches[index];
    // Szukaj produktu w sugestiach, dopasowaniu lub całej liście produktów
    const selectedProduct = 
      match.suggestions.find(p => p.id === productId) || 
      (match.matchedProduct?.id === productId ? match.matchedProduct : null) ||
      allProducts.find(p => p.id === productId) || null;
    
    updateMatch(index, {
      action: 'use_existing',
      selectedProductId: productId,
      matchedProduct: selectedProduct || null
    });
  };

  const handleEditName = (index: number, editedName: string) => {
    const trimmedName = editedName.trim();
    updateMatch(index, {
      action: trimmedName && trimmedName !== editedMatches[index].recognizedName ? 'edit' : 'create_new',
      editedName: trimmedName || editedMatches[index].recognizedName
    });
  };

  const getMatchStatus = (match: ProductMatch) => {
    if (match.action === 'use_existing' && match.selectedProductId) {
      return 'matched';
    }
    if (match.action === 'create_new') {
      return 'new';
    }
    if (match.action === 'edit') {
      return 'edited';
    }
    return 'pending';
  };

  const getMatchColor = (status: string) => {
    switch (status) {
      case 'matched':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'edited':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'new':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  const handleConfirm = () => {
    onConfirm(editedMatches);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Zweryfikuj rozpoznane produkty</DialogTitle>
          <DialogDescription>
            Sprawdź i popraw dopasowania produktów. Wybierz istniejący produkt z listy lub utwórz nowy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {editedMatches.map((match, index) => {
            const status = getMatchStatus(match);
            const hasNoMatch = !match.matchedProduct && match.suggestions.length === 0;
            const hasProductsInDb = allProducts.length > 0;

            return (
              <div
                key={index}
                className={`p-4 border-2 rounded-lg ${getMatchColor(status)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Nazwa produktu i ilość */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-sm">
                        {match.recognizedName}
                      </Badge>
                      {(match.recognizedQuantity || match.recognizedUnit) && (
                        <span className="text-sm text-gray-600">
                          {match.recognizedQuantity} {match.recognizedUnit}
                        </span>
                      )}
                      {status === 'matched' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                    </div>

                    {/* Informacja o braku produktu */}
                    {hasNoMatch && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800 font-medium">
                          ⚠️ Nie znaleziono produktu "{match.recognizedName}" w bazie
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Czy chcesz utworzyć nowy produkt o tej nazwie?
                        </p>
                      </div>
                    )}

                    {/* Input z nazwą produktu (zawsze widoczny, edytowalny) */}
                    <div className="space-y-2">
                      <Label>Nazwa produktu:</Label>
                      <Input
                        value={match.editedName || match.recognizedName}
                        onChange={(e) => handleEditName(index, e.target.value)}
                        placeholder="Wpisz nazwę produktu"
                        className="bg-white"
                      />
                      <p className="text-xs text-gray-500 italic">
                        Rozpoznano: "{match.recognizedName}"
                      </p>
                    </div>

                    {/* Kreska z informacją lub dropdown */}
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-300" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-white px-2 text-gray-500">
                          Lub wybierz produkt z listy
                        </span>
                      </div>
                    </div>

                    {/* Dropdown z produktami z bazy */}
                    {hasProductsInDb && (
                      <div>
                        <Label className="text-xs mb-1 block">Wybierz z istniejących produktów:</Label>
                        <Select
                          value={match.selectedProductId || ''}
                          onValueChange={(value) => {
                            if (value === '__clear__') {
                              updateMatch(index, {
                                action: 'create_new',
                                selectedProductId: undefined,
                                matchedProduct: null
                              });
                            } else {
                              handleProductSelect(index, value);
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Wybierz produkt z listy" />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Opcja wyczyszczenia jeśli coś wybrano */}
                            {match.selectedProductId && (
                              <>
                                <SelectItem value="__clear__">
                                  <span className="text-gray-500 italic">Brak wyboru</span>
                                </SelectItem>
                                <SelectSeparator />
                              </>
                            )}
                            {match.matchedProduct && (
                              <SelectItem value={match.matchedProduct.id}>
                                {match.matchedProduct.name}
                                <span className="ml-2 text-xs text-gray-500">
                                  (dopasowanie: {Math.round((1 - match.matchScore) * 100)}%)
                                </span>
                              </SelectItem>
                            )}
                            {/* Pokaż najpierw sugestie */}
                            {match.suggestions
                              .filter(p => p.id !== match.matchedProduct?.id)
                              .map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            {/* Jeśli brak sugestii, pokaż wszystkie produkty */}
                            {match.suggestions.length === 0 && (
                              <>
                                <SelectSeparator />
                                {allProducts
                                  .filter(p => p.id !== match.selectedProductId)
                                  .slice(0, 20) // Limit do 20 produktów
                                  .map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.name}
                                    </SelectItem>
                                  ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Podsumowanie na dole */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      {match.action === 'use_existing' && match.matchedProduct && (
                        <p className="text-sm text-green-700">
                          ✓ Zostanie użyty produkt: <strong>{match.matchedProduct.name}</strong>
                        </p>
                      )}
                      {match.action === 'create_new' && !match.selectedProductId && (
                        <p className="text-sm text-gray-700">
                          + Zostanie utworzony nowy produkt: <strong>{match.editedName || match.recognizedName}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Przycisk usunięcia produktu (jeśli jest więcej niż 1) */}
                  {editedMatches.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const updated = editedMatches.filter((_, i) => i !== index);
                        setEditedMatches(updated);
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
          >
            Zatwierdź i wypełnij formularz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

