// DOM Elements
const htmlEl = document.documentElement;
const themeToggleBtn = document.getElementById("themeToggleBtn");
const xpCountEl = document.getElementById("xpCount");

const fileUpload = document.getElementById("fileUpload");
const filePreviewChip = document.getElementById("filePreviewChip");
const fileNameText = document.getElementById("fileNameText");
const removeFileBtn = document.getElementById("removeFileBtn");

const notesInput = document.getElementById("notesInput");
const styleSelect = document.getElementById("styleSelect");
const langSelect = document.getElementById("langSelect");
const countSelect = document.getElementById("countSelect");
const generateBtn = document.getElementById("generateBtn");
const clearBtn = document.getElementById("clearBtn");
const statusMsg = document.getElementById("statusMsg");

const studyToolbar = document.getElementById("studyToolbar");
const masteryText = document.getElementById("masteryText");
const weakCountText = document.getElementById("weakCountText");
const masteryBarFill = document.getElementById("masteryBarFill");

const flashcardsModeBtn = document.getElementById("flashcardsModeBtn");
const quizModeBtn = document.getElementById("quizModeBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const weakFilterBtn = document.getElementById("weakFilterBtn");
const copyAllBtn = document.getElementById("copyAllBtn");
const pdfExportBtn = document.getElementById("pdfExportBtn");
const shareAppBtn = document.getElementById("shareAppBtn");
const cardsGrid = document.getElementById("cardsGrid");

// State
let currentCards = [];
let showWeakOnly = false;
let currentMode = "flashcards";
let uploadedBase64 = null;
let uploadedMimeType = "";
let xp = Number(localStorage.getItem("studyflash_xp") || 0);

// Initialize Theme & XP
function initPrefs() {
  const savedTheme = localStorage.getItem("studyflash_theme") || "dark";
  htmlEl.setAttribute("data-theme", savedTheme);
  if (themeToggleBtn) {
    themeToggleBtn.textContent = savedTheme === "dark" ? "☀️" : "🌙";
  }
  updateXP(0);
}

function updateXP(delta) {
  xp = Math.max(0, xp + delta);
  localStorage.setItem("studyflash_xp", String(xp));
  if (xpCountEl) xpCountEl.textContent = `⚡ ${xp} XP`;
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const next = htmlEl.getAttribute("data-theme") === "dark" ? "light" : "dark";
    htmlEl.setAttribute("data-theme", next);
    localStorage.setItem("studyflash_theme", next);
    themeToggleBtn.textContent = next === "dark" ? "☀️" : "🌙";
  });
}

// Compress Images & Read PDFs safely under Vercel's payload limit
function compressImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1400;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        resolve({ base64: dataUrl.split(",")[1], mime: "image/jpeg" });
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readPdfToBase64(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 3.5 * 1024 * 1024) {
      reject(new Error("PDF is over 3.5 MB. Please upload a smaller PDF or snap screenshots of key pages."));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({ base64: e.target.result.split(",")[1], mime: "application/pdf" });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

if (fileUpload) {
  fileUpload.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    statusMsg.textContent = "Processing file...";
    try {
      const processed = file.type === "application/pdf"
        ? await readPdfToBase64(file)
        : await compressImageToBase64(file);

      uploadedBase64 = processed.base64;
      uploadedMimeType = processed.mime;
      fileNameText.textContent = file.name;
      filePreviewChip.classList.remove("hidden");
      statusMsg.textContent = `Attached "${file.name}". Ready to generate!`;
    } catch (err) {
      statusMsg.textContent = `File Error: ${err.message}`;
      fileUpload.value = "";
    }
  });
}

if (removeFileBtn) {
  removeFileBtn.addEventListener("click", () => {
    uploadedBase64 = null;
    uploadedMimeType = "";
    fileUpload.value = "";
    filePreviewChip.classList.add("hidden");
    statusMsg.textContent = "";
  });
}

// Progress & Mastery Tracking
function updateProgressUI() {
  const total = currentCards.length;
  const mastered = currentCards.filter((c) => c.status === "mastered").length;
  const weak = currentCards.filter((c) => c.status === "weak").length;

  masteryText.textContent = `Mastered: ${mastered} / ${total}`;
  weakCountText.textContent = `To Revise: ${weak}`;
  const pct = total ? Math.round((mastered / total) * 100) : 0;
  masteryBarFill.style.width = `${pct}%`;
}

