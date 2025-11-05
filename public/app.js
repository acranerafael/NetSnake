(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const startBtn = document.getElementById('startBtn');
  const playerNameInput = document.getElementById('playerName');
  const modeSelect = document.getElementById('modeSelect');
  const latencyBadge = document.getElementById('latencyBadge');
  const latencyBar = document.getElementById('latencyBar');
  const latencyNowEl = document.getElementById('latencyNow');
  const latencyAvgEl = document.getElementById('latencyAvg');
  const jitterEl = document.getElementById('jitterVal');
  const lossEl = document.getElementById('lossPct');
  const leaderboardEl = document.getElementById('leaderboard');
  const clearLbBtn = document.getElementById('clearLb');
  const btnUp = document.getElementById('btnUp');
  const btnDown = document.getElementById('btnDown');
  const btnLeft = document.getElementById('btnLeft');
  const btnRight = document.getElementById('btnRight');

  // Game state
  const gridSize = 24; // tiles per side
  let tile; // computed pixel size per tile
  let mode = 'ping';
  let playerName = 'Jogador';
  let running = false;
  let pendingNetwork = false;
  let seq = 0;
  let score = 0;
  let desiredDir = 'right';
  let autoTimer = null;
  const STEP_MS = 260; // intervalo de passo automático

  const state = {
    snake: [],
    dir: { x: 1, y: 0 },
    food: { x: 10, y: 10 },
    ghosts: [], // ghost pieces when jitter/loss
    latencies: [],
    losses: 0,
    peaks: [],
    lastLatency: null,
  };

  function resizeCanvas() {
    // Keep canvas square, responsive within card body
    const containerWidth = canvas.parentElement.clientWidth;
    const size = Math.min(containerWidth, 540);
    canvas.width = size;
    canvas.height = size;
    tile = Math.floor(size / gridSize);
    draw();
  }

  window.addEventListener('resize', resizeCanvas);

  function initGame() {
    score = 0;
    seq = 0;
    state.snake = [ { x: 5, y: 12 }, { x: 4, y: 12 }, { x: 3, y: 12 } ];
    state.dir = { x: 1, y: 0 };
    desiredDir = 'right';
    spawnFood();
    state.ghosts = [];
    state.latencies = [];
    state.losses = 0;
    state.peaks = [];
    state.lastLatency = null;
    updateStats();
    draw();
  }

  function spawnFood() {
    state.food.x = Math.floor(Math.random() * gridSize);
    state.food.y = Math.floor(Math.random() * gridSize);
  }

  function draw() {
    ctx.fillStyle = '#0b0d12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid subtle
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * tile, 0);
      ctx.lineTo(i * tile, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * tile);
      ctx.lineTo(canvas.width, i * tile);
      ctx.stroke();
    }

    // Food
    ctx.fillStyle = '#ffc107';
    ctx.fillRect(state.food.x * tile, state.food.y * tile, tile, tile);

    // Ghosts
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    state.ghosts.forEach(g => ctx.fillRect(g.x * tile, g.y * tile, tile, tile));

    // Snake
    state.snake.forEach((part, idx) => {
      ctx.fillStyle = idx === 0 ? '#0d6efd' : '#198754';
      ctx.fillRect(part.x * tile, part.y * tile, tile, tile);
    });

    // Latency near head
    if (state.lastLatency != null) {
      const head = state.snake[0];
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.max(12, tile - 4)}px monospace`;
      ctx.fillText(`${state.lastLatency}ms`, head.x * tile + 4, head.y * tile + tile - 4);
    }
  }

  function updateStats() {
    const n = state.latencies.length;
    const avg = n ? Math.round(state.latencies.reduce((a,b) => a+b, 0) / n) : null;
    const jitter = n > 1 ? Math.round(stddev(state.latencies)) : null;
    const lossPct = Math.round((state.losses / (state.losses + n || 1)) * 100);

    latencyNowEl.textContent = state.lastLatency != null ? `${state.lastLatency} ms` : '— ms';
    latencyAvgEl.textContent = avg != null ? `${avg} ms` : '— ms';
    jitterEl.textContent = jitter != null ? `${jitter} ms` : '— ms';
    lossEl.textContent = `${lossPct} %`;

    const barVal = clamp((state.lastLatency || 0) / 500, 0, 1) * 100;
    latencyBar.style.width = `${barVal}%`;
    latencyBar.style.backgroundColor = state.lastLatency == null ? '#6c757d' : (state.lastLatency < 80 ? 'var(--latency-low)' : state.lastLatency < 200 ? 'var(--latency-mid)' : 'var(--latency-high)');
  }

  function stddev(arr) {
    const n = arr.length;
    const avg = arr.reduce((a,b) => a+b, 0) / n;
    const variance = arr.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / n;
    return Math.sqrt(variance);
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function gameOver(reason = 'collision') {
    running = false;
    pendingNetwork = false;
    stopAuto();
    const avg = state.latencies.length ? Math.round(state.latencies.reduce((a,b)=>a+b,0) / state.latencies.length) : 0;
    const jitter = state.latencies.length > 1 ? Math.round(stddev(state.latencies)) : 0;
    const lossPct = Math.round((state.losses / (state.losses + state.latencies.length || 1)) * 100);

    const finalStats = document.getElementById('finalStats');
    finalStats.innerHTML = `
      <div><strong>Jogador:</strong> ${playerName}</div>
      <div><strong>Modo:</strong> ${mode}</div>
      <div><strong>Pontuação:</strong> ${score}</div>
      <div><strong>Latência Média:</strong> ${avg} ms</div>
      <div><strong>Jitter:</strong> ${jitter} ms</div>
      <div><strong>Perda:</strong> ${lossPct} %</div>
      <div class="mt-2 text-muted">Motivo: ${reason}</div>
    `;

    saveLeaderboard({ name: playerName, mode, score, avg, jitter, lossPct, ts: Date.now() });
    renderLeaderboard();
    const modal = new bootstrap.Modal(document.getElementById('gameOverModal'));
    modal.show();
  }

  function startAuto() {
    stopAuto();
    autoTimer = setInterval(() => {
      if (!running) return;
      if (!pendingNetwork) {
        requestMove(desiredDir);
      }
    }, STEP_MS);
  }

  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  function saveLeaderboard(entry) {
    const key = 'netsnake_leaderboard';
    const lb = JSON.parse(localStorage.getItem(key) || '[]');
    lb.push(entry);
    lb.sort((a,b) => b.score - a.score);
    localStorage.setItem(key, JSON.stringify(lb.slice(0, 20)));
  }

  function renderLeaderboard() {
    const key = 'netsnake_leaderboard';
    const lb = JSON.parse(localStorage.getItem(key) || '[]');
    leaderboardEl.innerHTML = '';
    lb.forEach((e, i) => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.innerHTML = `<span>${i+1}. ${e.name} <small class="text-muted">(${e.mode})</small></span><span>Pts: ${e.score} • Avg ${e.avg}ms • Jit ${e.jitter}ms • Loss ${e.lossPct}%</span>`;
      leaderboardEl.appendChild(li);
    });
  }

  clearLbBtn.addEventListener('click', () => {
    localStorage.removeItem('netsnake_leaderboard');
    renderLeaderboard();
  });

  async function requestMove(direction) {
    if (pendingNetwork) return;
    pendingNetwork = true;
    seq += 1;

    const sentAt = Date.now();

    if (mode === 'solo') {
      // Offline movement, for comparison
      applyMove(direction);
      const latency = 0;
      state.lastLatency = latency;
      state.latencies.push(latency);
      updateStats();
      pendingNetwork = false;
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    try {
      const res = await fetch('/api/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction, mode, seq }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      const rtt = Date.now() - sentAt;
      state.lastLatency = rtt;
      if (data && data.ok) {
        applyMove(direction);
        state.latencies.push(rtt);
      } else {
        // Simulated loss or failure
        state.losses += 1;
        jitterEffect();
      }
      showLatencyBadge(rtt);
      updateStats();
    } catch (err) {
      clearTimeout(timeout);
      // Timeout or network error counts as loss
      state.losses += 1;
      state.lastLatency = null;
      updateStats();
      jitterEffect(true);
    } finally {
      pendingNetwork = false;
    }
  }

  function jitterEffect(timeout = false) {
    // Effects when jitter/loss detected: add a ghost piece at head or freeze next input
    const head = { ...state.snake[0] };
    state.ghosts.push(head);
    // Flash canvas border to indicate issue
    canvas.classList.add('flash-latency');
    setTimeout(() => canvas.classList.remove('flash-latency'), 700);
    // Optional freeze a tiny bit to emulate stutter
    if (timeout) {
      pendingNetwork = true;
      setTimeout(() => { pendingNetwork = false; }, 200);
    }
  }

  function handleDirectionInput(dir) {
    desiredDir = dir;
    requestMove(dir);
  }

  function showLatencyBadge(ms) {
    latencyBadge.classList.remove('d-none');
    latencyBadge.textContent = `${ms} ms`;
    latencyBadge.style.borderColor = ms < 80 ? 'var(--latency-low)' : ms < 200 ? 'var(--latency-mid)' : 'var(--latency-high)';
    latencyBadge.style.outlineColor = latencyBadge.style.borderColor;
  }

  function applyMove(direction) {
    // Update desired direction from input
    const dirs = { up: {x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} };
    if (dirs[direction]) state.dir = dirs[direction];

    const head = { x: state.snake[0].x + state.dir.x, y: state.snake[0].y + state.dir.y };
    // wrap around edges for arcade feel
    if (head.x < 0) head.x = gridSize - 1;
    if (head.x >= gridSize) head.x = 0;
    if (head.y < 0) head.y = gridSize - 1;
    if (head.y >= gridSize) head.y = 0;

    // collision with self -> game over
    if (state.snake.some(p => p.x === head.x && p.y === head.y)) {
      draw();
      return gameOver('colisão');
    }

    state.snake.unshift(head);

    // food
    if (head.x === state.food.x && head.y === state.food.y) {
      score += 10;
      spawnFood();
      // High jitter produces extra ghost obstacles randomly
      const jitter = state.latencies.length > 1 ? stddev(state.latencies) : 0;
      if (jitter > 80 && Math.random() < 0.6) {
        state.ghosts.push({ x: Math.floor(Math.random()*gridSize), y: Math.floor(Math.random()*gridSize) });
      }
    } else {
      state.snake.pop();
    }

    draw();
  }

  document.addEventListener('keydown', (e) => {
    if (!running) return;
    const keyMap = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right'
    };
    const dir = keyMap[e.key];
    if (!dir) return;
    e.preventDefault();
    handleDirectionInput(dir);
  });

  // Botões de direção (clique/touch)
  [
    [btnUp, 'up'],
    [btnDown, 'down'],
    [btnLeft, 'left'],
    [btnRight, 'right']
  ].forEach(([btn, dir]) => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (!running) return;
      handleDirectionInput(dir);
    });
  });

  // Clique no canvas: escolhe direção relativa à cabeça
  canvas.addEventListener('click', (e) => {
    if (!running) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const head = state.snake[0];
    const hx = head.x * tile + tile/2;
    const hy = head.y * tile + tile/2;
    const dx = cx - hx;
    const dy = cy - hy;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    let dir;
    if (adx > ady) {
      dir = dx < 0 ? 'left' : 'right';
    } else {
      dir = dy < 0 ? 'up' : 'down';
    }
    handleDirectionInput(dir);
  });

  startBtn.addEventListener('click', () => {
    playerName = (playerNameInput.value || '').trim() || 'Jogador';
    mode = modeSelect.value;
    running = true;
    initGame();
    startAuto();
  });

  // Initial
  resizeCanvas();
  renderLeaderboard();
})();