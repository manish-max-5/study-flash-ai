export async function POST(request) {
  try {
    const {
      notes = "",
      fileData = null,
      fileMimeType = "",
      count = 5,
      style = "flashcards",
      language = "English"
    } = await request.json();

    if (!notes.trim() && !fileData) {
      return Response.json(
        { error: "Please paste notes, enter a chapter name, or upload an image/PDF." },
        { status: 400 }
      );
    }

    const cardCount = count === 10 ? 10 : 5;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Server API key is not configured." }, { status: 500 });
    }

    const styleRules = {
      flashcards: "Concise active-recall Q&A pairs with key definitions and formulas.",
      "1mark": "SSC 1-Mark Objective / Fill-in-the-Blank questions. Use '______' for blanks in the question and give the exact board answer.",
      "2mark": "Telangana SSC 2-Mark Board Questions. Format the answer as 2 to 3 crisp, exam-ready bullet points using '• '.",
      "4mark": "Telangana SSC 4-Mark Long-Answer Questions. Format the answer as 4 to 5 structured bullet points with sub-headings using '• '.",
      assertion: "Assertion (A) and Reason (R) questions formatted like SSC/competitive exams, with standard A/R choices in options."
    };

    const langRules = {
      English: "Write all questions, answers, hints, and options in clear English.",
      Telugu: "Write all questions, answers, hints, and options in Telugu script (తెలుగు) suitable for TS SSC exams.",
      Hindi: "Write all questions, answers, hints, and options in Hindi Devanagari script (हिन्दी) suitable for TS SSC exams.",
      "Bilingual (English + Telugu)": "Write questions and answers in English, followed by Telugu (తెలుగు) translation/key meanings in brackets for second-language prep.",
      "Bilingual (English + Hindi)": "Write questions and answers in English, followed by Hindi (हिन्दी) translation/key meanings in brackets for second-language prep."
    };

    const selectedStyle = styleRules[style] || styleRules.flashcards;
    const selectedLang = langRules[language] || langRules.English;

    const systemInstruction = `You are an expert Telangana State Board (TS SSC) 10th-Class teacher and exam coach.
Generate exactly ${cardCount} study items based on the provided notes, chapter topic, or uploaded textbook image/PDF.
If only a chapter title/topic is given, use your knowledge of the TS SSC Class 10 syllabus to generate accurate board-exam content.

Format Rules:
- Question Style: ${selectedStyle}
- Language Rule: ${selectedLang}
- Return ONLY a valid JSON array of ${cardCount} objects (no markdown backticks, no extra text).
- Every object MUST have these exact 4 keys:
  1. "question": string
  2. "answer": string (use '\\n' between bullet points for 2-mark and 4-mark answers)
  3. "hint": string (a short memory clue, formula reminder, or SSC board exam tip)
  4. "options": array of 4 short multiple-choice strings where one matches the core answer.`;

    const parts = [{ text: systemInstruction }];

    if (fileData && fileMimeType) {
      parts.push({
        inlineData: {
          mimeType: fileMimeType,
          data: fileData
        }
      });
    }

    if (notes.trim()) {
      parts.push({ text: `Student Input / Chapter Notes:\n${notes.trim()}` });
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      }
    );

    const data = await geminiRes.json();
    if (!geminiRes.ok) {
      return Response.json(
        { error: data.error?.message || "Gemini API error" },
        { status: geminiRes.status }
      );
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const cards = JSON.parse(rawText);

    return Response.json({ cards });
  } catch (err) {
    return Response.json({ error: err.message || "Something went wrong." }, { status: 500 });
  }
}