// Render Flashcards
function renderFlashcards() {
  currentMode = "flashcards";
  flashcardsModeBtn.classList.add("active");
  quizModeBtn.classList.remove("active");
  cardsGrid.innerHTML = "";

  const visibleCards = showWeakOnly
    ? currentCards.filter((c) => c.status === "weak")
    : currentCards;

  if (!visibleCards.length) {
    cardsGrid.innerHTML = `<div class="card"><div class="text">No cards marked "Revise Again" yet! Turn off "Weak Only" to see all cards.</div></div>`;
    return;
  }

  visibleCards.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = `card ${item.status ? `status-${item.status}` : ""}`;
    let showingAnswer = false;
    let showingHint = false;

    const renderInner = () => {
      card.className = `card ${item.status ? `status-${item.status}` : ""}`;
      card.innerHTML = `
        <div class="card-top">
          <span class="label">Card ${idx + 1} • ${showingAnswer ? "Answer (Tap to flip)" : "Question (Tap to reveal)"}</span>
          ${item.hint ? `<button type="button" class="mini-btn hint-toggle">${showingHint ? "🙈 Hide Hint" : "💡 Hint"}</button>` : ""}
        </div>
        <div class="card-body">
          <div class="text">${showingAnswer ? item.answer : item.question}</div>
          <div class="print-answer hidden"><strong>Answer:</strong> ${item.answer}</div>
        </div>
        ${showingHint && item.hint ? `<div class="hint-box">💡 <strong>Exam Tip:</strong> ${item.hint}</div>` : ""}
        <div class="card-footer">
          <button type="button" class="mini-btn master-btn ${item.status === "mastered" ? "active-mastered" : ""}">✅ Mastered</button>
          <button type="button" class="mini-btn weak-btn ${item.status === "weak" ? "active-weak" : ""}">🔁 Revise Again</button>
        </div>
      `;

      card.querySelector(".card-body").addEventListener("click", () => {
        showingAnswer = !showingAnswer;
        renderInner();
      });

      const hintBtn = card.querySelector(".hint-toggle");
      if (hintBtn) {
        hintBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          showingHint = !showingHint;
          renderInner();
        });
      }

      card.querySelector(".master-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        if (item.status !== "mastered") {
          item.status = "mastered";
          updateXP(10);
        } else {
          item.status = null;
        }
        updateProgressUI();
        renderFlashcards();
      });

      card.querySelector(".weak-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        item.status = item.status === "weak" ? null : "weak";
        updateProgressUI();
        renderFlashcards();
      });
    };

    renderInner();
    cardsGrid.appendChild(card);
  });
}

