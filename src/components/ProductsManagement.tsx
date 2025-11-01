'use client';

import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Trash2, Plus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Product } from '@/types/database';

interface ProductsManagementProps {
  products: Product[];
  userId: string;
  onProductAdded: (product: Product) => void;
  onProductDeleted: (productId: string) => void;
  onClose: () => void;
}

type SortOption = 'alphabetical' | 'date';

export function ProductsManagement({
  products,
  userId,
  onProductAdded,
  onProductDeleted,
  onClose
}: ProductsManagementProps) {
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical');
  const [newProductName, setNewProductName] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [loading, setLoading] = useState(false);

  const sortedProducts = useMemo(() => {
    const sorted = [...products];
    
    if (sortBy === 'alphabetical') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    } else if (sortBy === 'date') {
      // Jeśli nie ma created_at, sortujemy po ID (proxies for creation order)
      sorted.sort((a, b) => b.id.localeCompare(a.id));
    }
    
    return sorted;
  }, [products, sortBy]);

  const handleAddProduct = async () => {
    if (!newProductName.trim()) {
      toast.error('Podaj nazwę produktu');
      return;
    }

    // Sprawdź czy produkt już istnieje
    if (products.some(p => p.name.toLowerCase().trim() === newProductName.toLowerCase().trim())) {
      toast.error('Produkt o tej nazwie już istnieje');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('products')
      .insert({ user_id: userId, name: newProductName.trim() })
      .select()
      .single();

    setLoading(false);

    if (error) {
      console.error('Error adding product:', error);
      toast.error(`Błąd podczas dodawania produktu: ${error.message}`);
      return;
    }

    if (!data) {
      toast.error('Nie udało się dodać produktu');
      return;
    }

    toast.success(`Produkt "${newProductName}" został dodany`);
    onProductAdded(data);
    setNewProductName('');
    setIsAddingProduct(false);
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć produkt "${productName}"?`)) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      console.error('Error deleting product:', error);
      toast.error(`Błąd podczas usuwania produktu: ${error.message}`);
      return;
    }

    toast.success('Produkt został usunięty');
    onProductDeleted(productId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Zarządzanie produktami</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Sortowanie */}
      <div>
        <Label>Sortowanie</Label>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alphabetical">Alfabetycznie (A-Z)</SelectItem>
            <SelectItem value="date">Data dodania (najnowsze)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dodawanie nowego produktu */}
      {isAddingProduct ? (
        <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
          <Label className="text-blue-900">Nowy produkt</Label>
          <div className="flex gap-2 mt-2">
            <Input
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              placeholder="Nazwa produktu"
              className="bg-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddProduct();
                } else if (e.key === 'Escape') {
                  setIsAddingProduct(false);
                  setNewProductName('');
                }
              }}
            />
            <Button onClick={handleAddProduct} disabled={loading}>
              Dodaj
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingProduct(false);
                setNewProductName('');
              }}
            >
              Anuluj
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setIsAddingProduct(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Dodaj nowy produkt
        </Button>
      )}

      {/* Lista produktów */}
      <div className="space-y-2">
        <h3 className="font-semibold">Moje produkty ({sortedProducts.length})</h3>
        {sortedProducts.length === 0 ? (
          <p className="text-gray-500 text-sm">Nie masz jeszcze żadnych produktów</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sortedProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <span className="font-medium">{product.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteProduct(product.id, product.name)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

