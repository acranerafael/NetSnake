const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const BASE_LATENCY_MS = Number(process.env.BASE_LATENCY_MS || 60);

function simulateNetwork(mode) {
  const rng = Math.random();
  let jitterRangeMs = 40;
  let lossRate = 0.03; // 3%

  switch ((mode || 'ping').toLowerCase()) {
    case 'ping':
      jitterRangeMs = 15;
      lossRate = 0.01;
      break;
    case 'jitter':
      jitterRangeMs = 140;
      lossRate = 0.08;
      break;
    default:
      jitterRangeMs = 40;
      lossRate = 0.03;
      break;
  }

  const jitterMs = Math.floor(rng * jitterRangeMs) * (rng < 0.5 ? -1 : 1);
  const delayMs = Math.max(0, BASE_LATENCY_MS + jitterMs);
  const lost = Math.random() < lossRate;

  return { delayMs, jitterMs, lost, lossRate };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.post('/api/move', (req, res) => {
  const { direction, mode = 'ping', seq } = req.body || {};
  const startedAt = Date.now();
  const sim = simulateNetwork(mode);

  setTimeout(() => {
    const serverTs = Date.now();
    const payload = {
      ok: !sim.lost,
      direction,
      mode,
      seq,
      serverTimestamp: serverTs,
      serverDelayMs: serverTs - startedAt,
      simulated: {
        jitterMs: sim.jitterMs,
        lossRate: sim.lossRate,
        lost: sim.lost,
      },
    };
    // Even when simulating loss, we respond with ok:false so the client can apply effects.
    res.json(payload);
  }, sim.delayMs);
});

app.listen(PORT, () => {
  console.log(`NetSnake server running at http://localhost:${PORT}`);
});