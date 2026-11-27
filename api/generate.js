export async function POST(request) {
  try {
    const { notes, count = 5 } = await request.json();
    if (!notes || !notes.trim()) {
      return Response.json({ error: "No notes provided." }, { status: 400 });
    }

    const cardCount = count === 10 ? 10 : 5;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Server API key is not configured." }, { status: 500 });
    }

    const prompt = `You are a study assistant for a 10th-grade SSC board student. Extract ${cardCount} key exam-focused concepts from the study notes below and return ONLY a valid JSON array of objects, with no markdown backticks or extra text. Each object must have exact keys: "question", "answer", and "options" (an array of 4 short multiple-choice strings where one matches the answer).

Study Notes:
${notes}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
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
