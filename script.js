/**
 * =========================================================================
 * CYBERSPIN CLASSROOM EDITION - MAIN ENGINE
 * =========================================================================
 * Highlights:
 * - Equal (1/N) Probability for every candidate.
 * - Automatic default icon (🎓) for quick entry.
 * - Multi-mode Card rendering ("Icon Only", "Name Only", "Both").
 * - GSAP-powered smooth physics reel spins & mechanical lever interaction.
 * - 100% self-contained Web Audio API synthesizer.
 * - Full browser LocalStorage persistence.
 * =========================================================================
 */

'use strict';

/* =========================================================================
   1. SOUND SYNTHESIS ENGINE (Web Audio API)
   Generates clean arcade sound effects with zero external files.
   ========================================================================= */
class CyberSoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playLeverPull() {
    if (this.muted) return;
    this.initContext();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.18);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  playReelTick(pitchVariance = 1) {
    if (this.muted) return;
    this.initContext();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = 950 * pitchVariance;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.035);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  }

  playReelStop() {
    if (this.muted) return;
    this.initContext();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.12);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  playJackpotFanfare() {
    if (this.muted) return;
    this.initContext();
    const chords = [
      [523.25, 659.25, 783.99],
      [587.33, 739.99, 880.00],
      [659.25, 830.61, 987.77],
      [1046.50, 1318.51, 1567.98]
    ];

    chords.forEach((chord, step) => {
      const startTime = this.ctx.currentTime + step * 0.2;
      chord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2400;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    });
  }

  playLossSound() {
    if (this.muted) return;
    this.initContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(105, now + 0.28);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.28);
  }

  playUiClick() {
    if (this.muted) return;
    this.initContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.02);
  }
}

const audio = new CyberSoundSynthesizer();

/* =========================================================================
   2. DEFAULT CONFIGURATION DATA (Equal Probability Roster)
   ========================================================================= */
const DEFAULT_MACHINE_NAME = "CYBERSPIN // CLASSROOM";
const DEFAULT_ICON = "🎓"; // Assigned automatically to all symbols

const DEFAULT_SYMBOLS = [
  { id: "sym-1", name: "Ada Lovelace",      icon: DEFAULT_ICON, mode: "both" },
  { id: "sym-2", name: "Alan Turing",       icon: DEFAULT_ICON, mode: "both" },
  { id: "sym-3", name: "Grace Hopper",      icon: DEFAULT_ICON, mode: "both" },
  { id: "sym-4", name: "Linus Torvalds",    icon: DEFAULT_ICON, mode: "both" },
  { id: "sym-5", name: "Margaret Hamilton", icon: DEFAULT_ICON, mode: "both" },
  { id: "sym-6", name: "Claude Shannon",    icon: DEFAULT_ICON, mode: "both" },
  { id: "sym-7", name: "Tim Berners-Lee",   icon: DEFAULT_ICON, mode: "both" },
  { id: "sym-8", name: "Katherine Johnson", icon: DEFAULT_ICON, mode: "both" }
];

/* =========================================================================
   3. APPLICATION STATE
   ========================================================================= */
const state = {
  machineName: DEFAULT_MACHINE_NAME,
  symbols: [],
  isSpinning: false,
  totalSpins: 0,
  totalWins: 0,
  lastWinner: "NONE",
  activeReelSymbols: [[], [], []]
};

const CARD_HEIGHT = 120;

/* =========================================================================
   4. UNIFORM RANDOM SELECTION (Equal Probability 1/N)
   =========================================================================
   Every candidate in the classroom roster has an identical mathematical chance.
   ========================================================================= */
function getRandomSymbol(symbolsList = state.symbols) {
  if (!symbolsList || symbolsList.length === 0) {
    return DEFAULT_SYMBOLS[0];
  }
  const randomIndex = Math.floor(Math.random() * symbolsList.length);
  return symbolsList[randomIndex];
}

/* =========================================================================
   5. LOCALSTORAGE PERSISTENCE
   ========================================================================= */
const STORAGE_KEY = 'cyberspin_uniform_roster';