// Render Quiz Mode
function renderQuiz() {
  currentMode = "quiz";
  quizModeBtn.classList.add("active");
  flashcardsModeBtn.classList.remove("active");
  cardsGrid.innerHTML = "";

  const visibleCards = showWeakOnly
    ? currentCards.filter((c) => c.status === "weak")
    : currentCards;

  let score = 0;
  let answered = 0;
  statusMsg.textContent = `Quiz Mode: Score ${score} / ${visibleCards.length}`;

  visibleCards.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="card-top">
        <span class="label">Question ${idx + 1}</span>
      </div>
      <div class="text">${item.question}</div>
      <div class="quiz-options"></div>
    `;

    const optionsBox = card.querySelector(".quiz-options");
    const options = item.options && item.options.length ? item.options : [item.answer];

    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn";
      btn.textContent = opt;

      btn.addEventListener("click", () => {
        if (optionsBox.dataset.locked === "true") return;
        optionsBox.dataset.locked = "true";
        answered++;

        const cleanOpt = opt.trim().toLowerCase();
        const cleanAns = item.answer.trim().toLowerCase();
        const isCorrect = cleanOpt === cleanAns || cleanAns.includes(cleanOpt);

        if (isCorrect) {
          btn.classList.add("correct");
          score++;
          if (item.status !== "mastered") {
            item.status = "mastered";
            updateXP(10);
          }
        } else {
          btn.classList.add("wrong");
          item.status = "weak";
          Array.from(optionsBox.children).forEach((b) => {
            const bText = b.textContent.trim().toLowerCase();
            if (bText === cleanAns || cleanAns.includes(bText)) {
              b.classList.add("correct");
            }
          });
        }

        updateProgressUI();
        statusMsg.textContent =
          answered === visibleCards.length
            ? `🎯 Quiz Complete! Final Score: ${score} / ${visibleCards.length}`
            : `Quiz Mode: Score ${score} / ${visibleCards.length}`;
      });

      optionsBox.appendChild(btn);
    });

    cardsGrid.appendChild(card);
  });
}

// Generate Study Pack
generateBtn.addEventListener("click", async () => {
  const text = notesInput.value.trim();
  if (!text && !uploadedBase64) {
    statusMsg.textContent = "Please paste notes, enter a chapter name, or upload an image/PDF first!";
    return;
  }

  const count = Number(countSelect?.value || 5);
  const style = styleSelect?.value || "flashcards";
  const language = langSelect?.value || "English";

  generateBtn.disabled = true;
  generateBtn.textContent = "⏳ Generating...";
  statusMsg.textContent = `AI is creating ${count} ${language} study cards...`;
  cardsGrid.innerHTML = "";
  studyToolbar.classList.add("hidden");
  showWeakOnly = false;
  weakFilterBtn.textContent = "🔥 Weak Only: OFF";

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: text,
        fileData: uploadedBase64,
        fileMimeType: uploadedMimeType,
        count,
        style,
        language
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to generate study pack.");
    }

    currentCards = (data.cards || []).map((c) => ({ ...c, status: null }));
    studyToolbar.classList.remove("hidden");
    updateProgressUI();
    statusMsg.textContent = `✨ Generated ${currentCards.length} cards! Tap any card to flip or switch to Quiz Mode.`;
    renderFlashcards();
  } catch (error) {
    statusMsg.textContent = `Error: ${error.message}`;
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "✨ Generate Study Pack";
  }
});

// Toolbar Actions
flashcardsModeBtn.addEventListener("click", () => {
  statusMsg.textContent = `Showing ${currentCards.length} flashcards.`;
  renderFlashcards();
});

quizModeBtn.addEventListener("click", renderQuiz);

shuffleBtn.addEventListener("click", () => {
  for (let i = currentCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [currentCards[i], currentCards[j]] = [currentCards[j], currentCards[i]];
  }
  statusMsg.textContent = "🔀 Deck shuffled!";
  currentMode === "quiz" ? renderQuiz() : renderFlashcards();
});

weakFilterBtn.addEventListener("click", () => {
  showWeakOnly = !showWeakOnly;
  weakFilterBtn.textContent = showWeakOnly ? "🔥 Weak Only: ON" : "🔥 Weak Only: OFF";
  currentMode === "quiz" ? renderQuiz() : renderFlashcards();
});

copyAllBtn.addEventListener("click", async () => {
  if (!currentCards.length) return;
  const formatted = currentCards
    .map((c, i) => `Q${i + 1}: ${c.question}\nA${i + 1}:\n${c.answer}`)
    .join("\n\n---\n\n");
  await navigator.clipboard.writeText(formatted);
  statusMsg.textContent = "📋 Copied full Study Pack to clipboard!";
});

pdfExportBtn.addEventListener("click", () => {
  if (!currentCards.length) return;
  statusMsg.textContent = "Opening Print / Save as PDF...";
  window.print();
});

shareAppBtn.addEventListener("click", async () => {
  const url = window.location.origin;
  if (navigator.share) {
    await navigator.share({
      title: "StudyFlash AI",
      text: "Turn textbook photos, PDFs, or notes into instant flashcards & quizzes:",
      url
    });
  } else {
    await navigator.clipboard.writeText(url);
    statusMsg.textContent = "🔗 App link copied! Paste it in WhatsApp to share.";
  }
});

clearBtn.addEventListener("click", () => {
  notesInput.value = "";
  cardsGrid.innerHTML = "";
  statusMsg.textContent = "";
  studyToolbar.classList.add("hidden");
  currentCards = [];
  uploadedBase64 = null;
  uploadedMimeType = "";
  if (fileUpload) fileUpload.value = "";
  if (filePreviewChip) filePreviewChip.classList.add("hidden");
});

initPrefs();
                             
