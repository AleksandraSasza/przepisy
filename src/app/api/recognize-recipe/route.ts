import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Konwertuje File do base64 string
 */
async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

/**
 * Pobiera zawartość strony jako tekst (dla linków)
 */
async function fetchPageContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    
    // Podstawowa ekstrakcja tekstu (można użyć cheerio dla lepszej ekstrakcji)
    // Tutaj zwracamy cały HTML, GPT sobie poradzi
    return text.substring(0, 50000); // Limit do 50k znaków
  } catch (error) {
    console.error('Error fetching page:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const imageUrl = formData.get('imageUrl') as string | null;
    const sourceUrl = formData.get('sourceUrl') as string | null;

    if (!file && !imageUrl && !sourceUrl) {
      return NextResponse.json(
        { error: 'Brak zdjęcia lub linku' },
        { status: 400 }
      );
    }

    let imageBase64: string | null = null;
    let mimeType: string = 'image/jpeg';
    let textContent: string | null = null;

    // Obsługa pliku
    if (file) {
      imageBase64 = await fileToBase64(file);
      mimeType = file.type || 'image/jpeg';
    }
    // Obsługa URL do zdjęcia
    else if (imageUrl) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const imageFile = new File([blob], 'image.jpg', { type: blob.type });
        imageBase64 = await fileToBase64(imageFile);
        mimeType = blob.type || 'image/jpeg';
      } catch (error) {
        console.error('Error fetching image from URL:', error);
        return NextResponse.json(
          { error: 'Nie można pobrać zdjęcia z podanego URL' },
          { status: 400 }
        );
      }
    }
    // Obsługa linku do przepisu (strona internetowa)
    else if (sourceUrl) {
      textContent = await fetchPageContent(sourceUrl);
    }

    // Przygotuj prompt dla OpenAI
    const systemPrompt = `Jesteś ekspertem od rozpoznawania przepisów kulinarnych. 
Analizuj zdjęcia przepisów lub strony internetowe i wyciągaj informacje w dokładnie określonym formacie JSON.

Zwróć dane w następującym formacie JSON:
{
  "name": "nazwa przepisu",
  "ingredients": [
    {"name": "nazwa produktu", "quantity": "ilość", "unit": "jednostka"}
  ],
  "tags": ["tag1", "tag2"]
}

WAŻNE ZASADY:
- Używaj POLSKICH nazw produktów
- Dla jednostek używaj tylko: szt, g, kg, ml, l, łyżka, łyżeczka, szklanka
- Jeśli ilość nie jest podana, użyj pustego stringa ""
- Jeśli jednostka nie jest podana, użyj "szt"
- Tagi są opcjonalne - dodaj tylko jeśli są widoczne (np. "wegetariańskie", "słodkie", "obiad")
- ZAWSZE zachowuj pełne nazwy produktów z ich cechami charakterystycznymi:
  * "cukier trzcinowy" (NIE: "cukier")
  * "mąka pszenna typ 450" (NIE: "mąka")
  * "jabłka szara reneta" (NIE: "jabłka")
  * "masło ekstra" (NIE: "masło")
  * "pomidory malinowe" (NIE: "pomidory")
- ZACHOWAJ rodzaj, typ, odmianę produktu jeśli są podane w przepisie
- Usuń TYLKO niepotrzebne szczegóły marketingowe (np. "z ekologicznej uprawy", "bio", "certyfikowane")
- Jeśli widzisz wiele wersji przepisu, wybierz główną lub najbardziej oczywistą`;

    const userPrompt = imageBase64
      ? 'Przeanalizuj to zdjęcie przepisu i wyciągnij informacje zgodnie z instrukcjami.'
      : 'Przeanalizuj zawartość tej strony internetowej z przepisem i wyciągnij informacje zgodnie z instrukcjami.';

    // Przygotuj wiadomości dla OpenAI
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    if (imageBase64) {
      // Dla zdjęć używamy Vision API
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: userPrompt
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`
            }
          }
        ]
      } as OpenAI.Chat.Completions.ChatCompletionUserMessageParam);
    } else {
      // Dla tekstu używamy zwykłego API
      messages.push({
        role: 'user',
        content: `${userPrompt}\n\nZawartość strony:\n${textContent?.substring(0, 15000)}` // Limit do 15k znaków
      });
    }

    // Wywołaj OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('Brak odpowiedzi z OpenAI');
    }

    // Parsuj odpowiedź JSON
    let recognizedRecipe;
    try {
      recognizedRecipe = JSON.parse(content);
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      console.error('Raw response:', content);
      throw new Error('Nieprawidłowa odpowiedź z OpenAI');
    }

    // Walidacja struktury odpowiedzi
    if (!recognizedRecipe.name || !Array.isArray(recognizedRecipe.ingredients)) {
      throw new Error('Nieprawidłowa struktura odpowiedzi');
    }

    return NextResponse.json(recognizedRecipe);
  } catch (error: any) {
    console.error('Error recognizing recipe:', error);
    return NextResponse.json(
      { error: error.message || 'Błąd podczas rozpoznawania przepisu' },
      { status: 500 }
    );
  }
}

