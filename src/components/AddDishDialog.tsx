'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Product, Tag } from '@/types/database';
import { UNITS } from '@/types/database';
import { useRecipeRecognition } from '@/features/recipe-recognition/hooks/useRecipeRecognition';
import { matchProducts } from '@/features/recipe-recognition/services/productMatcher';
import { ProductMatchingDialog } from './ProductMatchingDialog';
import type { ProductMatch } from '@/features/recipe-recognition/types';

interface Ingredient {
  productId: string;
  quantity: string;
  unit: string;
}

interface AddDishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  products: Product[];
  tags: Tag[];
  onSuccess: () => void;
  onProductAdded: (product: Product) => void;
  onTagAdded: (tag: Tag) => void;
}

export function AddDishDialog({ open, onOpenChange, userId, products, tags, onSuccess, onProductAdded, onTagAdded }: AddDishDialogProps) {
  const [name, setName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { productId: '', quantity: '', unit: 'szt' }
  ]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMatchingDialogOpen, setIsMatchingDialogOpen] = useState(false);
  const [productMatches, setProductMatches] = useState<ProductMatch[]>([]);
  const [recognizedName, setRecognizedName] = useState('');
  const [recognizedTags, setRecognizedTags] = useState<string[]>([]);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);
  const isSubmittingRef = useRef(false);
  const skipCloseConfirmationRef = useRef(false); // NOWA FLAGA
  
  const { recognizing, recognizeRecipe } = useRecipeRecognition();

  // Sprawdź czy formularz zawiera dane
  const hasFormData = () => {
    return !!(
      name.trim() ||
      sourceUrl.trim() ||
      imageFile ||
      ingredients.some(ing => ing.productId || ing.quantity) ||
      selectedTags.length > 0
    );
  };

  // Sprawdź czy formularz jest gotowy do zapisu
  const isFormValid = () => {
    const hasName = name.trim().length > 0;
    const hasIngredient = ingredients.some(ing => ing.productId);
    return hasName && hasIngredient;
  };

  // Handler dla zamykania dialogu
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Otwieramy dialog - resetuj stany
      setShowCloseConfirmation(false);
      setPendingClose(false);
      isSubmittingRef.current = false;
      skipCloseConfirmationRef.current = false; // RESET
      onOpenChange(true);
    } else {
      // Próbujemy zamknąć
      // Pomiń dialog potwierdzenia jeśli zapisaliśmy sukcesem lub zapisujemy
      if (skipCloseConfirmationRef.current || isSubmittingRef.current || !hasFormData() || showCloseConfirmation) {
        // Zapisywanie się udało lub zapisujemy - zamknij normalnie
        onOpenChange(false);
        if (pendingClose && !isSubmittingRef.current) {
          resetForm();
        }
        setPendingClose(false);
        setShowCloseConfirmation(false);
        isSubmittingRef.current = false;
        skipCloseConfirmationRef.current = false;
      } else {
        // Mamy dane i użytkownik chce zamknąć - pokaż dialog potwierdzenia
        // TYLKO jeśli użytkownik kliknął X lub ESC (nie programowo)
        setShowCloseConfirmation(true);
        setPendingClose(true);
        // NIE wywołuj onOpenChange(false) tutaj - zostaw dialog otwarty
      }
    }
  };

  const handleConfirmClose = () => {
    setShowCloseConfirmation(false);
    resetForm();
    setPendingClose(false);
    onOpenChange(false); // Zamknij główny dialog
  };

  const handleCancelClose = () => {
    setShowCloseConfirmation(false);
    setPendingClose(false);
    // Nie zamykaj głównego dialogu - zostaw dane
  };

  const resetForm = () => {
    setName('');
    setSourceUrl('');
    setImageUrl('');
    setImageFile(null);
    setImagePreview(null);
    setIngredients([{ productId: '', quantity: '', unit: 'szt' }]);
    setSelectedTags([]);
    setNewTagName('');
    setIsAddingTag(false);
    setNewProductName('');
    setIsAddingProduct(false);
  };

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

  const uploadImage = async (file: File): Promise<string | null> => {
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

  const addIngredient = () => {
    setIngredients([...ingredients, { productId: '', quantity: '', unit: 'szt' }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  // Sprawdź czy są duplikaty składników
  const getDuplicateIngredients = () => {
    const duplicates = new Map<string, number[]>();
    
    // Utwórz mapę dla wszystkich składników z produktem
    ingredients.forEach((ing, index) => {
      if (!ing.productId) return; // Pomiń puste składniki
      
      // Tylko produkt ID - bez jednostki!
      const key = ing.productId;
      
      if (duplicates.has(key)) {
        duplicates.get(key)!.push(index);
      } else {
        duplicates.set(key, [index]);
      }
    });
    
    // Zwróć tylko te które mają więcej niż 1 wystąpienie
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

  const handleAddNewProduct = async () => {
    if (!newProductName.trim()) {
      toast.error('Podaj nazwę produktu');
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .insert({ user_id: userId, name: newProductName.trim() })
      .select()
      .single();

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
    
    // Automatycznie dodaj nowy produkt do składników
    const emptyIngredientIndex = ingredients.findIndex(ing => !ing.productId);
    if (emptyIngredientIndex >= 0) {
      // Wypełnij pierwszy pusty składnik
      updateIngredient(emptyIngredientIndex, 'productId', data.id);
    } else {
      // Dodaj nowy składnik z tym produktem
      setIngredients([...ingredients, { productId: data.id, quantity: '', unit: 'szt' }]);
    }
    
    setNewProductName('');
    setIsAddingProduct(false);
  };

  const handleAddNewTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Podaj nazwę tagu');
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('tags')
      .insert({ user_id: userId, name: newTagName.trim() })
      .select()
      .single();

    if (error) {
      console.error('Error adding tag:', error);
      toast.error(`Błąd podczas dodawania tagu: ${error.message}`);
      return;
    }

    if (!data) {
      toast.error('Nie udało się dodać tagu');
      return;
    }

    toast.success(`Tag "${newTagName}" został dodany`);
    onTagAdded(data);
    setSelectedTags([...selectedTags, data.id]);
    setNewTagName('');
    setIsAddingTag(false);
  };

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(id => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const handleRecognizeRecipe = async () => {
    if (!imageFile && !sourceUrl) {
      toast.error('Najpierw dodaj zdjęcie lub link do przepisu');
      return;
    }

    const recognized = await recognizeRecipe(imageFile, null, sourceUrl || null);
    
    if (!recognized) {
      return; // Błąd już wyświetlony przez hook
    }

    // Zapisz rozpoznaną nazwę i tagi
    setRecognizedName(recognized.name);
    setRecognizedTags(recognized.tags || []);

    // Dopasuj produkty (teraz async z AI)
    const matches = await matchProducts(recognized.ingredients, products);
    setProductMatches(matches);
    setIsMatchingDialogOpen(true);
  };

  const handleConfirmMatches = async (confirmedMatches: ProductMatch[]) => {
    // Wypełnij nazwę przepisu
    if (recognizedName) {
      setName(recognizedName);
    }

    // Wypełnij tagi (tylko istniejące, NIE tworz nowych)
    const tagsToSelect: string[] = [];
    for (const tagName of recognizedTags) {
      const existingTag = tags.find(t => 
        t.name.toLowerCase().trim() === tagName.toLowerCase().trim()
      );
      
      if (existingTag) {
        tagsToSelect.push(existingTag.id);
      }
      // NIE tworzymy nowych tagów - użytkownik musi je dodać ręcznie
    }
    setSelectedTags(tagsToSelect);

    // Wypełnij składniki
    const newIngredients: Ingredient[] = [];
    
    for (const match of confirmedMatches) {
      let productId = '';
      
      if (match.action === 'use_existing' && match.selectedProductId) {
        // Użyj istniejącego produktu
        productId = match.selectedProductId;
      } else {
        // Utwórz nowy produkt
        const productName = match.editedName || match.recognizedName;
        
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('products')
            .insert({ user_id: userId, name: productName.trim() })
            .select()
            .single();
          
          if (!error && data) {
            onProductAdded(data);
            productId = data.id;
          } else {
            console.error('Error creating product:', error);
            continue; // Pomiń ten składnik
          }
        } catch (error) {
          console.error('Error creating product:', error);
          continue; // Pomiń ten składnik
        }
      }
      
      const rawUnit = match.recognizedUnit || 'szt';
      const normalizedUnitResult = normalizeUnit(rawUnit);
      
      newIngredients.push({
        productId,
        quantity: match.recognizedQuantity || '',
        unit: normalizedUnitResult || 'szt' // Jeśli normalizacja zwróci null, użyj domyślnej wartości
      });
    }

    setIngredients(newIngredients.length > 0 ? newIngredients : [{ productId: '', quantity: '', unit: 'szt' }]);
    
    toast.success('Formularz został wypełniony!');
    setIsMatchingDialogOpen(false);
  };

  // Funkcja do walidacji jednostek
  const isValidUnit = (unit: string | null | undefined): boolean => {
    if (!unit || unit.trim() === '') return false;
    const validUnits = UNITS.map(u => u.value) as readonly string[];
    return validUnits.includes(unit.trim());
  };

  // Funkcja do normalizacji jednostek
  const normalizeUnit = (unit: string | null | undefined): string | null => {
    // Jeśli unit jest null, undefined lub pusty string - zwróć null
    if (!unit || typeof unit !== 'string' || unit.trim() === '') {
      return null;
    }
    
    const trimmed = unit.trim().toLowerCase();
    
    // Mapowanie podobnych jednostek na dozwolone
    const unitMap: Record<string, string> = {
      'sztuk': 'szt',
      'sztuka': 'szt',
      'sztuki': 'szt',
      'gram': 'g',
      'gramy': 'g',
      'kilogram': 'kg',
      'kilogramy': 'kg',
      'mililitr': 'ml',
      'mililitry': 'ml',
      'litr': 'l',
      'litry': 'l',
    };
    
    // Sprawdź mapowanie
    if (unitMap[trimmed]) {
      return unitMap[trimmed];
    }
    
    // Sprawdź czy jest w dozwolonych (case-insensitive)
    const validUnits = UNITS.map(u => u.value.toLowerCase());
    const unitLower = trimmed.toLowerCase();
    
    if (validUnits.includes(unitLower)) {
      // Zwróć oryginalną wartość z UNITS (zachowaj wielkość liter)
      const matchedUnit = UNITS.find(u => u.value.toLowerCase() === unitLower);
      return matchedUnit ? matchedUnit.value : null;
    }
    
    // Jeśli nie pasuje - zwróć null (zamiast nieprawidłowej wartości)
    console.warn(`Invalid unit detected: "${unit}" -> normalized to null`);
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Podaj nazwę przepisu');
      return;
    }

    const validIngredients = ingredients.filter(ing => ing.productId);
    if (validIngredients.length === 0) {
      toast.error('Dodaj przynajmniej jeden produkt');
      return;
    }

    setLoading(true);
    isSubmittingRef.current = true;
    const supabase = createClient();

    try {
      // Upload image if file selected
      let uploadedImageUrl: string | null = null;
      if (imageFile) {
        const url = await uploadImage(imageFile);
        if (url) {
          uploadedImageUrl = url;
        }
      }

      // Utwórz przepis
      const { data: dish, error: dishError} = await supabase
        .from('dishes')
        .insert({
          user_id: userId,
          name: name.trim(),
          source_url: sourceUrl.trim() || null,
          image_url: uploadedImageUrl,
          favorite: false,
        })
        .select()
        .single();

      if (dishError) {
        console.error('Dish error:', dishError);
        throw dishError;
      }

      // Dodaj składniki
      const ingredientsToInsert = validIngredients.map(ing => {
        const normalizedUnit = normalizeUnit(ing.unit);
        
        return {
          dish_id: dish.id,
          product_id: ing.productId,
          quantity: ing.quantity ? parseFloat(ing.quantity) : null,
          unit_code: normalizedUnit,
        };
      });

      // Loguj przed zapisem
      console.log('Ingredients to insert:', JSON.stringify(ingredientsToInsert, null, 2));
      console.log('Available units:', UNITS.map(u => u.value));

      const { error: ingredientsError } = await supabase
        .from('dish_ingredients')
        .insert(ingredientsToInsert);

      if (ingredientsError) {
        console.error('Ingredients error:', ingredientsError);
        // ROLLBACK: Usuń przepis jeśli składniki się nie zapisały
        const { error: deleteError } = await supabase
          .from('dishes')
          .delete()
          .eq('id', dish.id);
        
        if (deleteError) {
          console.error('Error deleting dish during rollback:', deleteError);
          toast.error('Błąd: przepis został utworzony bez składników. Usuń go ręcznie.');
        }
        
        throw ingredientsError;
      }

      // Dodaj tagi
      if (selectedTags.length > 0) {
        const tagsToInsert = selectedTags.map(tagId => ({
          dish_id: dish.id,
          tag_id: tagId,
        }));

        const { error: tagsError } = await supabase
          .from('dish_tags')
          .insert(tagsToInsert);

        if (tagsError) {
          console.error('Tags error:', tagsError);
          throw tagsError;
        }
      }

      // SUKCES - ustaw flagę przed zamknięciem
      skipCloseConfirmationRef.current = true;
      toast.success('Przepis został dodany!');
      resetForm();
      setPendingClose(false);
      setShowCloseConfirmation(false);
      isSubmittingRef.current = false;
      
      // Użyj setTimeout żeby upewnić się że ref jest ustawiony przed zamknięciem
      setTimeout(() => {
        onOpenChange(false);
        onSuccess();
      }, 0);
      
    } catch (error: any) {
      console.error('Error adding dish:', error);
      
      // Szczegółowe logowanie
      console.error('Full error object:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', error ? Object.keys(error) : 'no keys');
      
      // Supabase może zwracać błędy w różnym formacie
      let errorMessage = 'Nieznany błąd';
      
      if (error) {
        // Sprawdź różne możliwe formaty błędów
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.details) {
          errorMessage = error.details;
        } else if (error.hint) {
          errorMessage = error.hint;
        } else if (error.code) {
          errorMessage = `Błąd ${error.code}`;
        } else {
          // Jeśli error to obiekt, spróbuj go sformatować
          try {
            const errorStr = JSON.stringify(error, null, 2);
            console.error('Stringified error:', errorStr);
            if (errorStr !== '{}' && errorStr !== 'null') {
              errorMessage = `Błąd: ${errorStr.substring(0, 200)}`; // Limit długości
            }
          } catch (e) {
            console.error('Could not stringify error:', e);
          }
        }
      }
      
      toast.error(`Błąd podczas dodawania przepisu: ${errorMessage}`);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dodaj nowy przepis</DialogTitle>
          <DialogDescription>
            Uzupełnij informacje o przepisie i dodaj składniki
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nazwa przepisu */}
          <div>
            <Label htmlFor="name">Nazwa przepisu *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Spaghetti carbonara"
              required
            />
          </div>

          {/* Link do przepisu */}
          <div>
            <Label htmlFor="sourceUrl">Link do przepisu (opcjonalnie)</Label>
            <Input
              id="sourceUrl"
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* Zdjęcie dania */}
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
            {imagePreview && (
              <div className="mt-3 space-y-2">
                <div className="relative rounded-lg overflow-hidden border-2 border-gray-200">
                  {imagePreview === 'PDF' ? (
                    <div className="w-full h-48 flex items-center justify-center bg-gray-100">
                      <div className="text-center">
                        <svg className="mx-auto h-16 w-16 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                          <path d="M14 2v6h6"/>
                          <text x="7" y="18" fontSize="4" fill="white" fontWeight="bold">PDF</text>
                        </svg>
                        <p className="mt-2 text-sm text-gray-600">{imageFile?.name}</p>
                      </div>
                    </div>
                  ) : (
                    <img 
                      src={imagePreview} 
                      alt="Podgląd"
                      className="w-full h-48 object-cover"
                    />
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Usuń plik
                </Button>
              </div>
            )}
            {/* Przycisk rozpoznawania przepisu */}
            {(imageFile || sourceUrl) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRecognizeRecipe}
                disabled={recognizing}
                className="mt-3 w-full"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {recognizing ? 'Rozpoznawanie...' : 'Rozpoznaj przepis'}
              </Button>
            )}
          </div>

          {/* Składniki */}
          <div>
            <Label className="mb-3 block">Składniki *</Label>

            <div className="space-y-3">
              {ingredients.map((ing, index) => {
                const duplicateIndices = getDuplicateIngredients();
                const isDuplicate = duplicateIndices.includes(index);
                
                return (
                  <div 
                    key={index} 
                    className={`border-2 rounded-lg p-2 ${
                      isDuplicate ? 'border-red-500 bg-red-50' : 'border-transparent'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 items-stretch sm:items-end">
                      {/* Produkt - pełna szerokość na małych ekranach */}
                      <div className="w-full sm:flex-1 sm:min-w-0">
                        <Label className="text-xs block mb-1">Produkt</Label>
                        <Select
                          key={`product-${index}-${ing.productId}`}
                          value={ing.productId || ''}
                          onValueChange={(value) => updateIngredient(index, 'productId', value)}
                        >
                          <SelectTrigger className={isDuplicate ? 'border-red-500' : ''}>
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
                      </div>

                      {/* Ilość i jednostka - w jednym wierszu pod produktem na małych ekranach */}
                      <div className="flex gap-2 items-end">
                        <div className="w-24">
                          <Label className="text-xs block mb-1">Ilość</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={ing.quantity}
                            onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                            placeholder="0"
                            className={isDuplicate ? 'border-red-500' : ''}
                          />
                        </div>

                        <div className="flex-1 sm:w-32">
                          <Label className="text-xs block mb-1">Jednostka</Label>
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
                        </div>

                        {ingredients.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeIngredient(index)}
                            className="shrink-0"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
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

            {/* Przycisk dodaj składnik */}
            <Button type="button" variant="outline" size="sm" onClick={addIngredient} className="mt-3">
              <Plus className="h-4 w-4 mr-1" />
              Dodaj kolejny składnik
            </Button>

            {/* Separator i informacja */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  Nie ma produktu na liście?
                </span>
              </div>
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
                  />
                  <Button type="button" onClick={handleAddNewProduct}>
                    Dodaj
                  </Button>
                  <Button
                    type="button"
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
                type="button"
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => setIsAddingProduct(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Utwórz nowy produkt
              </Button>
            )}
          </div>

          {/* Tagi */}
          <div>
            <Label>Tagi (opcjonalnie)</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map(tag => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  style={selectedTags.includes(tag.id) ? { backgroundColor: '#57221B', borderColor: '#57221B' } : {}}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>

            {/* Dodawanie nowego tagu */}
            {isAddingTag ? (
              <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                <Label>Nowy tag</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="np. Słodkie, Wege"
                  />
                  <Button type="button" onClick={handleAddNewTag}>
                    Dodaj
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddingTag(false);
                      setNewTagName('');
                    }}
                  >
                    Anuluj
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setIsAddingTag(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Dodaj nowy tag
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={loading || hasDuplicateIngredients() || !isFormValid()}>
              {loading ? 'Zapisywanie...' : 'Zapisz przepis'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Dialog weryfikacji produktów */}
      <ProductMatchingDialog
        open={isMatchingDialogOpen}
        onOpenChange={setIsMatchingDialogOpen}
        matches={productMatches}
        allProducts={products}
        onConfirm={handleConfirmMatches}
      />
      </Dialog>

      {/* Dialog potwierdzający zamknięcie */}
      <Dialog 
        open={showCloseConfirmation} 
        onOpenChange={(open) => {
          if (!open) {
            // Użytkownik kliknął poza dialog lub X - traktuj jak anulowanie
            handleCancelClose();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Przerwać dodawanie przepisu?</DialogTitle>
            <DialogDescription>
              Masz niewypełnione dane w formularzu. Czy chcesz przerwać dodawanie przepisu i usunąć wszystkie wprowadzone dane?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelClose}
            >
              Nie, zostaw dane
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmClose}
            >
              Tak, przerwij i usuń dane
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

