'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Trash2, Edit2, ExternalLink, Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Product, Tag, DishWithIngredients } from '@/types/database';
import { UNITS } from '@/types/database';

interface Ingredient {
  productId: string;
  quantity: string;
  unit: string;
}

interface DishDetailsDialogProps {
  dish: DishWithIngredients | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  tags: Tag[];
  onSuccess: () => void;
  onProductAdded: (product: Product) => void;
  onTagAdded: (tag: Tag) => void;
  onDelete: (dishId: string) => void;
  onToggleFavorite: (dishId: string, favorite: boolean) => void;
}

export function DishDetailsDialog({ 
  dish, 
  open, 
  onOpenChange, 
  products, 
  tags, 
  onSuccess, 
  onProductAdded, 
  onTagAdded,
  onDelete,
  onToggleFavorite
}: DishDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let fileToUse = file;

      // Convert HEIC to JPG
      if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
        toast.info('Konwertuję zdjęcie HEIC do JPG...');
        const heic2any = (await import('heic2any')).default;
        
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.9
        });

        // heic2any can return Blob or Blob[]
        const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        fileToUse = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { 
          type: 'image/jpeg' 
        });
        
        toast.success('Zdjęcie skonwertowane!');
      }

      setImageFile(fileToUse);

      // Create preview only for images
      if (fileToUse.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(fileToUse);
      } else {
        // For PDFs, just set a placeholder
        setImagePreview('PDF');
      }
    } catch (error: any) {
      console.error('Error processing image:', error);
      toast.error(`Błąd przetwarzania pliku: ${error.message}`);
    }
  };

  const uploadImage = async (file: File, userId: string): Promise<string | null> => {
    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      console.log('Uploading file:', fileName, 'Type:', file.type, 'Size:', file.size);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('dish-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      const { data } = supabase.storage
        .from('dish-images')
        .getPublicUrl(fileName);

      console.log('Public URL:', data.publicUrl);
      
      toast.success('Plik został przesłany!');
      return data.publicUrl;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(`Nie udało się przesłać pliku: ${error.message || 'Nieznany błąd'}`);
      return null;
    }
  };

  // Load dish data when dialog opens
  useEffect(() => {
    if (dish && open) {
      setName(dish.name);
      setSourceUrl(dish.source_url || '');
      setImageUrl(dish.image_url || '');
      setImageFile(null);
      setImagePreview(null);
      
      // Load ingredients
      const dishIngredients = dish.dish_ingredients.map(ing => ({
        productId: ing.products.id,
        quantity: ing.quantity?.toString() || '',
        unit: ing.unit_code || 'szt'
      }));
      setIngredients(dishIngredients.length > 0 ? dishIngredients : [{ productId: '', quantity: '', unit: 'szt' }]);
      
      // Load tags
      setSelectedTags(dish.dish_tags ? dish.dish_tags.map(dt => dt.tag_id) : []);
      setIsEditing(false);
    }
  }, [dish, open]);

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { productId: '', quantity: '', unit: 'szt' }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // Sprawdź czy są duplikaty składników
  const getDuplicateIngredients = () => {
    const duplicates = new Map<string, number[]>();
    
    ingredients.forEach((ing, index) => {
      if (!ing.productId) return; // Pomiń puste składniki
      
      const key = ing.productId;
      
      if (duplicates.has(key)) {
        duplicates.get(key)!.push(index);
      } else {
        duplicates.set(key, [index]);
      }
    });
    
    const duplicateIndices: number[] = [];
    duplicates.forEach(indices => {
      if (indices.length > 1) {
        duplicateIndices.push(...indices);
      }
    });
    
    return duplicateIndices;
  };

  const hasDuplicateIngredients = () => {
    return getDuplicateIngredients().length > 0;
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dish) return;
    if (!name.trim()) {
      toast.error('Podaj nazwę dania');
      return;
    }

    const validIngredients = ingredients.filter(ing => ing.productId);
    if (validIngredients.length === 0) {
      toast.error('Dodaj przynajmniej jeden składnik');
      return;
    }

    if (hasDuplicateIngredients()) {
      toast.error('Usuń zduplikowane składniki');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      // Upload new image if file selected
      let finalImageUrl = imageUrl;
      if (imageFile) {
        // Delete old file from storage if exists
        if (dish.image_url && dish.image_url.includes('/storage/v1/object/public/dish-images/')) {
          try {
            const urlParts = dish.image_url.split('/dish-images/');
            if (urlParts.length > 1) {
              const oldFilePath = urlParts[1];
              await supabase.storage.from('dish-images').remove([oldFilePath]);
              console.log('Old file deleted:', oldFilePath);
            }
          } catch (error) {
            console.error('Error deleting old file:', error);
            // Continue anyway - old file deletion is not critical
          }
        }

        const url = await uploadImage(imageFile, dish.user_id);
        if (url) {
          finalImageUrl = url;
        }
      }

      // Update dish
      const { error: dishError } = await supabase
        .from('dishes')
        .update({
          name: name.trim(),
          source_url: sourceUrl.trim() || null,
          image_url: finalImageUrl,
        })
        .eq('id', dish.id);

      if (dishError) {
        console.error('Dish update error details:', dishError);
        throw new Error(`Błąd aktualizacji dania: ${dishError.message || JSON.stringify(dishError)}`);
      }

      // Delete old ingredients
      const { error: deleteIngredientsError } = await supabase
        .from('dish_ingredients')
        .delete()
        .eq('dish_id', dish.id);

      if (deleteIngredientsError) throw deleteIngredientsError;

      // Add new ingredients
      const ingredientsToInsert = validIngredients.map(ing => ({
        dish_id: dish.id,
        product_id: ing.productId,
        quantity: parseFloat(ing.quantity) || null,
        unit_code: ing.unit,
      }));

      const { error: ingredientsError } = await supabase
        .from('dish_ingredients')
        .insert(ingredientsToInsert);

      if (ingredientsError) throw ingredientsError;

      // Update tags
      const { error: deleteTagsError } = await supabase
        .from('dish_tags')
        .delete()
        .eq('dish_id', dish.id);

      if (deleteTagsError) throw deleteTagsError;

      if (selectedTags.length > 0) {
        const tagsToInsert = selectedTags.map(tagId => ({
          dish_id: dish.id,
          tag_id: tagId,
        }));

        const { error: tagsError } = await supabase
          .from('dish_tags')
          .insert(tagsToInsert);

        if (tagsError) throw tagsError;
      }

      toast.success('Przepis został zaktualizowany!');
      setIsEditing(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error updating dish:', error);
      toast.error(`Błąd: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!dish) return;
    
    if (!confirm('Czy na pewno chcesz usunąć to danie?')) return;

    setLoading(true);
    const supabase = createClient();

    try {
      // Delete image from storage if exists
      if (dish.image_url && dish.image_url.includes('/storage/v1/object/public/dish-images/')) {
        try {
          const urlParts = dish.image_url.split('/dish-images/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabase.storage.from('dish-images').remove([filePath]);
            console.log('Image file deleted from storage:', filePath);
          }
        } catch (error) {
          console.error('Error deleting image from storage:', error);
          // Continue anyway - storage deletion is not critical
        }
      }

      // Delete dish from database
      const { error } = await supabase
        .from('dishes')
        .delete()
        .eq('id', dish.id);

      if (error) throw error;

      toast.success('Przepis został usunięty');
      onDelete(dish.id);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting dish:', error);
      toast.error(`Błąd: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!dish) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span className="flex-1">{isEditing ? 'Edytuj przepis' : dish.name}</span>
            {!isEditing && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => dish && onToggleFavorite(dish.id, !dish.favorite)}
                  aria-label={dish?.favorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                >
                  <Heart
                    className={`h-5 w-5 transition-colors ${
                      dish?.favorite
                        ? 'fill-[#66323A] text-[#66323A]'
                        : 'fill-none text-gray-400 hover:text-gray-600'
                    }`}
                  />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edytuj
                </Button>
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Edytuj szczegóły przepisu' : 'Szczegóły przepisu'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Image/PDF preview */}
          {imageUrl && !isEditing && (
            <div className="rounded-lg overflow-hidden border border-gray-200">
              {imageUrl.endsWith('.pdf') ? (
                <a 
                  href={imageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full h-64 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <div className="text-center">
                    <svg className="mx-auto h-24 w-24 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                      <path d="M14 2v6h6"/>
                      <text x="7" y="18" fontSize="4" fill="white" fontWeight="bold">PDF</text>
                    </svg>
                    <p className="mt-4 text-sm text-gray-600">Kliknij aby otworzyć PDF</p>
                  </div>
                </a>
              ) : (
                <div className="relative w-full h-64 bg-gray-50 flex items-center justify-center">
                  <img 
                    src={imageUrl} 
                    alt={name} 
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      console.error('Error loading image:', imageUrl);
                      const target = e.currentTarget as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="text-center text-red-500"><p class="text-sm">Nie można załadować zdjęcia</p><p class="text-xs mt-2 text-gray-500">URL: ' + imageUrl.substring(0, 50) + '...</p></div>';
                      }
                    }}
                    onLoad={() => console.log('Image loaded successfully:', imageUrl)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Name */}
          <div>
            <Label htmlFor="name">Nazwa dania *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Spaghetti carbonara"
              required
              disabled={!isEditing}
            />
          </div>

          {/* Source URL */}
          {(isEditing || sourceUrl) && (
            <div>
              <Label htmlFor="sourceUrl">Link do przepisu</Label>
              {isEditing ? (
                <Input
                  id="sourceUrl"
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://..."
                />
              ) : (
                <a 
                  href={sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                  {sourceUrl}
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          )}

          {/* Image/PDF Upload/URL */}
          {isEditing && (
            <div>
              <Label htmlFor="imageFile">Zdjęcie lub PDF przepisu (opcjonalnie)</Label>
              <Input
                id="imageFile"
                type="file"
                accept="image/*,.pdf,.heic"
                onChange={handleImageSelect}
                className="cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1">
                Obsługiwane formaty: JPG, PNG, WebP, PDF, HEIC (iPhone)
              </p>
              {(imagePreview || imageUrl) && (
                <div className="mt-3 space-y-2">
                  <div className="relative rounded-lg overflow-hidden border-2 border-gray-200">
                    {imagePreview === 'PDF' || imageUrl?.endsWith('.pdf') ? (
                      <div className="w-full h-48 flex items-center justify-center bg-gray-100">
                        <div className="text-center">
                          <svg className="mx-auto h-16 w-16 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                            <path d="M14 2v6h6"/>
                            <text x="7" y="18" fontSize="4" fill="white" fontWeight="bold">PDF</text>
                          </svg>
                          <p className="mt-2 text-sm text-gray-600">{imageFile?.name || 'Plik PDF'}</p>
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={imagePreview || imageUrl} 
                        alt="Podgląd"
                        className="w-full h-48 object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={async () => {
                      // Delete from Supabase Storage if it's a storage URL
                      if (imageUrl && imageUrl.includes('/storage/v1/object/public/dish-images/')) {
                        try {
                          const supabase = createClient();
                          const urlParts = imageUrl.split('/dish-images/');
                          if (urlParts.length > 1) {
                            const filePath = urlParts[1];
                            await supabase.storage.from('dish-images').remove([filePath]);
                            toast.success('Plik usunięty z serwera');
                          }
                        } catch (error) {
                          console.error('Error deleting file from storage:', error);
                          toast.error('Nie udało się usunąć pliku z serwera');
                        }
                      }
                      setImageFile(null);
                      setImagePreview(null);
                      setImageUrl('');
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Usuń plik
                  </Button>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                lub wklej link do zdjęcia/PDF:
              </p>
              <Input
                id="imageUrl"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
          )}

          {/* Ingredients */}
          <div>
            <Label className="mb-3 block">Składniki</Label>
            <div className="space-y-3">
              {ingredients.map((ing, index) => {
                const duplicateIndices = getDuplicateIngredients();
                const isDuplicate = isEditing && duplicateIndices.includes(index);
                
                return (
                  <div 
                    key={index} 
                    className={`border-2 rounded-lg p-2 ${isDuplicate ? 'border-red-500 bg-red-50' : 'border-transparent'}`}
                  >
                    <div className="flex gap-2 items-end flex-wrap sm:flex-nowrap">
                      <div className="flex-1 min-w-0">
                        <Label className="text-xs">Produkt</Label>
                        {isEditing ? (
                          <Select
                            key={`product-${index}-${ing.productId}`}
                            value={ing.productId || ''}
                            onValueChange={(value) => updateIngredient(index, 'productId', value)}
                          >
                            <SelectTrigger className={`w-full ${isDuplicate ? 'border-red-500' : ''}`}>
                              <SelectValue placeholder="Wybierz produkt" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm py-2">{products.find(p => p.id === ing.productId)?.name || '—'}</p>
                        )}
                      </div>

                      <div className="w-24">
                        <Label className="text-xs">Ilość</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={ing.quantity}
                          onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                          placeholder="0"
                          disabled={!isEditing}
                          className={isDuplicate ? 'border-red-500' : ''}
                        />
                      </div>

                      <div className="w-28">
                        <Label className="text-xs">Jednostka</Label>
                        {isEditing ? (
                          <Select
                            value={ing.unit}
                            onValueChange={(value) => updateIngredient(index, 'unit', value)}
                          >
                            <SelectTrigger className={isDuplicate ? 'border-red-500' : ''}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNITS.map(unit => (
                                <SelectItem key={unit.value} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm py-2">{UNITS.find(u => u.value === ing.unit)?.label || ing.unit}</p>
                        )}
                      </div>

                      {isEditing && ingredients.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeIngredient(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                    
                    {isDuplicate && (
                      <div className="text-xs text-red-600 mt-2">
                        ⚠️ Ten składnik jest zduplikowany
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {isEditing && (
              <Button type="button" variant="outline" size="sm" onClick={addIngredient} className="mt-3">
                <Plus className="h-4 w-4 mr-1" />
                Dodaj składnik
              </Button>
            )}
          </div>

          {/* Tags */}
          <div>
            <Label className="mb-3 block">Tagi</Label>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                  className={isEditing ? "cursor-pointer" : ""}
                  style={selectedTags.includes(tag.id) ? { backgroundColor: '#57221B', borderColor: '#57221B' } : {}}
                  onClick={() => isEditing && toggleTag(tag.id)}
                >
                  {tag.name}
                </Badge>
              ))}
              {tags.length === 0 && <p className="text-sm text-gray-500">Brak tagów</p>}
            </div>
          </div>

          <DialogFooter className="gap-2">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                >
                  Anuluj
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Usuń przepis
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Zamknij
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

