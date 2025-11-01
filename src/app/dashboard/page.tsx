'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, Tags, Package, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDishes } from '@/features/dishes/hooks/useDishes';
import { useDishFilters } from '@/features/dishes/hooks/useDishFilters';
import { DishFilters } from '@/features/dishes/components/DishFilters';
import { DishList } from '@/features/dishes/components/DishList';
import { AddDishDialog } from '@/components/AddDishDialog';
import { DishDetailsDialog } from '@/components/DishDetailsDialog';
import { SidebarMenu } from '@/components/SidebarMenu';
import { TagsManagement } from '@/components/TagsManagement';
import { ProductsManagement } from '@/components/ProductsManagement';
import { AccountSettings } from '@/components/AccountSettings';
import { dishService } from '@/features/dishes/services/dishService';
import { toast } from 'sonner';
import type { DishWithIngredients } from '@/types/database';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  
  const {
    dishes,
    products,
    tags,
    loading: dataLoading,
    loadData,
    addProduct,
    addTag,
    removeDish,
    removeProduct,
    removeTag,
    updateDish
  } = useDishes(user?.id || null);

  const {
    filteredDishes,
    selectedProducts,
    selectedTags,
    sortBy,
    setSortBy,
    toggleProduct,
    toggleTag,
    clearFilters,
    hasActiveFilters
  } = useDishFilters(dishes);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDish, setSelectedDish] = useState<DishWithIngredients | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState<'main' | 'tags' | 'products' | 'account'>('main');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Load data when user is available
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      loadData();
    }
  }, [user, authLoading, router, loadData]);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleDishClick = (dish: DishWithIngredients) => {
    setSelectedDish(dish);
    setIsDetailsDialogOpen(true);
  };

  const handleDishSuccess = () => {
    loadData(); // Reload all data
    setIsAddDialogOpen(false);
  };

  const handleDishDelete = (dishId: string) => {
    removeDish(dishId);
    setIsDetailsDialogOpen(false);
  };

  const handleToggleFavorite = async (dishId: string, favorite: boolean) => {
    // Optymistyczne zaktualizowanie UI
    updateDish(dishId, { favorite });
    
    try {
      await dishService.toggleFavorite(dishId, favorite);
      // Jeśli zapis się powiódł, stan już jest zaktualizowany
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      // Cofnij zmianę w przypadku błędu
      updateDish(dishId, { favorite: !favorite });
      toast.error('Błąd podczas aktualizacji ulubionych');
    }
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Ładowanie...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleViewChange = (view: 'main' | 'tags' | 'products' | 'account') => {
    setActiveView(view);
    if (view !== 'main') {
      setIsMenuOpen(true);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <SidebarMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        {activeView === 'main' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Menu</h3>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleViewChange('tags')}
            >
              <Tags className="h-4 w-4 mr-2" />
              Zarządzaj tagami
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleViewChange('products')}
            >
              <Package className="h-4 w-4 mr-2" />
              Zarządzaj produktami
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleViewChange('account')}
            >
              <User className="h-4 w-4 mr-2" />
              Zarządzanie kontem
            </Button>
          </div>
        )}
        {activeView === 'tags' && (
          <TagsManagement
            tags={tags}
            userId={user.id}
            onTagAdded={(tag) => {
              addTag(tag);
              loadData();
            }}
            onTagDeleted={(tagId) => {
              removeTag(tagId);
              loadData();
            }}
            onClose={() => handleViewChange('main')}
          />
        )}
        {activeView === 'products' && (
          <ProductsManagement
            products={products.filter(p => p.user_id === user.id)}
            userId={user.id}
            onProductAdded={(product) => {
              addProduct(product);
              loadData();
            }}
            onProductDeleted={(productId) => {
              removeProduct(productId);
              loadData();
            }}
            onClose={() => handleViewChange('main')}
          />
        )}
        {activeView === 'account' && (
          <AccountSettings
            user={user}
            onSignOut={handleSignOut}
            onClose={() => handleViewChange('main')}
          />
        )}
      </SidebarMenu>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Moje Przepisy</h1>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>

        {/* Filters */}
        <DishFilters
          products={products}
          tags={tags}
          selectedProducts={selectedProducts}
          selectedTags={selectedTags}
          sortBy={sortBy}
          hasActiveFilters={hasActiveFilters}
          onProductToggle={toggleProduct}
          onTagToggle={toggleTag}
          onSortChange={setSortBy}
          onClearFilters={clearFilters}
        />

        {/* Add button */}
        <div className="mb-6">
          <Button size="lg" onClick={() => setIsAddDialogOpen(true)} className="w-full md:w-auto">
            <Plus className="mr-2 h-5 w-5" />
            Dodaj nowy przepis
          </Button>
        </div>

        {/* Dish list */}
        <DishList
          dishes={filteredDishes}
          tags={tags}
          loading={dataLoading}
          onDishClick={handleDishClick}
          onAddClick={() => setIsAddDialogOpen(true)}
          onToggleFavorite={handleToggleFavorite}
        />

        {/* Dialogs */}
        <AddDishDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          userId={user.id}
          products={products}
          tags={tags}
          onSuccess={handleDishSuccess}
          onProductAdded={addProduct}
          onTagAdded={addTag}
        />

        <DishDetailsDialog
          dish={selectedDish}
          open={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
          products={products}
          tags={tags}
          onSuccess={loadData}
          onProductAdded={addProduct}
          onTagAdded={addTag}
          onDelete={handleDishDelete}
          onToggleFavorite={handleToggleFavorite}
        />
      </div>
    </div>
  );
}
