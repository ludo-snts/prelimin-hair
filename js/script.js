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
    const screenSetup = document.getElementById("screen-setup");
    const screenPlayers = document.getElementById("screen-players");
    const screenPlay = document.getElementById("screen-play");
  
    const stepChips = {
      1: document.querySelector('[data-step-chip="1"]'),
      2: document.querySelector('[data-step-chip="2"]'),
      3: document.querySelector('[data-step-chip="3"]'),
    };
  
    // Setup screen
    const participantsGrid = document.getElementById("participants-grid");
    const repsGrid = document.getElementById("reps-grid");
    const btnCustom = document.getElementById("btn-custom");
    const customRow = document.getElementById("custom-participants-row");
    const customInput = document.getElementById("custom-participants");
    const applyCustom = document.getElementById("apply-custom");
    const resetSetup = document.getElementById("reset-setup");
    const gotoPlayers = document.getElementById("goto-players");
  
    // Players screen
    const playerForm = document.getElementById("player-form");
    const playerName = document.getElementById("player-name");
    const reasonsGrid = document.getElementById("reasons-grid");
    const playerIndex = document.getElementById("player-index");
    const prevPlayer = document.getElementById("prev-player");
    const nextPlayer = document.getElementById("next-player");
  
    // Play screen
    const actionPhrase = document.getElementById("action-phrase");
    const actionNames = document.getElementById("action-names");
    const restartBtn = document.getElementById("restart");
    const doneBtn = document.getElementById("done");
  
    // ===== Helpers =====
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  
    function setStep(step) {
      [1, 2, 3].forEach((s) => {
        stepChips[s].classList.toggle("active", s === step);
      });
    }
    function show(el) {
      el.classList.remove("hidden");
    }
    function hide(el) {
      el.classList.add("hidden");
    }
  
    // Version durcie
    function updateContinueButton() {
      const ok =
        Number.isInteger(state.numPlayers) &&
        state.numPlayers >= 2 &&
        state.numPlayers <= 12 &&
        Number.isInteger(state.repetitions) &&
        state.repetitions > 0;
      gotoPlayers.disabled = !ok;
    }
  
    function markSelected(container, selectorAttr, value) {
      container.querySelectorAll(".option-btn").forEach((b) => {
        const val = b.getAttribute(selectorAttr);
        b.classList.toggle("selected", val && String(val) === String(value));
      });
    }
  
    // Build reasons list UI
    function renderReasons() {
      reasonsGrid.innerHTML = "";
      ACTIONS.forEach((a) => {
        const id = `r-${a.id}`;
        const item = document.createElement("label");
        item.className = "reason";
        item.innerHTML = `
            <input type="checkbox" id="${id}" value="${a.id}">
            <div class="lbl">
              <div><span class="num">${a.labelNum}</span> ${a.reason}</div>
            </div>`;
        reasonsGrid.appendChild(item);
      });
    }
  
    // Fill/Read form for a given player index
    function loadPlayer(idx) {
      setStep(2);
      playerIndex.textContent = `Joueur ${idx + 1} / ${state.numPlayers}`;
      const existing = state.players[idx];
      playerName.value = existing?.name || `Joueur ${idx + 1}`;
      reasonsGrid.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        cb.checked = existing ? existing.dislikes.has(cb.value) : false;
      });
      prevPlayer.disabled = idx === 0;
      nextPlayer.textContent =
        idx === state.numPlayers - 1 ? "COMMENCER" : "Continuer";
    }
  
    function savePlayer(idx) {
      const name = playerName.value.trim() || `Joueur ${idx + 1}`;
      const dislikes = new Set(
        Array.from(
          reasonsGrid.querySelectorAll('input[type="checkbox"]:checked')
        ).map((cb) => cb.value)
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
        if (Number.isInteger(s?.numPlayers))
          state.numPlayers = clamp(s.numPlayers, 2, 12);
        if (Number.isInteger(s?.repetitions)) state.repetitions = s.repetitions;
  
        if (state.numPlayers) {
          markSelected(participantsGrid, "data-participants", state.numPlayers);
          btnCustom.classList.remove("selected");
        }
        if (state.repetitions) {
          markSelected(repsGrid, "data-reps", state.repetitions);
        }
        updateContinueButton();
      } catch (_) {}
    }
  
    // ===== Setup handlers =====
    participantsGrid.addEventListener("click", (e) => {
      const btn = e.target.closest(".option-btn");
      if (!btn) return;
      if (btn === btnCustom) {
        customRow.classList.toggle("hidden");
        return;
      }
      const val = Number(btn.dataset.participants);
      if (!Number.isNaN(val)) {
        state.numPlayers = clamp(val, 2, 12);
        customRow.classList.add("hidden");
        markSelected(participantsGrid, "data-participants", state.numPlayers);
        updateContinueButton();
        saveSetup();
      }
    });
  
    // Enter valide le champ personnalisé
    customInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyCustom.click();
      }
    });
  
    applyCustom.addEventListener("click", () => {
      const n = clamp(Number(customInput.value || 0), 2, 12);
      if (n >= 2) {
        state.numPlayers = n;
        markSelected(participantsGrid, "data-participants", null);
        btnCustom.classList.add("selected");
        updateContinueButton();
        saveSetup();
      }
    });
  
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
  
    resetSetup.addEventListener("click", () => {
      state.numPlayers = null;
      state.repetitions = null;
      state.players = [];
      markSelected(participantsGrid, "data-participants", null);
      markSelected(repsGrid, "data-reps", null);
      btnCustom.classList.remove("selected");
      customRow.classList.add("hidden");
      customInput.value = "";
      localStorage.removeItem("ph_setup");
      updateContinueButton();
    });
  
    gotoPlayers.addEventListener("click", () => {
      // initialize players
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
        // Start game
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
  
    // Shuffle pour varier les combinaisons
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
        actionNames.innerHTML = "";
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
      actionNames.innerHTML = `
          <span class="tag">Acteur·rice : ${actor}</span>
          <span class="tag">Cible : ${recipient}</span>
          <span class="tag">Répétitions : ${n}</span>
        `;
    }
  
    doneBtn.addEventListener("click", rollAction);
    restartBtn.addEventListener("click", () => {
      // Back to players to ajust preferences
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
  