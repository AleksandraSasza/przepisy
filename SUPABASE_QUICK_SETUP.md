# 🚀 Szybka konfiguracja Supabase

## ✅ Co robi ten skrypt:
- Tworzy wszystkie potrzebne tabele (w tym tabelę jednostek miary)
- Dodaje polityki bezpieczeństwa (RLS)
- Dodaje 8 jednostek miary (globalne)
- Dodaje 30 produktów globalnych (dostępnych dla wszystkich użytkowników)

---

## 📋 Uruchom ten SQL w Supabase Dashboard → SQL Editor:

```sql
-- ============================================
-- KROK 1: TABELE
-- ============================================

-- Tabela jednostek miary (globalna, dostępna dla wszystkich)
CREATE TABLE IF NOT EXISTS units (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela produktów (globalne + użytkownika)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL = produkt globalny
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela przepisów
CREATE TABLE IF NOT EXISTS dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela składników przepisu
CREATE TABLE IF NOT EXISTS dish_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity NUMERIC,
  unit_code TEXT REFERENCES units(code),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela tagów
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela powiązań przepis-tag
CREATE TABLE IF NOT EXISTS dish_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(dish_id, tag_id)
);

-- ============================================
-- KROK 2: POLITYKI RLS
-- ============================================

-- Włącz Row Level Security
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dish_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE dish_tags ENABLE ROW LEVEL SECURITY;

-- UNITS: Publiczne (dostępne dla wszystkich)
DROP POLICY IF EXISTS "Anyone can view units" ON units;
CREATE POLICY "Anyone can view units"
  ON units FOR SELECT
  TO public;

-- PRODUCTS: Globalne (user_id IS NULL) + własne
DROP POLICY IF EXISTS "Users can view global and own products" ON products;
CREATE POLICY "Users can view global and own products"
  ON products FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own products" ON products;
CREATE POLICY "Users can insert their own products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own products" ON products;
CREATE POLICY "Users can update their own products"
  ON products FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own products" ON products;
CREATE POLICY "Users can delete their own products"
  ON products FOR DELETE
  USING (auth.uid() = user_id);

-- DISHES
DROP POLICY IF EXISTS "Users can manage their own dishes" ON dishes;
CREATE POLICY "Users can manage their own dishes"
  ON dishes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DISH_INGREDIENTS
DROP POLICY IF EXISTS "Users can manage ingredients of their dishes" ON dish_ingredients;
CREATE POLICY "Users can manage ingredients of their dishes"
  ON dish_ingredients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM dishes
      WHERE dishes.id = dish_ingredients.dish_id
      AND dishes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dishes
      WHERE dishes.id = dish_ingredients.dish_id
      AND dishes.user_id = auth.uid()
    )
  );

-- TAGS
DROP POLICY IF EXISTS "Users can manage their own tags" ON tags;
CREATE POLICY "Users can manage their own tags"
  ON tags FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DISH_TAGS
DROP POLICY IF EXISTS "Users can manage tags of their dishes" ON dish_tags;
CREATE POLICY "Users can manage tags of their dishes"
  ON dish_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM dishes
      WHERE dishes.id = dish_tags.dish_id
      AND dishes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dishes
      WHERE dishes.id = dish_tags.dish_id
      AND dishes.user_id = auth.uid()
    )
  );

-- ============================================
-- KROK 3: JEDNOSTKI MIARY (globalne)
-- ============================================

INSERT INTO units (code, label) VALUES
  ('szt', 'szt.'),
  ('g', 'g'),
  ('kg', 'kg'),
  ('ml', 'ml'),
  ('l', 'l'),
  ('łyżka', 'łyżka'),
  ('łyżeczka', 'łyżeczka'),
  ('szklanka', 'szklanka')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- KROK 4: PRODUKTY GLOBALNE (user_id = NULL)
-- ============================================

INSERT INTO products (user_id, name) VALUES
  (NULL, 'Mąka'),
  (NULL, 'Cukier'),
  (NULL, 'Sól'),
  (NULL, 'Pieprz'),
  (NULL, 'Olej'),
  (NULL, 'Masło'),
  (NULL, 'Jajka'),
  (NULL, 'Mleko'),
  (NULL, 'Ser'),
  (NULL, 'Pomidory'),
  (NULL, 'Cebula'),
  (NULL, 'Czosnek'),
  (NULL, 'Makaron'),
  (NULL, 'Ryż'),
  (NULL, 'Kurczak'),
  (NULL, 'Wołowina'),
  (NULL, 'Wieprzowina'),
  (NULL, 'Ryba'),
  (NULL, 'Ziemniaki'),
  (NULL, 'Marchew'),
  (NULL, 'Papryka'),
  (NULL, 'Ogórek'),
  (NULL, 'Sałata'),
  (NULL, 'Bazylia'),
  (NULL, 'Oregano'),
  (NULL, 'Tymianek'),
  (NULL, 'Śmietana'),
  (NULL, 'Jogurt'),
  (NULL, 'Chleb'),
  (NULL, 'Bułka')
ON CONFLICT DO NOTHING;
```

---

## ✅ Gotowe!

Po uruchomieniu SQL:
1. **Zrestartuj aplikację** (npm run dev)
2. **Odśwież przeglądarkę** (Cmd/Ctrl + Shift + R)
3. Każdy użytkownik automatycznie widzi 30 produktów globalnych!
4. Użytkownicy mogą dodawać swoje własne produkty

---

## 💡 Jak to działa:

- **Produkty globalne** (user_id = NULL): Widoczne dla wszystkich, nie można ich edytować ani usuwać
- **Produkty użytkownika** (user_id = konkretny user): Widoczne tylko dla tego użytkownika, może je edytować i usuwać
- **Oszczędność miejsca**: Produkty globalne nie są kopiowane, istnieją tylko raz w bazie!