function saveSettings() {
  const payload = {
    machineName: state.machineName,
    symbols: state.symbols,
    totalSpins: state.totalSpins,
    totalWins: state.totalWins,
    lastWinner: state.lastWinner
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      state.machineName = data.machineName || DEFAULT_MACHINE_NAME;
      state.symbols = Array.isArray(data.symbols) && data.symbols.length >= 3 
        ? data.symbols 
        : JSON.parse(JSON.stringify(DEFAULT_SYMBOLS));
      state.totalSpins = Number(data.totalSpins) || 0;
      state.totalWins = Number(data.totalWins) || 0;
      state.lastWinner = data.lastWinner || "NONE";
      return;
    }
  } catch (err) {
    console.warn("Storage loading fallback applied:", err);
  }
  state.machineName = DEFAULT_MACHINE_NAME;
  state.symbols = JSON.parse(JSON.stringify(DEFAULT_SYMBOLS));
}

function resetSettingsToDefaults() {
  localStorage.removeItem(STORAGE_KEY);
  loadSettings();
  updateUI();
  populateInitialReels();
  buildConfigTable();
}

/* =========================================================================
   6. DOM & CARD RENDERING UTILITIES
   ========================================================================= */
function createCardElement(symbol) {
  const card = document.createElement('div');
  card.className = `reel-card mode-${symbol.mode || 'both'}`;

  const inner = document.createElement('div');
  inner.className = 'card-inner';

  const iconSpan = document.createElement('span');
  iconSpan.className = 'card-icon';
  iconSpan.textContent = symbol.icon || DEFAULT_ICON;

  const nameSpan = document.createElement('span');
  nameSpan.className = 'card-name';
  nameSpan.textContent = symbol.name || 'Student';

  inner.appendChild(iconSpan);
  inner.appendChild(nameSpan);
  card.appendChild(inner);

  return card;
}

function populateInitialReels() {
  for (let r = 0; r < 3; r++) {
    const strip = document.getElementById(`reel-strip-${r}`);
    strip.innerHTML = '';

    const initialTriad = [
      getRandomSymbol(),
      getRandomSymbol(),
      getRandomSymbol()
    ];
    state.activeReelSymbols[r] = initialTriad;

    initialTriad.forEach(sym => {
      strip.appendChild(createCardElement(sym));
    });

    gsap.set(strip, { y: 0 });
  }
}

/* =========================================================================
   7. ANIMATED BEZEL LIGHTS
   ========================================================================= */
let bezelInterval = null;

function setupBezelLEDs() {
  const bezel = document.getElementById('led-bezel');
  bezel.innerHTML = '';
  const totalLeds = 32;

  for (let i = 0; i < totalLeds; i++) {
    const bulb = document.createElement('div');
    bulb.className = 'led-bulb';
    bulb.id = `led-${i}`;
    bezel.appendChild(bulb);
  }
  startNormalBezelAnimation();
}

function startNormalBezelAnimation() {
  clearInterval(bezelInterval);
  let step = 0;
  const totalLeds = 32;

  bezelInterval = setInterval(() => {
    for (let i = 0; i < totalLeds; i++) {
      const bulb = document.getElementById(`led-${i}`);
      if (!bulb) return;
      bulb.className = 'led-bulb';
      if ((i + step) % 4 === 0) {
        bulb.classList.add('active-cyan');
      } else if ((i + step) % 4 === 2) {
        bulb.classList.add('active-magenta');
      }
    }
    step = (step + 1) % totalLeds;
  }, 180);
}

function startFastSpinBezelAnimation() {
  clearInterval(bezelInterval);
  let step = 0;
  const totalLeds = 32;

  bezelInterval = setInterval(() => {
    for (let i = 0; i < totalLeds; i++) {
      const bulb = document.getElementById(`led-${i}`);
      if (!bulb) return;
      bulb.className = 'led-bulb';
      if ((i + step) % 3 === 0) {
        bulb.classList.add('active-cyan');
      } else if ((i + step) % 3 === 1) {
        bulb.classList.add('active-gold');
      }
    }
    step = (step + 1) % totalLeds;
  }, 50);
}

function triggerJackpotRainbowBezel() {
  clearInterval(bezelInterval);
  let step = 0;
  const totalLeds = 32;
  const classes = ['active-cyan', 'active-magenta', 'active-gold'];

  bezelInterval = setInterval(() => {
    for (let i = 0; i < totalLeds; i++) {
      const bulb = document.getElementById(`led-${i}`);
      if (!bulb) return;
      bulb.className = 'led-bulb ' + classes[(i + step) % classes.length];
    }
    step++;
  }, 70);

  setTimeout(() => {
    startNormalBezelAnimation();
  }, 4500);
}

