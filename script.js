// second-law-script.js (corrected)

/* ======= Elements ======= */
const cartContainer = document.getElementById('cartContainer');
const cart = document.getElementById('cart');
const massSlider = document.getElementById('massSlider');
const forceSlider = document.getElementById('forceSlider');
const massValue = document.getElementById('massValue');
const forceValue = document.getElementById('forceValue');
const massDisplay = document.getElementById('massDisplay');
const timerDisplay = document.getElementById('timerDisplay');
const velocityDisplay = document.getElementById('velocityDisplay');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const forceArrow = document.getElementById('forceArrow');
const resultsTable = document.getElementById('resultsTable');
const clearResultsBtn = document.getElementById('clearResultsBtn');

/* ======= Constants (will initialise some after DOM sizes known) ======= */
const TRACK_LENGTH = 1.0; // meters
const SIMULATION_SPEED = 1; // 1 = real time
const RANDOMNESS_FACTOR = 0.05; // 5% randomness

let TRACK_ELEMENT = null;
let TRACK_PIXEL_LENGTH = 0;
let PIXELS_PER_METER = 0;

/* ======= Variables ======= */
let mass = 2.0; // kg
let force = 0.0; // N
let experimentRunning = false;
let experimentCount = 0;
let startTime = 0;
let currentTime = 0;
let currentPosition = 0; // meters
let currentVelocity = 0; // m/s
let animationId = null;
let displayedTime = 0;
let displayedVelocity = 0;

/* ======= Utilities ======= */
function safeQueryTrack() {
  TRACK_ELEMENT = document.querySelector('.track');
  if (!TRACK_ELEMENT) return;
  // compute pixel usable length: subtract some padding and cart width
  const trackWidth = TRACK_ELEMENT.clientWidth || 0;
  const finishLineWidth = 8; // approximate finish line width in px used earlier
  const cartWidth = 80; // width of your cart svg
  TRACK_PIXEL_LENGTH = Math.max(0, trackWidth - finishLineWidth - cartWidth);
  PIXELS_PER_METER = TRACK_PIXEL_LENGTH / TRACK_LENGTH;
}

/* call on load and resize so metrics remain accurate */
window.addEventListener('resize', () => {
  safeQueryTrack();
});

/* Nice formatter */
function fmt(n, dp = 3) {
  if (isNaN(n) || n === null) return '-';
  return Number(n).toFixed(dp);
}

/* Add randomness only to displayed values (keeps physics deterministic) */
function addRandomness(value) {
  const randomFactor = 1 + (Math.random() * 2 - 1) * RANDOMNESS_FACTOR;
  return value * randomFactor;
}

/* ======= Init (wait until DOM content loaded to compute sizes) ======= */
document.addEventListener('DOMContentLoaded', () => {
  safeQueryTrack();
  // wire initial UI / listeners
  updateMassDisplay();
  updateForceDisplay();
  updateForceArrow();
});

/* ======= Event listeners ======= */
massSlider.addEventListener('input', function () {
  mass = parseFloat(this.value);
  updateMassDisplay();
});

forceSlider.addEventListener('input', function () {
  force = parseFloat(this.value);
  updateForceDisplay();
  updateForceArrow();
});

startBtn.addEventListener('click', function () {
  if (!experimentRunning) startExperiment();
});

resetBtn.addEventListener('click', resetExperiment);

clearResultsBtn.addEventListener('click', function () {
  resultsTable.innerHTML = '';
  experimentCount = 0;
});

/* ======= UI Updaters ======= */
function updateMassDisplay() {
  massValue.textContent = `${mass.toFixed(1)} kg`;
  massDisplay.textContent = `${mass.toFixed(1)} kg`;

  // subtle visual scaling for cart
  const scale = 1 + (mass - 1) * 0.1;
  // apply scale and small vertical translate to keep wheels visually aligned
  cart.style.transform = `scale(${scale}) translateY(${(1 - scale) * 8}px)`;

  // Adjust container bottom so scaled cart doesn't overflow
  // Note: cartContainer had inline bottom:104px originally
  cartContainer.style.bottom = `${104 - (scale - 1) * 8}px`;
}

