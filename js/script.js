// js/script.js
import { ACTIONS } from "./data.js";

(function () {
  // ===== State =====
  const state = {
    numPlayers: null,
    repetitions: null,
    players: [], // {name, dislikes:Set<actionId>}
    currentIndex: 0,
  };

  // ===== DOM =====
  const screenSetup   = document.getElementById("screen-setup");
  const screenPlayers = document.getElementById("screen-players");
  const screenPlay    = document.getElementById("screen-play");

  const stepChips = {
    1: document.querySelector('[data-step-chip="1"]'),
    2: document.querySelector('[data-step-chip="2"]'),
    3: document.querySelector('[data-step-chip="3"]'),
  };

  // Setup
  const participantsGrid = document.getElementById("participants-grid");
  const repsGrid         = document.getElementById("reps-grid");
  const resetSetup       = document.getElementById("reset-setup");
  const gotoPlayers      = document.getElementById("goto-players");
  const btnCustom        = document.getElementById("btn-custom"); // sera remplacé par un <input>

  // Players
  const playerForm  = document.getElementById("player-form");
  const playerName  = document.getElementById("player-name");
  const reasonsGrid = document.getElementById("reasons-grid");
  const playerIndex = document.getElementById("player-index");
  const prevPlayer  = document.getElementById("prev-player");
  const nextPlayer  = document.getElementById("next-player");

  // Play
  const actionPhrase = document.getElementById("action-phrase");
  const restartBtn   = document.getElementById("restart");
  const doneBtn      = document.getElementById("done");

  // ===== Helpers =====
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function setStep(step) {
    [1,2,3].forEach((s) => stepChips[s].classList.toggle("active", s === step));
  }
  function show(el){ el.classList.remove("hidden"); }
  function hide(el){ el.classList.add("hidden");  }

  // (sécurisation)
  function updateContinueButton() {
    const ok =
      Number.isInteger(state.numPlayers) &&
      state.numPlayers >= 2 && state.numPlayers <= 12 &&
      Number.isInteger(state.repetitions) && state.repetitions > 0;
    gotoPlayers.disabled = !ok;
  }

  function markSelected(container, selectorAttr, value) {
    container.querySelectorAll(".option-btn").forEach((b) => {
      const val = b.getAttribute(selectorAttr);
      b.classList.toggle("selected", val && String(val) === String(value));
    });
  }

  // ===== Message info sous la grille des participants =====
  function showParticipantsInfo(show) {
    let info = document.getElementById("participants-info");
    if (show) {
      if (!info) {
        info = document.createElement("div");
        info.id = "participants-info";
        info.textContent = "Saisir un nombre de participants entre 2 et 12";
        info.style.marginTop   = "8px";
        info.style.color       = "#cfd1d8";
        info.style.fontWeight  = "700";
        info.style.fontSize    = "12px";
        info.style.letterSpacing = ".3px";
        participantsGrid.insertAdjacentElement("afterend", info);
      }
    } else if (info) {
      info.remove();
    }
  }

  // ===== Custom "AUTRE" : transformer le bouton en input =====
  function ensureCustomInput() {
    let input = document.getElementById("custom-participants-input");
    if (input) return input;

    const newInput = document.createElement("input");
    newInput.type  = "number";
    newInput.min   = "2";
    newInput.max   = "12";
    newInput.id    = "custom-participants-input";
    newInput.className = "option-btn option-input";
    newInput.placeholder = "2–12";

    const prev = btnCustom?.dataset?.customValue;
    if (prev) newInput.value = prev;

    btnCustom.replaceWith(newInput);

    // Écoutes
    newInput.addEventListener("focus", () => showParticipantsInfo(true));

    newInput.addEventListener("input", () => {
      updateFromCustomInput(newInput.value);
    });

    newInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") e.preventDefault(); // pas de bouton Valider
    });

    return newInput;
  }

  function updateFromCustomInput(value) {
    const input = document.getElementById("custom-participants-input");
    if (!input) return;

    const n = Number(value);
    const valid = Number.isInteger(n) && n >= 2 && n <= 12;

    // Visuel : input .selected si sélectionné/actif
    input.classList.toggle("selected", true); // reste visuellement "le bouton choisi"
    // Si valide, on sélectionne la valeur
    if (valid) {
      state.numPlayers = n;
      input.dataset.customValue = String(n);
      // Désélectionner 2/3/4 pour éviter toute ambiguïté
      markSelected(participantsGrid, "data-participants", null);
      saveSetup();
    } else {
      // Valeur non valide => on garde la sélection visuelle d'AUTRE,
      // mais on n'autorise pas la suite
      state.numPlayers = null;
    }
    updateContinueButton();
  }

  // ===== Build reasons list =====
  function renderReasons() {
    reasonsGrid.innerHTML = "";
    ACTIONS.forEach((a) => {
      const id = `r-${a.id}`;
      const item = document.createElement("label");
      item.className = "reason";
      item.innerHTML = `
        <input type="checkbox" id="${id}" value="${a.id}">
        <div class="lbl">${a.reason}</div>`;
      reasonsGrid.appendChild(item);
    });
  }
  

  // ===== Players load/save =====
  function loadPlayer(idx) {
    setStep(2);
    playerIndex.textContent = `Joueur ${idx + 1} / ${state.numPlayers}`;
    const existing = state.players[idx];
    playerName.value = existing?.name || `Joueur ${idx + 1}`;
    reasonsGrid.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = existing ? existing.dislikes.has(cb.value) : false;
    });
    prevPlayer.disabled = idx === 0;
    nextPlayer.textContent = idx === state.numPlayers - 1 ? "COMMENCER" : "Continuer";
  }

  function savePlayer(idx) {
    const name = playerName.value.trim() || `Joueur ${idx + 1}`;
    const dislikes = new Set(
      Array.from(reasonsGrid.querySelectorAll('input[type="checkbox"]:checked')).map((cb) => cb.value)
    );
    state.players[idx] = { name, dislikes };
  }

  // ===== Persistance setup =====
  function saveSetup() {
    localStorage.setItem(
      "ph_setup",
      JSON.stringify({
        numPlayers: state.numPlayers,
        repetitions: state.repetitions,
      })
    );
  }
  function loadSetup() {
    try {
      const raw = localStorage.getItem("ph_setup");
      if (!raw) return;
      const s = JSON.parse(raw);

      if (Number.isInteger(s?.numPlayers)) {
        state.numPlayers = clamp(s.numPlayers, 2, 12);
      }
      if (Number.isInteger(s?.repetitions)) {
        state.repetitions = s.repetitions;
        markSelected(repsGrid, "data-reps", state.repetitions);
      }
      markSelected(participantsGrid, "data-participants", state.numPlayers);
      updateContinueButton();
    } catch (_) {}
  }

  // ===== Setup handlers =====
  participantsGrid.addEventListener("click", (e) => {
    const btn = e.target.closest(".option-btn");
    if (!btn) return;

    // 1) Clic sur AUTRE (bouton initial)
    if (btn.id === "btn-custom") {
      const inputEl = ensureCustomInput();

      // Indiquer visuellement que c'est le choix actif
      inputEl.classList.add("selected");           // dégradé rose
      markSelected(participantsGrid, "data-participants", null); // désélectionner 2/3/4
      showParticipantsInfo(true);

      // focus + select
      inputEl.focus();
      inputEl.select();

      // Si une valeur existe déjà, la ré-appliquer
      if (inputEl.value) updateFromCustomInput(inputEl.value);
      else {
        // pas de valeur → on bloque le "Continuer"
        state.numPlayers = null;
        updateContinueButton();
      }
      return;
    }

    // 2) Clic direct sur l'input "AUTRE" (déjà transformé)
    if (btn.id === "custom-participants-input") {
      btn.classList.add("selected");
      markSelected(participantsGrid, "data-participants", null);
      showParticipantsInfo(true);
      return;
    }

    // 3) Boutons 2/3/4
    const val = Number(btn.dataset.participants);
    if (!Number.isNaN(val)) {
      state.numPlayers = clamp(val, 2, 12);
      // visuel : sélectionner ce bouton, désélectionner "AUTRE"
      markSelected(participantsGrid, "data-participants", state.numPlayers);
      const customEl = document.getElementById("custom-participants-input");
      if (customEl) customEl.classList.remove("selected"); // garde la valeur, enlève juste le style sélectionné
      showParticipantsInfo(false);
      updateContinueButton();
      saveSetup();
    }
  });

  resetSetup.addEventListener("click", () => {
    state.numPlayers = null;
    state.repetitions = null;
    state.players = [];

    markSelected(participantsGrid, "data-participants", null);
    markSelected(repsGrid, "data-reps", null);

    const customEl = document.getElementById("custom-participants-input");
    if (customEl) {
      customEl.classList.remove("selected");
      customEl.value = "";
      customEl.removeAttribute("data-custom-value");
    }
    showParticipantsInfo(false);

    localStorage.removeItem("ph_setup");
    updateContinueButton();
  });

  // Répétitions
  repsGrid.addEventListener("click", (e) => {
    const btn = e.target.closest(".option-btn");
    if (!btn) return;
    const val = Number(btn.dataset.reps);
    if (!Number.isNaN(val)) {
      state.repetitions = val;
      markSelected(repsGrid, "data-reps", state.repetitions);
      updateContinueButton();
      saveSetup();
    }
  });

  // Lancer saisie joueurs
  gotoPlayers.addEventListener("click", () => {
    state.players = Array.from({ length: state.numPlayers }, (_, i) => ({
      name: `Joueur ${i + 1}`,
      dislikes: new Set(),
    }));
    state.currentIndex = 0;
    hide(screenSetup);
    show(screenPlayers);
    renderReasons();
    loadPlayer(0);
  });

  // ===== Players handlers =====
  prevPlayer.addEventListener("click", () => {
    savePlayer(state.currentIndex);
    if (state.currentIndex > 0) {
      state.currentIndex--;
      loadPlayer(state.currentIndex);
    }
  });

  playerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    savePlayer(state.currentIndex);
    if (state.currentIndex < state.numPlayers - 1) {
      state.currentIndex++;
      loadPlayer(state.currentIndex);
    } else {
      hide(screenPlayers);
      startGame();
    }
  });

  // ===== Game logic =====
  function startGame() {
    setStep(3);
    show(screenPlay);
    rollAction();
  }

  function possibleTriples() {
    const triples = [];
    for (let i = 0; i < state.players.length; i++) {
      for (let j = 0; j < state.players.length; j++) {
        if (i === j) continue;
        const recipient = state.players[j];
        ACTIONS.forEach((action) => {
          if (!recipient.dislikes.has(action.id)) {
            triples.push([i, j, action]);
          }
        });
      }
    }
    return triples;
  }

  function phraseFromTemplate(tpl, actor, recipient, n) {
    return tpl
      .replaceAll("{actor}", actor)
      .replaceAll("{recipient}", recipient)
      .replaceAll("{n}", n);
  }

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function rollAction() {
    const triples = possibleTriples();
    if (triples.length === 0) {
      actionPhrase.textContent =
        "Aucune action possible avec ces préférences. Modifiez vos ‘je n’aime pas…’ et relancez.";
    //   actionNames.innerHTML = "";
      return;
    }
    shuffleInPlace(triples);
    const [ai, ri, action] = triples[0];
    const actor = state.players[ai].name;
    const recipient = state.players[ri].name;
    const n = state.repetitions;

    const tpl = pick(action.templates);
    const sentence = phraseFromTemplate(tpl, actor, recipient, n);

    actionPhrase.textContent = sentence;
  }

  doneBtn.addEventListener("click", rollAction);
  restartBtn.addEventListener("click", () => {
    hide(screenPlay);
    show(screenPlayers);
    setStep(2);
    loadPlayer(0);
    state.currentIndex = 0;
  });

  // Init
  loadSetup();
  updateContinueButton();
})();
