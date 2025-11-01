import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface VerificationRequest {
  recognizedName: string;
  candidates: Array<{
    id: string;
    name: string;
  }>;
  matchScore: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerificationRequest = await request.json();
    const { recognizedName, candidates, matchScore } = body;

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({
        isMatch: false,
        confidence: 0,
        reason: 'Brak kandydatów do weryfikacji'
      });
    }

    // Jeśli score jest bardzo dobry (< 0.2) lub bardzo zły (> 0.8), nie sprawdzaj AI
    if (matchScore < 0.2) {
      return NextResponse.json({
        isMatch: true,
        confidence: 1 - matchScore,
        reason: 'Dopasowanie bardzo dobre'
      });
    }

    if (matchScore >= 0.8) {
      return NextResponse.json({
        isMatch: false,
        confidence: 0,
        reason: 'Dopasowanie zbyt słabe'
      });
    }

    // Dla wyników wątpliwych (0.2-0.8) użyj AI do weryfikacji
    const candidateNames = candidates.map(c => c.name).join(', ');
    
    const systemPrompt = `Jesteś ekspertem od dopasowywania nazw produktów spożywczych.
Twoim zadaniem jest sprawdzić czy rozpoznana nazwa produktu pasuje do któregoś z kandydatów.

WAŻNE ZASADY:
1. Rozpoznaj różne formy tego samego produktu (jajko/jajka, mleko/mleka, jabłko/jabłka)
2. Ignoruj przymiotniki opisowe (małe, duże, świeże, ekologiczne, młode)
3. Rozpoznaj synonimy i odmiany (masło/masło ekstra, cukier/cukier biały)
4. Różne produkty NIE są tym samym (jabłka ≠ jajka, pomidor ≠ ogórek, cebula ≠ czosnek)

Zwróć JSON:
{
  "isMatch": true/false,
  "matchedIndex": numer indeksu najlepszego dopasowania (lub -1 jeśli brak),
  "confidence": 0.0-1.0,
  "reason": "krótkie uzasadnienie"
}`;

    const userPrompt = `Rozpoznana nazwa produktu: "${recognizedName}"
Kandydaci do dopasowania: ${candidateNames}
Ocena algorytmu: ${matchScore.toFixed(2)}

Czy rozpoznany produkt pasuje do któregoś kandydata?`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 200
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('Brak odpowiedzi z OpenAI');
    }

    const verification = JSON.parse(content);

    const matchedCandidate = verification.matchedIndex >= 0 
      ? candidates[verification.matchedIndex]
      : null;

    return NextResponse.json({
      isMatch: verification.isMatch && verification.matchedIndex >= 0,
      confidence: verification.confidence || 0,
      reason: verification.reason || 'Brak uzasadnienia',
      matchedProduct: matchedCandidate
    });

  } catch (error: any) {
    console.error('Error verifying product match:', error);
    return NextResponse.json({
      isMatch: false,
      confidence: 0,
      reason: 'Błąd podczas weryfikacji AI',
      error: error.message
    }, { status: 500 });
  }
}