function updateForceDisplay() {
  forceValue.textContent = `${force.toFixed(1)} N`;
}

function updateForceArrow() {
  // select the line element specifically (forceArrow contains the head and the line)
  if (!forceArrow) return;
  const line = forceArrow.querySelector('.force-arrow-line');
  if (!line) return;
  // scale arrow width using a sensible mapping; clamp so it never goes negative
  const arrowWidth = Math.max(6, 10 + force * 30);
  line.style.width = `${arrowWidth}px`;
}

/* ======= Simulation control ======= */
function startExperiment() {
  // ensure track sizes are correct at start
  safeQueryTrack();

  experimentRunning = true;
  // disable start button and sliders
  startBtn.disabled = true;
  startBtn.classList.add('disabled');
  massSlider.disabled = true;
  forceSlider.disabled = true;

  // Reset kinematic state
  currentPosition = 0;
  currentVelocity = 0;
  displayedTime = 0;
  displayedVelocity = 0;
  cartContainer.style.transform = `translateX(0px)`;
  cart.classList.remove('cart-stop');

  // start timing
  startTime = performance.now();
  currentTime = 0;

  // run loop
  animationId = requestAnimationFrame(runSimulation);
}

function runSimulation(now) {
  // requestAnimationFrame passes a timestamp 'now'
  if (!startTime) startTime = now || performance.now();
  const frameNow = now || performance.now();
  const deltaTime = ((frameNow - startTime) / 1000) * SIMULATION_SPEED;
  startTime = frameNow;

  // update simulation clock (physics uses currentTime)
  currentTime += deltaTime;

  // compute acceleration from applied force and mass (F = m a)
  const acceleration = (mass > 0) ? (force / mass) : 0;

  // update velocity and position
  currentVelocity += acceleration * deltaTime;
  currentPosition += currentVelocity * deltaTime;

  // update displayed (with some randomness)
  displayedTime = addRandomness(currentTime);
  displayedVelocity = addRandomness(currentVelocity);
  timerDisplay.textContent = `Time: ${displayedTime.toFixed(2)} s`;
  velocityDisplay.textContent = `Velocity: ${displayedVelocity.toFixed(2)} m/s`;

  // convert to pixels and move cart
  // if PIXELS_PER_METER is zero (small track), attempt to recalc
  if (!PIXELS_PER_METER) safeQueryTrack();
  const pixelPosition = Math.min(TRACK_PIXEL_LENGTH, currentPosition * (PIXELS_PER_METER || 1));
  cartContainer.style.transform = `translateX(${pixelPosition}px)`;

  // finish condition
  if (currentPosition >= TRACK_LENGTH) {
    // clamp to finish
    currentPosition = TRACK_LENGTH;
    cartContainer.style.transform = `translateX(${TRACK_PIXEL_LENGTH}px)`;
    cart.classList.add('cart-stop');

    // stop animation and finish
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    finishExperiment();
    return;
  }

  // continue animating
  animationId = requestAnimationFrame(runSimulation);
}

function finishExperiment() {
  experimentRunning = false;
  experimentCount++;

  // Add result row (we use displayed values so students see the noisy measurement)
  addResultToTable();

  // re-enable controls
  startBtn.disabled = false;
  startBtn.classList.remove('disabled');
  massSlider.disabled = false;
  forceSlider.disabled = false;
}

/* ======= Reset ======= */
function resetExperiment() {
  if (experimentRunning) {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    experimentRunning = false;
  }

  // re-enable controls
  startBtn.disabled = false;
  startBtn.classList.remove('disabled');
  massSlider.disabled = false;
  forceSlider.disabled = false;

  // reset state
  currentPosition = 0;
  currentVelocity = 0;
  currentTime = 0;
  displayedTime = 0;
  displayedVelocity = 0;
  cartContainer.style.transform = `translateX(0px)`;
  cart.classList.remove('cart-stop');
  timerDisplay.textContent = `Time: 0.00 s`;
  velocityDisplay.textContent = `Velocity: 0.00 m/s`;
}