/* =========================================================================
   8. SPIN LOGIC & REEL PHYSICS (GSAP)
   ========================================================================= */
function spinMachine() {
  if (state.isSpinning) return;

  state.isSpinning = true;
  state.totalSpins += 1;
  updateUI();
  setSpinControlsDisabled(true);
  setMarqueeText("SELECTING RANDOM CANDIDATES...");
  startFastSpinBezelAnimation();

  // Pick target stop candidate for each reel with equal odds
  const targetWinners = [
    getRandomSymbol(),
    getRandomSymbol(),
    getRandomSymbol()
  ];

  const reelDurations = [1.8, 2.4, 3.0];
  const spinStripLength = 26;
  const reelPromises = [];

  for (let r = 0; r < 3; r++) {
    const strip = document.getElementById(`reel-strip-${r}`);
    const col = document.getElementById(`reel-col-${r}`);
    
    col.classList.add('spinning');
    strip.innerHTML = '';

    const stripFragment = document.createDocumentFragment();

    // 1. Re-attach current resting items for smooth start
    state.activeReelSymbols[r].forEach(sym => {
      stripFragment.appendChild(createCardElement(sym));
    });

    // 2. Intermediate blur filler items
    for (let i = 3; i < spinStripLength - 3; i++) {
      const filler = state.symbols[Math.floor(Math.random() * state.symbols.length)];
      stripFragment.appendChild(createCardElement(filler));
    }

    // 3. Final stop triad
    const stopAbove = getRandomSymbol();
    const stopCenter = targetWinners[r];
    const stopBelow = getRandomSymbol();

    stripFragment.appendChild(createCardElement(stopAbove));
    stripFragment.appendChild(createCardElement(stopCenter));
    stripFragment.appendChild(createCardElement(stopBelow));

    strip.appendChild(stripFragment);
    gsap.set(strip, { y: 0 });

    const targetY = -((spinStripLength - 3) * CARD_HEIGHT);

    const tickInterval = setInterval(() => {
      audio.playReelTick(1 + r * 0.15);
    }, 90);

    const promise = new Promise(resolve => {
      gsap.to(strip, {
        y: targetY,
        duration: reelDurations[r],
        ease: "back.out(1.15)",
        onComplete: () => {
          clearInterval(tickInterval);
          audio.playReelStop();
          col.classList.remove('spinning');

          state.activeReelSymbols[r] = [stopAbove, stopCenter, stopBelow];

          // Reset simplified strip
          strip.innerHTML = '';
          state.activeReelSymbols[r].forEach(s => strip.appendChild(createCardElement(s)));
          gsap.set(strip, { y: 0 });

          resolve();
        }
      });
    });

    reelPromises.push(promise);
  }

  Promise.all(reelPromises).then(() => {
    evaluateResult(targetWinners);
  });
}

/* =========================================================================
   9. RESULT EVALUATION & CELEBRATION
   ========================================================================= */
function evaluateResult(winners) {
  startNormalBezelAnimation();
  state.isSpinning = false;
  setSpinControlsDisabled(false);

  const [reelA, reelB, reelC] = winners;
  const isThreeMatch = (reelA.id === reelB.id && reelB.id === reelC.id);

  if (isThreeMatch) {
    state.totalWins += 1;
    state.lastWinner = reelA.name;
    updateUI();
    saveSettings();

    audio.playJackpotFanfare();
    triggerJackpotRainbowBezel();
    triggerScreenShake();
    fireCelebrationConfetti();

    showWinBanner({
      title: "TRIPLE MATCH!",
      symbol: reelA.icon || DEFAULT_ICON,
      message: `Winner: ${reelA.name}!`,
      payout: "CLASSROOM CHAMPION!"
    });

    setMarqueeText(`★ WINNER SELECTED: 3x [${reelA.name.toUpperCase()}]! ★`);
  } else {
    audio.playLossSound();
    updateUI();
    saveSettings();
    setMarqueeText("NO MATCH // PULL LEVER TO TRY AGAIN");
  }
}

/* =========================================================================
   10. INTERACTIVE 3D MECHANICAL LEVER
   ========================================================================= */
