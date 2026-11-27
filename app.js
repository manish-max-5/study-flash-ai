const notesInput = document.getElementById("notesInput");
const countSelect = document.getElementById("countSelect");
const generateBtn = document.getElementById("generateBtn");
const clearBtn = document.getElementById("clearBtn");
const statusMsg = document.getElementById("statusMsg");
const modeBar = document.getElementById("modeBar");
const flashcardsModeBtn = document.getElementById("flashcardsModeBtn");
const quizModeBtn = document.getElementById("quizModeBtn");
const copyAllBtn = document.getElementById("copyAllBtn");
const shareAppBtn = document.getElementById("shareAppBtn");
const cardsGrid = document.getElementById("cardsGrid");

let currentCards = [];

function renderFlashcards() {
  flashcardsModeBtn.classList.add("active");
  quizModeBtn.classList.remove("active");
  cardsGrid.innerHTML = "";

  currentCards.forEach((item, index) => {
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

function renderQuiz() {
  quizModeBtn.classList.add("active");
  flashcardsModeBtn.classList.remove("active");
  cardsGrid.innerHTML = "";

  let score = 0;
  let answered = 0;
  statusMsg.textContent = `Quiz Mode: Score ${score} / ${currentCards.length}`;

  currentCards.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.cursor = "default";

    card.innerHTML = `
      <div class="label">Question ${index + 1}</div>
      <div class="text">${item.question}</div>
      <div class="quiz-options"></div>
    `;

    const optionsBox = card.querySelector(".quiz-options");
    const options = item.options || [item.answer];

    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = opt;

      btn.addEventListener("click", () => {
        if (optionsBox.dataset.locked === "true") return;
        optionsBox.dataset.locked = "true";
        answered++;

        const isCorrect = opt.trim().toLowerCase() === item.answer.trim().toLowerCase();
        if (isCorrect) {
          btn.classList.add("correct");
          score++;
        } else {
          btn.classList.add("wrong");
          Array.from(optionsBox.children).forEach((b) => {
            if (b.textContent.trim().toLowerCase() === item.answer.trim().toLowerCase()) {
              b.classList.add("correct");
            }
          });
        }

        statusMsg.textContent =
          answered === currentCards.length
            ? `Quiz Complete! Final Score: ${score} / ${currentCards.length}`
            : `Quiz Mode: Score ${score} / ${currentCards.length}`;
      });

      optionsBox.appendChild(btn);
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

  const count = Number(countSelect.value);
  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";
  statusMsg.textContent = `AI is building ${count} flashcards from your notes...`;
  cardsGrid.innerHTML = "";
  modeBar.classList.add("hidden");

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: text, count })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to generate flashcards.");
    }

    currentCards = data.cards;
    modeBar.classList.remove("hidden");
    statusMsg.textContent = `Generated ${currentCards.length} flashcards! Tap any card to flip.`;
    renderFlashcards();
  } catch (error) {
    statusMsg.textContent = `Error: ${error.message}`;
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "Generate Study Set";
  }
});

flashcardsModeBtn.addEventListener("click", () => {
  statusMsg.textContent = `Showing ${currentCards.length} flashcards. Tap any card to flip.`;
  renderFlashcards();
});

quizModeBtn.addEventListener("click", renderQuiz);

copyAllBtn.addEventListener("click", async () => {
  if (!currentCards.length) return;
  const formatted = currentCards
    .map((c, i) => `Q${i + 1}: ${c.question}\nA${i + 1}: ${c.answer}`)
    .join("\n\n");
  await navigator.clipboard.writeText(formatted);
  statusMsg.textContent = "Copied full Study Pack to clipboard!";
});

shareAppBtn.addEventListener("click", async () => {
  const url = window.location.origin;
  if (navigator.share) {
    await navigator.share({
      title: "StudyFlash AI",
      text: "Turn 10th-class notes into instant flashcards and quizzes:",
      url
    });
  } else {
    await navigator.clipboard.writeText(url);
    statusMsg.textContent = "App link copied! Paste it in WhatsApp to share.";
  }
});

clearBtn.addEventListener("click", () => {
  notesInput.value = "";
  cardsGrid.innerHTML = "";
  statusMsg.textContent = "";
  modeBar.classList.add("hidden");
  currentCards = [];
});
