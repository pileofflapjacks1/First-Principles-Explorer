import { Router, type IRouter } from "express";
import { getXaiHealth, resetXaiCircuit, simulateXaiFailure } from "../lib/xai-text";

const router: IRouter = Router();

/**
 * Lightweight debug endpoint for inspecting + demoing the xAI circuit breaker.
 *
 * - Browser: Serves a rich interactive dashboard (no build step, self-contained).
 * - API / curl: Returns clean JSON.
 *
 * POST helpers let you easily drive the breaker through its states for demos.
 */
router.get("/ai-circuit", (req, res) => {
  const health = getXaiHealth();

  // Static config values (kept in sync with the breaker implementation)
  const config = {
    rateLimitThreshold: 3,
    otherTransientThreshold: 5,
    cooldownMs: 60_000,
    decayMs: 5 * 60_000,
    description: "RateLimit failures trigger protection faster than other transient errors.",
  };

  // Serve a rich interactive debug UI when the client prefers HTML (e.g. opening in browser)
  // This makes demoing the resilience features trivial — no curl or Postman required.
  if (req.accepts("html")) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>xAI Circuit Breaker • Debug</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&amp;family=Space+Grotesk:wght@500;600&amp;display=swap');
    
    :root {
      --bg: #0a0f1a;
    }
    
    body {
      font-family: 'Inter', system_ui, sans-serif;
    }
    
    .font-display {
      font-family: 'Space Grotesk', 'Inter', system_ui, sans-serif;
      font-weight: 600;
    }

    .status-pill {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .metric-bar {
      transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s ease;
    }

    .circuit-card {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .log-entry {
      animation: slideIn 0.2s ease forwards;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .health-healthy { color: #22c55e; }
    .health-degraded { color: #eab308; }
    .health-open { color: #ef4444; }

    .section-title {
      font-size: 0.75rem;
      letter-spacing: 0.5px;
      font-weight: 600;
      text-transform: uppercase;
    }
  </style>
</head>
<body class="bg-[#0a0f1a] text-slate-200">
  <div class="max-w-4xl mx-auto p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-x-3">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <i class="fa-solid fa-shield-halved text-white text-2xl"></i>
        </div>
        <div>
          <h1 class="font-display text-3xl font-semibold tracking-tighter">xAI Circuit Breaker</h1>
          <p class="text-slate-400 text-sm -mt-1">Resilience Debug Dashboard</p>
        </div>
      </div>
      
      <div class="flex items-center gap-x-2 text-xs">
        <div class="px-3 py-1.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-x-2">
          <div class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
          <span class="text-emerald-400 font-medium">Live</span>
        </div>
        <button onclick="refreshState()" 
                class="px-3 py-1.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs flex items-center gap-x-1.5 transition-colors">
          <i class="fa-solid fa-sync fa-sm"></i>
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Status -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-3">
        <div class="section-title text-slate-400">Current Status</div>
        <div id="last-updated" class="text-[10px] text-slate-500 font-mono"></div>
      </div>
      
      <div id="status-card" 
           class="circuit-card px-6 py-5 rounded-3xl border flex items-center justify-between bg-white/5 border-white/10">
        <div class="flex items-center gap-x-4">
          <div id="status-dot" 
               class="w-5 h-5 rounded-2xl flex-shrink-0 shadow-inner"></div>
          <div>
            <div id="status-text" class="font-display text-4xl font-semibold tracking-tighter"></div>
            <div id="status-sub" class="text-sm text-slate-400 mt-0.5"></div>
          </div>
        </div>
        
        <div id="cooldown-info" class="hidden text-right">
          <div class="text-xs text-red-400/70">PROTECTION MODE</div>
          <div id="cooldown-timer" class="font-mono text-3xl font-semibold text-red-400 tabular-nums"></div>
          <div class="text-[10px] text-red-400/60 -mt-1">until reset or cooldown</div>
        </div>
      </div>
    </div>

    <!-- Metrics -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <!-- Rate Limit -->
      <div class="circuit-card bg-white/5 border border-white/10 rounded-3xl p-5">
        <div class="flex justify-between items-start mb-3">
          <div>
            <div class="flex items-center gap-x-2">
              <i class="fa-solid fa-bolt text-red-400"></i>
              <span class="font-semibold text-sm">Rate Limit Failures</span>
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5">Threshold: <span id="rl-threshold">3</span></div>
          </div>
          <div id="rl-count" class="font-display text-5xl font-semibold tabular-nums text-red-400">0</div>
        </div>
        
        <div class="h-2.5 bg-white/10 rounded-full overflow-hidden">
          <div id="rl-bar" 
               class="h-2.5 bg-gradient-to-r from-red-500 to-red-400 metric-bar rounded-full"
               style="width: 0%"></div>
        </div>
        <div class="flex justify-between text-[10px] mt-1 text-slate-400">
          <div>0</div>
          <div id="rl-max">3</div>
        </div>
      </div>

      <!-- Other Transients -->
      <div class="circuit-card bg-white/5 border border-white/10 rounded-3xl p-5">
        <div class="flex justify-between items-start mb-3">
          <div>
            <div class="flex items-center gap-x-2">
              <i class="fa-solid fa-exclamation-triangle text-amber-400"></i>
              <span class="font-semibold text-sm">Other Transients</span>
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5">Threshold: <span id="ot-threshold">5</span></div>
          </div>
          <div id="ot-count" class="font-display text-5xl font-semibold tabular-nums text-amber-400">0</div>
        </div>
        
        <div class="h-2.5 bg-white/10 rounded-full overflow-hidden">
          <div id="ot-bar" 
               class="h-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 metric-bar rounded-full"
               style="width: 0%"></div>
        </div>
        <div class="flex justify-between text-[10px] mt-1 text-slate-400">
          <div>0</div>
          <div id="ot-max">5</div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="mb-8">
      <div class="section-title text-slate-400 mb-3">Demo Controls</div>
      
      <div class="flex flex-wrap gap-3">
        <button onclick="performAction('reset')"
                class="flex-1 md:flex-none px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-all font-medium text-sm flex items-center justify-center gap-x-2 shadow-inner">
          <i class="fa-solid fa-undo"></i>
          <span>Reset Circuit</span>
        </button>
        
        <button onclick="performAction('simulate', 'RateLimit')"
                class="flex-1 md:flex-none px-5 py-3 rounded-2xl bg-red-600/90 hover:bg-red-600 active:bg-red-700 transition-all font-medium text-sm flex items-center justify-center gap-x-2 border border-red-500/30">
          <i class="fa-solid fa-bolt"></i>
          <span>Simulate Rate Limit</span>
        </button>
        
        <button onclick="performAction('simulate', 'Other')"
                class="flex-1 md:flex-none px-5 py-3 rounded-2xl bg-amber-600/90 hover:bg-amber-600 active:bg-amber-700 transition-all font-medium text-sm flex items-center justify-center gap-x-2 border border-amber-500/30">
          <i class="fa-solid fa-exclamation-triangle"></i>
          <span>Simulate Other Transient</span>
        </button>
      </div>
      
      <div class="text-[10px] text-center text-slate-400 mt-2.5">
        RateLimit failures open the circuit faster (threshold 3 vs 5)
      </div>
    </div>

    <!-- Live Log -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <div class="section-title text-slate-400">Action Log</div>
        <button onclick="clearLog()" class="text-xs text-slate-400 hover:text-slate-200">Clear</button>
      </div>
      
      <div id="log" 
           class="font-mono text-xs bg-black/40 border border-white/10 rounded-2xl p-3 h-40 overflow-auto space-y-1 text-slate-300">
        <div class="text-slate-500 italic">Actions will appear here...</div>
      </div>
    </div>

    <div class="mt-8 text-center">
      <div class="text-[10px] text-slate-400">
        This is a development / demo tool. 
        <a href="/api/healthz" class="underline hover:no-underline">View public health</a> • 
        <a href="/api/me" class="underline hover:no-underline" target="_blank">Your account status</a>
      </div>
      <div class="text-[10px] text-slate-500 mt-1">
        The breaker protects xAI calls with retries, de-weighting, and fast-fail when open.
      </div>
    </div>
  </div>

  <script>
    const API_BASE = '/api/debug/ai-circuit';
    let logEl;
    let pollInterval = null;

    function log(message, type = 'info') {
      if (!logEl) logEl = document.getElementById('log');
      
      const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
      const colors = {
        info: 'text-slate-300',
        success: 'text-emerald-400',
        warn: 'text-amber-400',
        error: 'text-red-400'
      };
      
      const entry = document.createElement('div');
      entry.className = \`log-entry flex gap-2 \${colors[type] || colors.info}\`;
      entry.innerHTML = \`<span class="opacity-50 tabular-nums">[\${time}]</span> <span>\${message}</span>\`;
      
      // Remove placeholder if present
      if (logEl.children.length === 1 && logEl.children[0].classList.contains('italic')) {
        logEl.innerHTML = '';
      }
      
      logEl.appendChild(entry);
      logEl.scrollTop = logEl.scrollHeight;
      
      // Keep log reasonable size
      while (logEl.children.length > 12) {
        logEl.removeChild(logEl.children[0]);
      }
    }

    function clearLog() {
      if (logEl) {
        logEl.innerHTML = '<div class="text-slate-500 italic">Log cleared.</div>';
      }
    }

    async function fetchState() {
      try {
        const res = await fetch(API_BASE, { 
          headers: { 'Accept': 'application/json' } 
        });
        if (!res.ok) throw new Error('Failed to fetch');
        return await res.json();
      } catch (e) {
        console.error(e);
        return null;
      }
    }

    function updateUI(data) {
      if (!data) return;
      
      const { health, config } = data;
      
      // Status
      const statusText = document.getElementById('status-text');
      const statusSub = document.getElementById('status-sub');
      const statusDot = document.getElementById('status-dot');
      const statusCard = document.getElementById('status-card');
      const cooldownInfo = document.getElementById('cooldown-info');
      const cooldownTimer = document.getElementById('cooldown-timer');
      
      statusText.textContent = health.status.toUpperCase();
      
      let dotClass = '';
      let cardClass = 'border-white/10 bg-white/5';
      
      if (health.status === 'healthy') {
        statusSub.textContent = 'All systems normal';
        dotClass = 'bg-emerald-400 shadow-[0_0_8px_rgb(52,211,153)]';
        cardClass = 'border-emerald-500/30 bg-emerald-900/10';
      } else if (health.status === 'degraded') {
        statusSub.textContent = 'Elevated transient failures';
        dotClass = 'bg-yellow-400 shadow-[0_0_8px_rgb(250,204,21)]';
        cardClass = 'border-yellow-500/30 bg-yellow-900/10';
      } else {
        statusSub.textContent = 'Fast-fail protection active';
        dotClass = 'bg-red-400 shadow-[0_0_8px_rgb(248,113,113)]';
        cardClass = 'border-red-500/30 bg-red-900/10';
      }
      
      statusDot.className = \`w-5 h-5 rounded-2xl flex-shrink-0 \${dotClass}\`;
      statusCard.className = \`circuit-card px-6 py-5 rounded-3xl border flex items-center justify-between \${cardClass}\`;
      
      // Cooldown
      if (health.status === 'open' && health.cooldownRemainingMs > 0) {
        cooldownInfo.classList.remove('hidden');
        const secs = Math.ceil(health.cooldownRemainingMs / 1000);
        cooldownTimer.textContent = secs + 's';
        
        // Simple countdown
        if (window.cooldownInterval) clearInterval(window.cooldownInterval);
        window.cooldownInterval = setInterval(() => {
          const current = parseInt(cooldownTimer.textContent);
          if (current > 1) {
            cooldownTimer.textContent = (current - 1) + 's';
          } else {
            clearInterval(window.cooldownInterval);
            refreshState();
          }
        }, 1000);
      } else {
        cooldownInfo.classList.add('hidden');
        if (window.cooldownInterval) clearInterval(window.cooldownInterval);
      }
      
      // Counters + bars
      const rlCount = document.getElementById('rl-count');
      const rlBar = document.getElementById('rl-bar');
      const otCount = document.getElementById('ot-count');
      const otBar = document.getElementById('ot-bar');
      
      rlCount.textContent = health.rateLimitCount ?? 0;
      otCount.textContent = health.otherTransientCount ?? 0;
      
      const rlPct = Math.min(((health.rateLimitCount || 0) / (config.rateLimitThreshold || 3)) * 100, 100);
      const otPct = Math.min(((health.otherTransientCount || 0) / (config.otherTransientThreshold || 5)) * 100, 100);
      
      rlBar.style.width = rlPct + '%';
      otBar.style.width = otPct + '%';
      
      // Color the bars based on proximity to threshold
      rlBar.className = 'h-2.5 metric-bar rounded-full ' + 
        (health.rateLimitCount >= config.rateLimitThreshold ? 'bg-red-500' : 'bg-gradient-to-r from-red-500 to-red-400');
      
      otBar.className = 'h-2.5 metric-bar rounded-full ' + 
        (health.otherTransientCount >= config.otherTransientThreshold ? 'bg-amber-500' : 'bg-gradient-to-r from-amber-500 to-yellow-400');
      
      // Update timestamp
      document.getElementById('last-updated').textContent = 'Updated ' + new Date().toLocaleTimeString();
    }

    async function refreshState() {
      const data = await fetchState();
      if (data) {
        updateUI(data);
      }
    }

    async function performAction(action, type) {
      const buttons = document.querySelectorAll('button');
      buttons.forEach(b => b.disabled = true);
      
      try {
        let url = API_BASE;
        let options = { method: 'POST' };
        
        if (action === 'reset') {
          url += '/reset';
          log('Sending reset command...', 'info');
        } else if (action === 'simulate') {
          url += '/simulate-failure';
          options.headers = { 'Content-Type': 'application/json' };
          options.body = JSON.stringify({ type });
          log(\`Simulating \${type} failure...\`, 'warn');
        }
        
        const res = await fetch(url, options);
        const result = await res.json();
        
        if (result.message) {
          log(result.message, action === 'reset' ? 'success' : 'warn');
        }
        
        // Refresh state immediately
        const fresh = await fetchState();
        if (fresh) updateUI(fresh);
        
      } catch (err) {
        log('Action failed: ' + err.message, 'error');
        console.error(err);
      } finally {
        buttons.forEach(b => b.disabled = false);
      }
    }

    function startPolling() {
      if (pollInterval) clearInterval(pollInterval);
      
      // Poll every 1.5 seconds for nice live feel during demos
      pollInterval = setInterval(async () => {
        const data = await fetchState();
        if (data) updateUI(data);
      }, 1500);
    }

    async function init() {
      logEl = document.getElementById('log');
      
      // Initial load
      const data = await fetchState();
      if (data) {
        updateUI(data);
        log('Connected to circuit breaker state.', 'success');
      } else {
        log('Failed to load initial state', 'error');
      }
      
      // Start live updates
      startPolling();
      
      // Keyboard shortcuts for demoing
      document.addEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          performAction('reset');
        }
        if (e.key === '1') {
          e.preventDefault();
          performAction('simulate', 'RateLimit');
        }
        if (e.key === '2') {
          e.preventDefault();
          performAction('simulate', 'Other');
        }
      });
      
      // Welcome log
      setTimeout(() => {
        if (logEl.children.length < 3) {
          log('Tip: Press R to reset, 1 for RateLimit, 2 for Other', 'info');
        }
      }, 4200);
    }

    // Boot
    window.onload = init;
    
    // Expose for console debugging during demos
    window.ZwyppyDebug = { refreshState, performAction };
  </script>
</body>
</html>`;
    
    return res.send(html);
  }

  // Default: return JSON for API clients, curl, etc.
  res.json({
    timestamp: new Date().toISOString(),
    health,
    config,
    notes: [
      "Use this to observe the breaker during load testing or simulated failures.",
      "When status is 'open', new xAI calls will fast-fail with CircuitOpen errors.",
      "De-weighting is applied automatically in 'degraded' state.",
      "Both /healthz and /me also expose ai status for production use.",
      "For an interactive demo UI, open this URL in a browser.",
    ],
  });
});

/**
 * POST /api/debug/ai-circuit/reset
 * Completely resets the circuit breaker to a clean healthy state.
 * Extremely useful for repeated demoing. Also available as a big button in the browser UI.
 */
router.post("/ai-circuit/reset", (_req, res) => {
  const health = resetXaiCircuit();
  res.json({
    message: "Circuit breaker has been reset to healthy state.",
    health,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/debug/ai-circuit/simulate-failure
 *
 * Body (optional):
 * {
 *   "type": "RateLimit" | "Other"
 * }
 *
 * Simulates a transient failure. The browser UI has dedicated buttons for this.
 * Calling repeatedly (especially RateLimit) drives the breaker into protection mode.
 */
router.post("/ai-circuit/simulate-failure", (req, res) => {
  const type = (req.body?.type === "RateLimit") ? "RateLimit" : "Other";

  const health = simulateXaiFailure(type);

  res.json({
    message: `Simulated a ${type} failure.`,
    health,
    timestamp: new Date().toISOString(),
    tip: "Call this endpoint multiple times (especially with type=RateLimit) to trigger protection mode.",
  });
});

export default router;
