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

generateBtn.addEventListener("click", () => {
  const text = notesInput.value.trim();
  if (!text) {
    statusMsg.textContent = "Please paste some study notes first!";
    return;
  }

  statusMsg.textContent = "Preview mode: Showing sample flashcards (Day 3 connects live Gemini AI).";
  renderCards([
    { question: "Sample Q1: What is Ohm's Law?", answer: "V = I × R (Voltage equals Current times Resistance at constant temperature)." },
    { question: "Sample Q2: What is the SI unit of electric charge?", answer: "Coulomb (C)." }
  ]);
});

clearBtn.addEventListener("click", () => {
  notesInput.value = "";
  cardsGrid.innerHTML = "";
  statusMsg.textContent = "";
});
