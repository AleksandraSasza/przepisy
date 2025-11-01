# Dania - Menedżer Przepisów 🍳

Aplikacja do zarządzania przepisami kulinarnymi z rozpoznawaniem składników za pomocą AI.

## ✨ Funkcje

- 📝 Dodawanie i zarządzanie przepisami
- 🤖 Automatyczne rozpoznawanie składników ze zdjęć (OpenAI GPT-4o-mini)
- 🔍 Inteligentne dopasowywanie produktów do bazy
- 📊 Filtrowanie przepisów po produktach i tagach
- 📷 Upload zdjęć i PDF-ów przepisów
- 🔐 Autentykacja użytkowników (Supabase Auth)

## 🚀 Szybki Start

### Instalacja

```bash
# Instalacja zależności
npm install

# Skonfiguruj zmienne środowiskowe
cp .env.example .env
# Uzupełnij NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY
# Dodaj OPENAI_API_KEY
```

### Konfiguracja Bazy Danych

1. Otwórz Supabase Dashboard → SQL Editor
2. Skopiuj i uruchom SQL z pliku `SUPABASE_QUICK_SETUP.md`

### Uruchomienie

```bash
npm run dev
```

Otwórz [http://localhost:3001](http://localhost:3001) w przeglądarce.

## 🛠 Stack Technologiczny

- **Framework:** Next.js 16
- **Styling:** Tailwind CSS
- **Baza danych:** Supabase (PostgreSQL)
- **AI:** OpenAI GPT-4o-mini
- **UI Components:** shadcn/ui

## 📚 Dokumentacja

Szczegółowa dokumentacja setupu znajduje się w:
- `SUPABASE_QUICK_SETUP.md` - konfiguracja bazy danych

## 📝 Licencja

Private project.
