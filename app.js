(() => {
  "use strict";

  const SYMBOLS = [
    {
      id: "circle",
      name: "Circle",
      svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><circle cx="50" cy="50" r="38"/></svg>`,
    },
    {
      id: "cross",
      name: "Cross",
      svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"><line x1="50" y1="10" x2="50" y2="90"/><line x1="10" y1="50" x2="90" y2="50"/></svg>`,
    },
    {
      id: "waves",
      name: "Waves",
      svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"><path d="M8,32 Q18,23 28,32 T48,32 T68,32 T88,32"/><path d="M8,50 Q18,41 28,50 T48,50 T68,50 T88,50"/><path d="M8,68 Q18,59 28,68 T48,68 T68,68 T88,68"/></svg>`,
    },
    {
      id: "square",
      name: "Square",
      svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"><rect x="14" y="14" width="72" height="72"/></svg>`,
    },
    {
      id: "star",
      name: "Star",
      svg: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linejoin="round"><path d="M50,8 L59.4,37.06 L89.95,36.98 L65.22,54.94 L74.69,83.98 L50,66 L25.31,83.98 L34.78,54.94 L10.05,36.98 L40.6,37.06 Z"/></svg>`,
    },
  ];

  const HISTORY_KEY = "zenerHistory";
  const CHANCE_RATE = 0.2;

  const els = {
    playArea: document.getElementById("playArea"),
    cardNum: document.getElementById("cardNum"),
    deckSize: document.getElementById("deckSize"),
    guessRow: document.getElementById("guessRow"),
    newDeckBtn: document.getElementById("newDeckBtn"),
    runSummary: document.getElementById("runSummary"),
    summaryText: document.getElementById("summaryText"),
    breakdownGrid: document.getElementById("breakdownGrid"),
    startAgainBtn: document.getElementById("startAgainBtn"),
    statRuns: document.getElementById("statRuns"),
    statTrials: document.getElementById("statTrials"),
    statAccuracy: document.getElementById("statAccuracy"),
    chart: document.getElementById("chart"),
    chartEmpty: document.getElementById("chartEmpty"),
    historyBody: document.getElementById("historyBody"),
    clearHistoryBtn: document.getElementById("clearHistoryBtn"),
  };

  let state = {
    deck: [],
    guesses: [],
    pos: 0,
  };

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildDeck() {
    const deck = [];
    SYMBOLS.forEach((s) => {
      for (let i = 0; i < 5; i++) deck.push(s.id);
    });
    return shuffle(deck);
  }

  function symbolById(id) {
    return SYMBOLS.find((s) => s.id === id);
  }

  function renderGuessButtons() {
    els.guessRow.innerHTML = "";
    SYMBOLS.forEach((s) => {
      const btn = document.createElement("button");
      btn.className = "guess-btn";
      btn.dataset.symbol = s.id;
      btn.title = s.name;
      btn.setAttribute("aria-label", s.name);
      btn.innerHTML = s.svg;
      btn.addEventListener("click", () => submitGuess(s.id));
      els.guessRow.appendChild(btn);
    });
  }

  function updateStatusBar() {
    els.cardNum.textContent = Math.min(state.pos + 1, state.deck.length);
    els.deckSize.textContent = state.deck.length;
  }

  function submitGuess(guessId) {
    if (state.pos >= state.deck.length) return;

    state.guesses.push(guessId);
    state.pos++;

    if (state.pos >= state.deck.length) {
      finishRun();
    } else {
      updateStatusBar();
    }
  }

  function finishRun() {
    const total = state.deck.length;
    const score = state.guesses.reduce((sum, g, i) => sum + (g === state.deck[i] ? 1 : 0), 0);
    const accuracy = (score / total) * 100;

    saveRun({
      date: new Date().toISOString(),
      score,
      total,
      accuracy,
    });

    els.summaryText.textContent =
      `You scored ${score} of ${total} (${accuracy.toFixed(1)}%). ` +
      `Random chance expects about ${(total * CHANCE_RATE).toFixed(1)} correct (20%).`;

    els.breakdownGrid.innerHTML = state.deck
      .map((actualId, i) => {
        const guessId = state.guesses[i];
        const correct = guessId === actualId;
        return `<div class="breakdown-item ${correct ? "correct" : "incorrect"}">
          <div class="bd-icon bd-guess">${symbolById(guessId).svg}</div>
          <div class="bd-sep">${correct ? "&check;" : "&#10005;"}</div>
          <div class="bd-icon bd-actual">${symbolById(actualId).svg}</div>
        </div>`;
      })
      .join("");

    els.playArea.classList.add("hidden");
    els.runSummary.classList.remove("hidden");

    renderStats();
  }

  function newDeck() {
    state = { deck: buildDeck(), guesses: [], pos: 0 };
    els.runSummary.classList.add("hidden");
    els.playArea.classList.remove("hidden");
    updateStatusBar();
  }

  els.newDeckBtn.addEventListener("click", newDeck);
  els.startAgainBtn.addEventListener("click", newDeck);

  // ---- History / stats ----

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveRun(run) {
    const history = loadHistory();
    history.push(run);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    renderStats();
  }

  els.clearHistoryBtn.addEventListener("click", () => {
    if (confirm("Clear all saved run history? This cannot be undone.")) {
      clearHistory();
    }
  });

  function renderStats() {
    const history = loadHistory();
    const runs = history.length;
    const totalTrials = history.reduce((sum, r) => sum + r.total, 0);
    const totalScore = history.reduce((sum, r) => sum + r.score, 0);
    const overallAccuracy = totalTrials ? (totalScore / totalTrials) * 100 : null;

    els.statRuns.textContent = runs;
    els.statTrials.textContent = totalTrials;
    els.statAccuracy.textContent = overallAccuracy === null ? "—" : overallAccuracy.toFixed(1) + "%";

    renderHistoryTable(history);
    renderChart(history);
  }

  function renderHistoryTable(history) {
    const rows = [...history].reverse().slice(0, 50);
    els.historyBody.innerHTML = rows
      .map((r) => {
        const d = new Date(r.date);
        const dateStr = isNaN(d) ? "" : d.toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        return `<tr><td>${dateStr}</td><td>${r.score}/${r.total}</td><td>${r.accuracy.toFixed(1)}%</td></tr>`;
      })
      .join("");
  }

  function renderChart(history) {
    if (!history.length) {
      els.chart.innerHTML = "";
      els.chartEmpty.style.display = "flex";
      return;
    }
    els.chartEmpty.style.display = "none";

    const recent = history.slice(-15);
    const W = 400;
    const H = 160;
    const padTop = 12;
    const padBottom = 22;
    const padLeft = 8;
    const padRight = 8;
    const plotH = H - padTop - padBottom;
    const n = recent.length;
    const barGap = 6;
    const barW = Math.max(6, (W - padLeft - padRight - barGap * (n - 1)) / n);

    const yForPct = (pct) => padTop + plotH * (1 - pct / 100);
    const chanceY = yForPct(20);

    let svg = "";
    svg += `<line x1="${padLeft}" y1="${chanceY}" x2="${W - padRight}" y2="${chanceY}" stroke="var(--ink-soft)" stroke-width="1.5" stroke-dasharray="4 3"/>`;
    svg += `<text x="${W - padRight}" y="${chanceY - 4}" text-anchor="end" font-size="9" fill="var(--ink-soft)">chance 20%</text>`;

    recent.forEach((r, i) => {
      const x = padLeft + i * (barW + barGap);
      const y = yForPct(r.accuracy);
      const h = padTop + plotH - y;
      const color = r.accuracy > 20 ? "var(--good)" : "var(--accent)";
      svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="2" fill="${color}"><title>${r.accuracy.toFixed(1)}% (${r.score}/${r.total})</title></rect>`;
    });

    svg += `<line x1="${padLeft}" y1="${padTop + plotH}" x2="${W - padRight}" y2="${padTop + plotH}" stroke="var(--border)" stroke-width="1"/>`;

    els.chart.innerHTML = svg;
  }

  // ---- init ----
  renderGuessButtons();
  newDeck();
  renderStats();
})();
