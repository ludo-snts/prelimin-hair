// js/script.js
import { ACTIONS_BASE, BODY_PARTS, ACTION_ZONE_COMPAT, buildPhrase } from "./data.js";

(function () {
  // ===== State =====
  const state = {
    numPlayers: null,
    repsMode: "fixed",          // "fixed" | "random"
    repetitions: null,          // si fixed: 3/5/7
    players: [],                // {name, dislikedActions:Set, refusedZones:Set}
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
  const playerForm   = document.getElementById("player-form");
  const playerName   = document.getElementById("player-name");
  const actionsGrid  = document.getElementById("actions-grid");
  const zonesGrid    = document.getElementById("zones-grid");
  const playerIndex  = document.getElementById("player-index");
  const prevPlayer   = document.getElementById("prev-player");
  const nextPlayer   = document.getElementById("next-player");

  // Play
  const actionPhrase = document.getElementById("action-phrase");
  const restartBtn   = document.getElementById("restart");
  const doneBtn      = document.getElementById("done");

  // ===== Helpers =====
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function setStep(step) { [1,2,3].forEach((s) => stepChips[s].classList.toggle("active", s === step)); }
  function show(el){ el.classList.remove("hidden"); }
  function hide(el){ el.classList.add("hidden");  }

  function updateContinueButton() {
    const playersOk = Number.isInteger(state.numPlayers) && state.numPlayers >= 2 && state.numPlayers <= 12;
    const repsOk    = (state.repsMode === "random") || (Number.isInteger(state.repetitions) && state.repetitions > 0);
    gotoPlayers.disabled = !(playersOk && repsOk);
  }

  function markSelected(container, selectorAttr, value) {
    container.querySelectorAll(".option-btn").forEach((b) => {
      const val = b.getAttribute(selectorAttr);
      b.classList.toggle("selected", val && String(val) === String(value));
    });
  }

  // ===== Info "participants" sous la grille =====
  function showParticipantsInfo(show) {
    let info = document.getElementById("participants-info");
    if (show) {
      if (!info) {
        info = document.createElement("div");
        info.id = "participants-info";
        info.textContent = "Saisir un nombre de participants entre 2 et 12";
        info.style.marginTop = "8px";
        info.style.color = "#cfd1d8";
        info.style.fontWeight = "700";
        info.style.fontSize = "12px";
        info.style.letterSpacing = ".3px";
        participantsGrid.insertAdjacentElement("afterend", info);
      }
    } else if (info) {
      info.remove();
    }
  }

  // ===== "AUTRE" => input number inline =====
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

    newInput.addEventListener("focus", () => showParticipantsInfo(true));
    newInput.addEventListener("input", () => updateFromCustomInput(newInput.value));
    newInput.addEventListener("keydown", (e) => { if (e.key === "Enter") e.preventDefault(); });

    return newInput;
  }

  function updateFromCustomInput(value) {
    const input = document.getElementById("custom-participants-input");
    if (!input) return;

    const n = Number(value);
    const valid = Number.isInteger(n) && n >= 2 && n <= 12;

    input.classList.toggle("selected", true);
    if (valid) {
      state.numPlayers = n;
      input.dataset.customValue = String(n);
      markSelected(participantsGrid, "data-participants", null);
      saveSetup();
    } else {
      state.numPlayers = null;
    }
    updateContinueButton();
  }

  // ===== Rendu grilles préférences =====
  function renderActions() {
    actionsGrid.innerHTML = "";
    ACTIONS_BASE.forEach((a) => {
      const id = `act-${a.id}`;
      const label = document.createElement("label");
      label.className = "reason";
      label.innerHTML = `
        <input type="checkbox" id="${id}" value="${a.id}">
        <div class="lbl">${a.reason}</div>`;
      actionsGrid.appendChild(label);
    });
  }

  function renderZones() {
    zonesGrid.innerHTML = "";
    BODY_PARTS.forEach((z) => {
      const id = `zone-${z.id}`;
      const label = document.createElement("label");
      label.className = "reason";
      label.innerHTML = `
        <input type="checkbox" id="${id}" value="${z.id}">
        <div class="lbl">ne pas toucher ${z.def}</div>`;
      zonesGrid.appendChild(label);
    });
  }

  // ===== Load/Save joueur courant =====
  function loadPlayer(idx) {
    setStep(2);
    playerIndex.textContent = `Joueur ${idx + 1} / ${state.numPlayers}`;
    const p = state.players[idx];

    playerName.value = p?.name || `Joueur ${idx + 1}`;

    // Actions
    actionsGrid.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = p?.dislikedActions ? p.dislikedActions.has(cb.value) : false;
    });

    // Zones
    zonesGrid.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = p?.refusedZones ? p.refusedZones.has(cb.value) : false;
    });

    prevPlayer.disabled = idx === 0;
    nextPlayer.textContent = idx === state.numPlayers - 1 ? "COMMENCER" : "Continuer";
  }

  function savePlayer(idx) {
    const name = playerName.value.trim() || `Joueur ${idx + 1}`;

    const dislikedActions = new Set(
      Array.from(actionsGrid.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value)
    );
    const refusedZones = new Set(
      Array.from(zonesGrid.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value)
    );

    state.players[idx] = { name, dislikedActions, refusedZones };
    savePlayers();
  }

  // ===== Persistance =====
  function saveSetup() {
    localStorage.setItem("ph_setup", JSON.stringify({
      numPlayers: state.numPlayers,
      repsMode: state.repsMode,
      repetitions: state.repetitions,
    }));
  }

  function loadSetup() {
    try {
      const raw = localStorage.getItem("ph_setup");
      if (!raw) return;
      const s = JSON.parse(raw);

      if (Number.isInteger(s?.numPlayers)) {
        state.numPlayers = clamp(s.numPlayers, 2, 12);
      }
      state.repsMode = (s?.repsMode === "random") ? "random" : "fixed";

      if (state.repsMode === "fixed" && Number.isInteger(s?.repetitions)) {
        state.repetitions = s.repetitions;
        markSelected(repsGrid, "data-reps", state.repetitions);
      } else if (state.repsMode === "random") {
        markSelected(repsGrid, "data-reps", "random");
      }

      markSelected(participantsGrid, "data-participants", state.numPlayers);
      updateContinueButton();
    } catch(_) {}
  }

  function savePlayers() {
    const serial = state.players.map(p => ({
      name: p?.name || "",
      dislikedActions: p?.dislikedActions ? Array.from(p.dislikedActions) : [],
      refusedZones: p?.refusedZones ? Array.from(p.refusedZones) : [],
    }));
    localStorage.setItem("ph_players", JSON.stringify(serial));
  }

  function loadPlayers() {
    try {
      const raw = localStorage.getItem("ph_players");
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return;
      if (!state.numPlayers || arr.length !== state.numPlayers) return;

      state.players = arr.map((p, i) => ({
        name: p?.name || `Joueur ${i + 1}`,
        dislikedActions: new Set(Array.isArray(p?.dislikedActions) ? p.dislikedActions : []),
        refusedZones: new Set(Array.isArray(p?.refusedZones) ? p.refusedZones : []),
      }));
    } catch(_) {}
  }

  // ===== Setup handlers =====
  participantsGrid.addEventListener("click", (e) => {
    const btn = e.target.closest(".option-btn");
    if (!btn) return;

    // Clic sur AUTRE
    if (btn.id === "btn-custom") {
      const inputEl = ensureCustomInput();
      inputEl.classList.add("selected");
      markSelected(participantsGrid, "data-participants", null);
      showParticipantsInfo(true);
      inputEl.focus();
      inputEl.select();

      if (inputEl.value) updateFromCustomInput(inputEl.value);
      else { state.numPlayers = null; updateContinueButton(); }
      return;
    }

    // Clic sur l'input AUTRE déjà présent
    if (btn.id === "custom-participants-input") {
      btn.classList.add("selected");
      markSelected(participantsGrid, "data-participants", null);
      showParticipantsInfo(true);
      return;
    }

    // Boutons 2/3/4
    const val = Number(btn.dataset.participants);
    if (!Number.isNaN(val)) {
      state.numPlayers = clamp(val, 2, 12);
      markSelected(participantsGrid, "data-participants", state.numPlayers);
      const customEl = document.getElementById("custom-participants-input");
      if (customEl) customEl.classList.remove("selected");
      showParticipantsInfo(false);
      updateContinueButton();
      saveSetup();
    }
  });

  resetSetup.addEventListener("click", () => {
    state.numPlayers = null;
    state.repsMode = "fixed";
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
    localStorage.removeItem("ph_players");
    updateContinueButton();
  });

  // Répétitions (3/5/7/RANDOM)
  repsGrid.addEventListener("click", (e) => {
    const btn = e.target.closest(".option-btn");
    if (!btn) return;
    const val = btn.dataset.reps;

    if (val === "random") {
      state.repsMode = "random";
      state.repetitions = null;
      markSelected(repsGrid, "data-reps", "random");
    } else {
      const n = Number(val);
      if (!Number.isNaN(n)) {
        state.repsMode = "fixed";
        state.repetitions = n;
        markSelected(repsGrid, "data-reps", state.repetitions);
      }
    }
    updateContinueButton();
    saveSetup();
  });

  // Lancer l'écran joueurs
  gotoPlayers.addEventListener("click", () => {
    // si déjà des joueurs en storage avec la même taille, on les recharge
    if (!state.players.length) {
      state.players = Array.from({ length: state.numPlayers }, (_, i) => ({
        name: `Joueur ${i + 1}`,
        dislikedActions: new Set(),
        refusedZones: new Set(),
      }));
      loadPlayers(); // tentera d’écraser par ceux du storage si compatibles
    } else if (state.players.length !== state.numPlayers) {
      state.players = Array.from({ length: state.numPlayers }, (_, i) => ({
        name: `Joueur ${i + 1}`,
        dislikedActions: new Set(),
        refusedZones: new Set(),
      }));
    }

    hide(screenSetup);
    show(screenPlayers);
    renderActions();
    renderZones();
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

  function possibleCombos() {
    const combos = [];
    for (let ai = 0; ai < state.players.length; ai++) {
      for (let ri = 0; ri < state.players.length; ri++) {
        if (ai === ri) continue;
        const recip = state.players[ri];

        ACTIONS_BASE.forEach(action => {
          if (recip.dislikedActions?.has(action.id)) return;

          const zones = ACTION_ZONE_COMPAT[action.id] || [];
          zones.forEach(zoneId => {
            if (recip.refusedZones?.has(zoneId)) return;
            combos.push([ai, ri, action.id, zoneId]);
          });
        });
      }
    }
    return combos;
  }

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function rollAction() {
    const combos = possibleCombos();
    if (combos.length === 0) {
      actionPhrase.textContent =
        "Aucune action possible avec ces préférences. Ajustez vos refus et relancez.";
      return;
    }
    shuffleInPlace(combos);
    const [ai, ri, actionId, bodyId] = combos[0];
    const actor = state.players[ai].name;
    const recipient = state.players[ri].name;

    const n = (state.repsMode === "random") ? pick([3,5,7]) : state.repetitions;
    const mode = Math.random() < 0.5 ? "count" : "time";

    actionPhrase.textContent = buildPhrase({
      actor, recipient, actionId, bodyId, n, mode
    });
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
