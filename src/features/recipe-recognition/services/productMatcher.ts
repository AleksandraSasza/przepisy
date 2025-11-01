import Fuse from 'fuse.js';
import type { Product } from '@/types/database';
import type { RecognizedIngredient, ProductMatch } from '../types';

/**
 * Normalizuje nazwę produktu do porównywania
 * ULEPSZENIE: Normalizuje liczby pojedyncze/mnogie
 */
function normalizeProductName(name: string): string {
  let normalized = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?()]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Normalizacja liczb pojedynczych/mnogich (plurale tantum)
  const plurals: Record<string, string> = {
    'jajka': 'jajko',
    'jablka': 'jabłko',
    'pomidory': 'pomidor',
    'ogorki': 'ogórek',
    'cebule': 'cebula',
    'marchew': 'marchew',
    'mleka': 'mleko',
    'ziola': 'ziele',
    'makaron': 'makaron',
    'warzywa': 'warzywo',
    'owoce': 'owoc',
  };

  // Sprawdź czy to liczba mnoga
  for (const [plural, singular] of Object.entries(plurals)) {
    if (normalized.includes(plural)) {
      normalized = normalized.replace(plural, singular);
    }
  }

  return normalized;
}

/**
 * Dopasowuje rozpoznane składniki do istniejących produktów w bazie
 */
export async function matchProducts(
  recognizedIngredients: RecognizedIngredient[],
  existingProducts: Product[]
): Promise<ProductMatch[]> {
  if (existingProducts.length === 0) {
    return recognizedIngredients.map(ing => ({
      recognizedName: ing.name,
      recognizedQuantity: ing.quantity,
      recognizedUnit: ing.unit,
      matchedProduct: null,
      matchScore: 1,
      suggestions: [],
      action: 'create_new'
    }));
  }

  // ULEPSZENIE: Bardziej restrykcyjna konfiguracja Fuse
  const fuse = new Fuse(existingProducts, {
    keys: ['name'],
    threshold: 0.3, // Było 0.4, teraz bardziej restrykcyjne
    includeScore: true,
    minMatchCharLength: 3, // Było 2, teraz minimum 3 znaki
    distance: 100, // Limit odległości Levenshtein
    getFn: (obj, path) => {
      const value = Fuse.config.getFn(obj, path);
      return typeof value === 'string' ? normalizeProductName(value) : value;
    }
  });

  const results: ProductMatch[] = [];

  for (const ing of recognizedIngredients) {
    const normalizedName = normalizeProductName(ing.name);
    const fuseResults = fuse.search(normalizedName);
    
    const bestMatch = fuseResults[0];
    const matchScore = bestMatch?.score ?? 1;
    
    let action: 'use_existing' | 'create_new' | 'edit' = 'create_new';
    let matchedProduct: Product | null = null;
    
    // NOWA LOGIKA: Hybrydowe dopasowanie
    // < 0.2 = bardzo podobne (automatycznie użyj)
    // 0.2-0.6 = wątpliwe (sprawdź AI)
    // > 0.6 = różne (utwórz nowy)
    
    if (matchScore < 0.2 && bestMatch) {
      action = 'use_existing';
      matchedProduct = bestMatch.item;
    } else if (matchScore >= 0.2 && matchScore < 0.6 && bestMatch) {
      // NOWOŚĆ: Sprawdź AI dla wątpliwych przypadków
      try {
        const candidates = fuseResults.slice(0, 3).map(r => ({
          id: r.item.id,
          name: r.item.name
        }));

        const aiResponse = await fetch('/api/verify-product-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recognizedName: ing.name,
            candidates,
            matchScore
          })
        });

        if (aiResponse.ok) {
          const verification = await aiResponse.json();
          
          if (verification.isMatch && verification.confidence > 0.7) {
            // AI potwierdził dopasowanie
            action = 'use_existing';
            matchedProduct = verification.matchedProduct || bestMatch.item;
          } else if (verification.isMatch && verification.confidence > 0.5) {
            // AI sugeruje ale z rezerwą - pokaż jako sugestię
            matchedProduct = verification.matchedProduct || bestMatch.item;
          }
          // W przeciwnym razie zostaw jako 'create_new'
        }
      } catch (error) {
        console.error('AI verification error:', error);
        // W przypadku błędu, pokaż jako sugestię
        matchedProduct = bestMatch.item;
      }
    } else if (matchScore < 0.6) {
      // Wątpliwe dopasowanie - pokaż jako sugestię
      matchedProduct = bestMatch.item;
    }
    
    results.push({
      recognizedName: ing.name,
      recognizedQuantity: ing.quantity,
      recognizedUnit: ing.unit,
      matchedProduct,
      matchScore,
      suggestions: fuseResults.slice(0, 5).map(r => r.item),
      action,
      selectedProductId: matchedProduct?.id
    });
  }

  return results;
}