function setupMechanicalLever() {
  const lever = document.getElementById('lever-assembly');
  const leverArm = document.getElementById('lever-arm-wrapper');
  let isPulling = false;

  function executeLeverPull() {
    if (state.isSpinning || isPulling) return;
    isPulling = true;

    audio.playLeverPull();

    const tl = gsap.timeline({
      onComplete: () => {
        isPulling = false;
        spinMachine();
      }
    });

    tl.to(leverArm, {
      rotation: 65,
      scaleY: 0.7,
      duration: 0.22,
      ease: "power2.in"
    })
    .to(leverArm, {
      rotation: 0,
      scaleY: 1.0,
      duration: 0.45,
      ease: "elastic.out(1.2, 0.4)"
    });
  }

  lever.addEventListener('click', executeLeverPull);

  let startY = 0;
  lever.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  }, { passive: true });

  lever.addEventListener('touchend', (e) => {
    const endY = e.changedTouches[0].clientY;
    if (endY - startY > 30) {
      executeLeverPull();
    }
  }, { passive: true });
}

/* =========================================================================
   11. CELEBRATION FX
   ========================================================================= */
function fireCelebrationConfetti() {
  if (typeof confetti !== 'function') return;
  const duration = 2.5 * 1000;
  const end = Date.now() + duration;

  (function frame() {
    confetti({
      particleCount: 12,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#00f0ff', '#ff007f', '#ffe600', '#00ff66']
    });
    confetti({
      particleCount: 12,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#00f0ff', '#ff007f', '#ffe600', '#00ff66']
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }());
}

function triggerScreenShake() {
  const machine = document.getElementById('slot-machine');
  machine.classList.remove('screen-shake');
  void machine.offsetWidth;
  machine.classList.add('screen-shake');
  setTimeout(() => machine.classList.remove('screen-shake'), 600);
}

function showWinBanner({ title, symbol, message, payout }) {
  const overlay = document.getElementById('win-banner');
  document.getElementById('banner-title').textContent = title;
  document.getElementById('banner-symbol').textContent = symbol;
  document.getElementById('banner-msg').textContent = message;
  document.getElementById('banner-payout').textContent = payout;

  overlay.classList.add('show');

  const dismiss = () => {
    overlay.classList.remove('show');
    overlay.removeEventListener('click', dismiss);
  };

  overlay.addEventListener('click', dismiss);
  setTimeout(dismiss, 3200);
}

/* =========================================================================
   12. HUD & UI SYNCHRONIZATION
   ========================================================================= */
function updateUI() {
  document.getElementById('display-machine-title').textContent = state.machineName;
  document.getElementById('stat-spins').textContent = state.totalSpins.toLocaleString();
  document.getElementById('stat-wins').textContent = state.totalWins.toLocaleString();
  document.getElementById('stat-last-winner').textContent = state.lastWinner;

  const winRate = state.totalSpins > 0 ? ((state.totalWins / state.totalSpins) * 100).toFixed(1) : "0.0";
  document.getElementById('stat-winrate').textContent = `${winRate}%`;

  const spinBtn = document.getElementById('spin-main-btn');
  spinBtn.disabled = state.isSpinning;
}

function setMarqueeText(msg) {
  document.getElementById('marquee-text').textContent = msg;
}

function setSpinControlsDisabled(disabled) {
  document.getElementById('spin-main-btn').disabled = disabled;
  document.getElementById('settings-open-btn').disabled = disabled;
}

/* =========================================================================
   13. CONFIGURATION MODAL CONTROLLER
   ========================================================================= */
function setupConfigModal() {
  const modal = document.getElementById('settings-modal');
  const openBtn = document.getElementById('settings-open-btn');
  const closeX = document.getElementById('settings-close-x');
  const cancelBtn = document.getElementById('cfg-cancel-btn');
  const saveBtn = document.getElementById('cfg-save-btn');
  const resetBtn = document.getElementById('cfg-reset-btn');
  const addSymbolBtn = document.getElementById('add-symbol-btn');

  function openModal() {
    if (state.isSpinning) return;
    audio.playUiClick();
    document.getElementById('cfg-machine-name').value = state.machineName;
    buildConfigTable();
    modal.classList.add('open');
  }

  function closeModal() {
    audio.playUiClick();
    modal.classList.remove('open');
  }

  openBtn.addEventListener('click', openModal);
  closeX.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  saveBtn.addEventListener('click', () => {
    audio.playUiClick();

    const newTitle = document.getElementById('cfg-machine-name').value.trim();
    if (newTitle) state.machineName = newTitle;

    const rows = document.querySelectorAll('#symbols-table-body tr');
    const updatedSymbols = [];

    rows.forEach(tr => {
      const id = tr.dataset.id;
      const mode = tr.querySelector('.row-mode').value;
      const icon = tr.querySelector('.row-icon').value.trim() || DEFAULT_ICON;
      const name = tr.querySelector('.row-name').value.trim() || 'Student';

      updatedSymbols.push({ id, mode, icon, name });
    });

    if (updatedSymbols.length < 3) {
      alert("A minimum of 3 students is required for the slot machine!");
      return;
    }

    state.symbols = updatedSymbols;
    saveSettings();
    updateUI();
    populateInitialReels();
    closeModal();
    setMarqueeText("ROSTER SAVED // ALL ODDS ARE EQUAL (1/N)");
  });

  resetBtn.addEventListener('click', () => {
    audio.playUiClick();
    if (confirm("Reset the roster back to default classroom configuration?")) {
      resetSettingsToDefaults();
      document.getElementById('cfg-machine-name').value = state.machineName;
      buildConfigTable();
    }
  });

  addSymbolBtn.addEventListener('click', () => {
    audio.playUiClick();
    const newId = `sym-${Date.now()}`;
    state.symbols.push({
      id: newId,
      name: "New Student",
      icon: DEFAULT_ICON, // Default assigned automatically
      mode: "both"
    });
    buildConfigTable();
  });
}

function buildConfigTable() {
  const tbody = document.getElementById('symbols-table-body');
  tbody.innerHTML = '';

  state.symbols.forEach((sym, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.id = sym.id;

    tr.innerHTML = `
      <td>
        <select class="mode-select row-mode">
          <option value="both" ${sym.mode === 'both' ? 'selected' : ''}>Both (Icon + Name)</option>
          <option value="name" ${sym.mode === 'name' ? 'selected' : ''}>Name Only</option>
          <option value="icon" ${sym.mode === 'icon' ? 'selected' : ''}>Icon Only</option>
        </select>
      </td>
      <td>
        <input type="text" class="cyber-input table-input row-icon" value="${sym.icon || DEFAULT_ICON}" style="text-align: center;" />
      </td>
      <td>
        <input type="text" class="cyber-input table-input row-name" value="${sym.name}" />
      </td>
      <td style="text-align: center;">
        <button class="delete-row-btn" ${state.symbols.length <= 3 ? 'disabled' : ''} title="Delete Student">✖</button>
      </td>
    `;

    const delBtn = tr.querySelector('.delete-row-btn');
    delBtn.addEventListener('click', () => {
      audio.playUiClick();
      if (state.symbols.length <= 3) return;
      state.symbols.splice(idx, 1);
      buildConfigTable();
    });

    tbody.appendChild(tr);
  });
}

/* =========================================================================
   14. CONTROLS INITIALIZATION
   ========================================================================= */
function setupControls() {
  const soundBtn = document.getElementById('sound-toggle-btn');
  const soundIcon = document.getElementById('sound-icon');
  const soundLabel = document.getElementById('sound-label');

  soundBtn.addEventListener('click', () => {
    audio.muted = !audio.muted;
    if (audio.muted) {
      soundIcon.textContent = '🔇';
      soundLabel.textContent = 'AUDIO: MUTED';
      soundBtn.style.borderColor = '#ff4d6d';
    } else {
      audio.initContext();
      audio.playUiClick();
      soundIcon.textContent = '🔊';
      soundLabel.textContent = 'AUDIO: ON';
      soundBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    }
  });

  document.getElementById('spin-main-btn').addEventListener('click', () => {
    audio.playUiClick();
    spinMachine();
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !state.isSpinning) {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      e.preventDefault();
      spinMachine();
    }
  });
}

/* =========================================================================
   15. APPLICATION STARTUP
   ========================================================================= */
function initializeGame() {
  loadSettings();
  setupBezelLEDs();
  populateInitialReels();
  setupMechanicalLever();
  setupConfigModal();
  setupControls();
  updateUI();
  setMarqueeText("SYSTEM READY // EQUAL PROBABILITY ACTIVE");
}

window.addEventListener('DOMContentLoaded', initializeGame);