const notesInput = document.getElementById("notesInput");
const generateBtn = document.getElementById("generateBtn");
const clearBtn = document.getElementById("clearBtn");
const statusMsg = document.getElementById("statusMsg");
const cardsGrid = document.getElementById("cardsGrid");

function renderCards(cards) {
  cardsGrid.innerHTML = "";
  cards.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "card";
    let showingAnswer = false;

    const updateCard = () => {
      card.innerHTML = `
        <div class="label">Card ${index + 1} • ${showingAnswer ? "Answer (Tap to flip back)" : "Question (Tap to reveal)"}</div>
        <div class="text">${showingAnswer ? item.answer : item.question}</div>
      `;
    };

    updateCard();
    card.addEventListener("click", () => {
      showingAnswer = !showingAnswer;
      updateCard();
    });

    cardsGrid.appendChild(card);
  });
}

generateBtn.addEventListener("click", async () => {
  const text = notesInput.value.trim();
  if (!text) {
    statusMsg.textContent = "Please paste some study notes first!";
    return;
  }

  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";
  statusMsg.textContent = "AI is reading your notes and building flashcards...";
  cardsGrid.innerHTML = "";

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: text })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to generate flashcards.");
    }

    statusMsg.textContent = `Generated ${data.cards.length} flashcards! Tap any card to flip.`;
    renderCards(data.cards);
  } catch (error) {
    statusMsg.textContent = `Error: ${error.message}`;
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "Generate 5 Flashcards";
  }
});

clearBtn.addEventListener("click", () => {
  notesInput.value = "";
  cardsGrid.innerHTML = "";
  statusMsg.textContent = "";
});