/* ======= Table row creation ======= */
function addResultToTable() {
  const row = document.createElement('tr');

  // Use the order matching the table header:
  // # | Mass | Force | Time (s) | Final Velocity (m/s) | Your Calculated Acceleration | Actions
  row.innerHTML = `
    <td>${experimentCount}</td>
    <td>${mass.toFixed(1)}</td>
    <td>${force.toFixed(1)}</td>
    <td>${displayedTime.toFixed(2)}</td>
    <td>${displayedVelocity.toFixed(2)}</td>
    <td>
      <div style="display:flex;align-items:center;gap:8px">
        <input type="number" step="0.01" placeholder="m/s²" class="acc-input" style="width:110px;padding:6px 8px;border-radius:6px;border:1px solid rgba(0,0,0,0.12);text-align:center;">
        <button class="check-btn" type="button" style="padding:6px 10px;border-radius:6px;border:0;background:#1ABC9C;color:#fff;font-weight:700;cursor:pointer;">Check</button>
        <span class="result-feedback" aria-live="polite" style="margin-left:8px;font-weight:700;min-width:110px"></span>
      </div>
    </td>
    <td>
      <button class="delete-btn" title="Delete row" style="background:none;border:0;cursor:pointer;color:var(--coral)">
        ✖
      </button>
    </td>
  `;

  // store reference values on the row for checking later
  // theoretical acceleration = F / m
  const theoretical = (mass > 0) ? (force / mass) : NaN;
  // measured acceleration (we can compute from displayedVelocity and displayedTime, but use displayed values used in UI)
  const measured = (!isNaN(displayedVelocity) && displayedTime > 0) ? (displayedVelocity / displayedTime) : NaN;
  row.dataset.theoretical = String(theoretical);
  row.dataset.measured = String(measured);

  // attach listeners
  const deleteBtn = row.querySelector('.delete-btn');
  const checkBtn = row.querySelector('.check-btn');
  const input = row.querySelector('.acc-input');
  const feedback = row.querySelector('.result-feedback');

  deleteBtn.addEventListener('click', () => {
    row.remove();
    // renumber rows
    Array.from(resultsTable.children).forEach((r, i) => { r.children[0].textContent = i + 1; });
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      checkBtn.click();
    }
  });

  checkBtn.addEventListener('click', () => {
    const raw = input.value;
    const userVal = Number(raw);
    feedback.className = 'result-feedback'; // reset classes

    if (raw === '' || isNaN(userVal)) {
      feedback.textContent = 'Enter a number';
      feedback.style.color = 'var(--coral)';
      return;
    }

    // priority: measured (if available) else theoretical
    const measuredVal = parseFloat(row.dataset.measured);
    const theoreticalVal = parseFloat(row.dataset.theoretical);
    let trueVal = !isNaN(measuredVal) ? measuredVal : theoreticalVal;

    if (isNaN(trueVal)) {
      feedback.textContent = 'No reference available';
      feedback.style.color = 'var(--coral)';
      return;
    }

    const TOLERANCE = 0.05; // 5%
    const diff = Math.abs(userVal - trueVal);
    const pass = (diff <= Math.abs(trueVal) * TOLERANCE) || (diff <= 1e-3);

    if (pass) {
      feedback.textContent = `Correct ✓ (a=${fmt(trueVal,3)} m/s²)`;
      feedback.style.color = '#1b9a56';
    } else {
      feedback.innerHTML = `Not quite ✗ <div style="font-size:12px;color:rgba(0,0,0,0.6)">Expected ≈ ${fmt(trueVal,3)} m/s²</div>`;
      feedback.style.color = 'var(--coral)';
    }
  });

  resultsTable.appendChild(row);

  // brief highlight (pure CSS classes removed because Tailwind not in use)
  row.style.background = 'rgba(26,188,156,0.06)';
  setTimeout(() => { row.style.background = ''; }, 1200);
}

/* ======= Exported helpers for other scripts ======= */
/* Allows your simulation to push rows directly if you prefer a measured/theoretical check */
window.addResultRow = function ({ mass: m, force: f, time: t, velocity: v, distance = TRACK_LENGTH } = {}) {
  // set local values so UI matches passed values if you want
  // but don't mutate global mass/force unless you intend to:
  const row = document.createElement('tr');

  const theoretical = (Number(m) > 0) ? (Number(f) / Number(m)) : NaN;
  const measured = (!isNaN(Number(v)) && Number(t) > 0) ? (Number(v) / Number(t)) : NaN;

  row.innerHTML = `
    <td>${resultsTable.children.length + 1}</td>
    <td>${fmt(m,2)}</td>
    <td>${fmt(f,2)}</td>
    <td>${fmt(t,3)}</td>
    <td>${fmt(v,3)}</td>
    <td>
      <div style="display:flex;align-items:center;gap:8px">
        <input class="acc-input" type="number" step="0.001" placeholder="m/s²" aria-label="Your acceleration" style="width:110px;padding:6px 8px;border-radius:6px;border:1px solid rgba(0,0,0,0.12);text-align:center;">
        <button class="check-btn" type="button" style="padding:6px 10px;border-radius:6px;border:0;background:#1ABC9C;color:#fff;font-weight:700;cursor:pointer;">Check</button>
        <span class="result-feedback" aria-live="polite" style="margin-left:8px;font-weight:700;min-width:110px"></span>
      </div>
    </td>
    <td><button class="delete-row-btn" title="Delete row" style="background:none;border:0;cursor:pointer;color:var(--coral)">✖</button></td>
  `;

  row.dataset.theoretical = String(theoretical);
  row.dataset.measured = String(measured);

  resultsTable.appendChild(row);

  // wire up listeners like addResultToTable does (to avoid duplication you could refactor to a helper)
  const deleteBtn = row.querySelector('.delete-row-btn');
  const checkBtn = row.querySelector('.check-btn');
  const input = row.querySelector('.acc-input');
  const feedback = row.querySelector('.result-feedback');

  deleteBtn.addEventListener('click', () => {
    row.remove();
    Array.from(resultsTable.children).forEach((r, i) => { r.children[0].textContent = i + 1; });
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      checkBtn.click();
    }
  });

  checkBtn.addEventListener('click', () => {
    const raw = input.value;
    const userVal = Number(raw);
    if (raw === '' || isNaN(userVal)) {
      feedback.textContent = 'Enter a number';
      feedback.style.color = 'var(--coral)';
      return;
    }
    const measuredVal = parseFloat(row.dataset.measured);
    const theoreticalVal = parseFloat(row.dataset.theoretical);
    let trueVal = !isNaN(measuredVal) ? measuredVal : theoreticalVal;
    if (isNaN(trueVal)) {
      feedback.textContent = 'No reference available';
      feedback.style.color = 'var(--coral)';
      return;
    }
    const TOL = 0.05;
    const diff = Math.abs(userVal - trueVal);
    const pass = (diff <= Math.abs(trueVal) * TOL) || diff <= 1e-3;
    if (pass) {
      feedback.textContent = `Correct ✓ (a=${fmt(trueVal,3)} m/s²)`;
      feedback.style.color = '#1b9a56';
    } else {
      feedback.innerHTML = `Not quite ✗ <div style="font-size:12px;color:rgba(0,0,0,0.6)">Expected ≈ ${fmt(trueVal,3)} m/s²</div>`;
      feedback.style.color = 'var(--coral)';
    }
  });

  row.style.background = 'rgba(26,188,156,0.06)';
  setTimeout(() => { row.style.background = ''; }, 1200);

  return row;
};
