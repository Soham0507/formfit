<script setup lang="ts">
import { computed, ref } from "vue";
import { analyze, backtest, renderToolImage, type AnalyzeResponse, type BacktestResponse } from "./api";

const toolListText = ref(
  "SK-1012\n12mm combo wrench\nneedle nose pliers\nflathead screwdriver 1/4\nhex key set"
);

const result = ref<AnalyzeResponse | null>(null);
const backtestResult = ref<BacktestResponse | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

interface ToolImageState {
  loading: boolean;
  url: string | null;
  error: string | null;
}
const toolImages = ref<Record<string, ToolImageState>>({});

async function runAnalyze() {
  loading.value = true;
  error.value = null;
  toolImages.value = {};
  try {
    result.value = await analyze(toolListText.value);
    const matchedToolIds = [
      ...new Set(
        result.value.matchedLines
          .map((l) => l.tool?.id)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    for (const toolId of matchedToolIds) {
      void runRenderToolImage(toolId);
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Request failed";
  } finally {
    loading.value = false;
  }
}

async function runRenderToolImage(toolId: string) {
  toolImages.value[toolId] = { loading: true, url: null, error: null };
  try {
    const url = await renderToolImage(toolId);
    toolImages.value[toolId] = { loading: false, url, error: null };
  } catch (e) {
    toolImages.value[toolId] = {
      loading: false,
      url: null,
      error: e instanceof Error ? e.message : "Image generation failed",
    };
  }
}

async function runBacktest() {
  loading.value = true;
  error.value = null;
  try {
    backtestResult.value = await backtest();
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Request failed";
  } finally {
    loading.value = false;
  }
}

const matchedTools = computed(() => {
  if (!result.value) return [];
  const seen = new Map<string, { id: string; name: string; partNumber: string }>();
  for (const line of result.value.matchedLines) {
    if (line.tool && !seen.has(line.tool.id)) {
      seen.set(line.tool.id, line.tool);
    }
  }
  return [...seen.values()];
});

const matchStats = computed(() => {
  if (!result.value) return null;
  const lines = result.value.matchedLines;
  return {
    exact: lines.filter((l) => l.matchType === "exact").length,
    fuzzy: lines.filter((l) => l.matchType === "fuzzy").length,
    none: lines.filter((l) => l.matchType === "none").length,
  };
});

function matchBadgeClass(matchType: string) {
  if (matchType === "exact") return "badge badge-exact";
  if (matchType === "fuzzy") return "badge badge-fuzzy";
  return "badge badge-none";
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true"></span>
          <span class="brand-name">Foam<span class="brand-accent">Layout</span></span>
        </div>
        <span class="topbar-badge">Pilot build</span>
      </div>
    </header>

    <main class="page">
      <section class="intro">
        <h1>List-to-layout pilot</h1>
        <p class="subtitle">
          Paste a tool list, match it against past jobs, and get a rough quote — running
          on a synthetic catalog that stands in for data the SolidWorks Document Manager
          API would eventually provide.
        </p>
      </section>

      <section class="card">
        <div class="card-head">
          <span class="step-badge">1</span>
          <div>
            <h2>Paste a tool list</h2>
            <p class="card-sub">One tool per line — part numbers or loose names both work.</p>
          </div>
        </div>
        <textarea v-model="toolListText" rows="6" placeholder="One tool per line"></textarea>
        <div class="actions">
          <button :disabled="loading" class="btn btn-primary" @click="runAnalyze">
            <span v-if="loading" class="spinner" aria-hidden="true"></span>
            Analyze
          </button>
          <button :disabled="loading" class="btn btn-secondary" @click="runBacktest">
            Run retrospective backtest
          </button>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
      </section>

      <section v-if="result" class="card">
        <div class="card-head">
          <span class="step-badge">2</span>
          <div>
            <h2>Matched tools</h2>
            <p class="card-sub">Exact and fuzzy matches against the tool catalog.</p>
          </div>
          <div v-if="matchStats" class="stat-pills">
            <span class="stat-pill stat-pill-exact">{{ matchStats.exact }} exact</span>
            <span class="stat-pill stat-pill-fuzzy">{{ matchStats.fuzzy }} fuzzy</span>
            <span v-if="matchStats.none" class="stat-pill stat-pill-none">{{ matchStats.none }} unmatched</span>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Input line</th>
                <th>Matched tool</th>
                <th>Type</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, i) in result.matchedLines" :key="i">
                <td class="mono">{{ line.rawLine }}</td>
                <td>{{ line.tool ? `${line.tool.name} (${line.tool.partNumber})` : "—" }}</td>
                <td><span :class="matchBadgeClass(line.matchType)">{{ line.matchType }}</span></td>
                <td class="mono">{{ line.score.toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="result" class="card">
        <div class="card-head">
          <span class="step-badge">3</span>
          <div>
            <h2>Top matching layouts</h2>
            <p class="card-sub">Ranked by tool-set overlap with past jobs.</p>
          </div>
        </div>
        <div class="layout-grid">
          <div
            v-for="(layout, i) in result.topLayouts"
            :key="layout.layoutId"
            class="layout-tile"
            :class="{ 'layout-tile-best': i === 0 }"
          >
            <div class="layout-title">
              <strong>{{ layout.name }}</strong>
              <span v-if="i === 0" class="best-tag">Best match</span>
              <span class="score">{{ Math.round(layout.overlapScore * 100) }}%</span>
            </div>
            <div class="overlap-bar">
              <div class="overlap-bar-fill" :style="{ width: `${Math.round(layout.overlapScore * 100)}%` }"></div>
            </div>
            <div class="layout-row"><span class="label">Matched</span> {{ layout.matchedTools.join(", ") || "—" }}</div>
            <div class="layout-row"><span class="label">Missing</span> {{ layout.missingTools.join(", ") || "none" }}</div>
            <div class="layout-row"><span class="label">Extra in layout</span> {{ layout.extraTools.join(", ") || "none" }}</div>
          </div>
        </div>
      </section>

      <section v-if="matchedTools.length > 0" class="card">
        <div class="card-head">
          <span class="step-badge">4</span>
          <div>
            <h2>Tool shapes &amp; sizing</h2>
            <p class="card-sub">
              AI-generated outline + dimensions per matched tool — illustrative only, not
              dimensionally verified CAD output.
            </p>
          </div>
        </div>
        <div class="tool-image-grid">
          <div v-for="tool in matchedTools" :key="tool.id" class="tool-image-tile">
            <div class="tool-image-title">
              {{ tool.name }} <span class="hint">({{ tool.partNumber }})</span>
            </div>
            <div class="tool-image-body">
              <div v-if="toolImages[tool.id]?.loading" class="image-placeholder">
                <span class="spinner spinner-dark" aria-hidden="true"></span>
                <span>Generating…</span>
              </div>
              <p v-else-if="toolImages[tool.id]?.error" class="error">{{ toolImages[tool.id]?.error }}</p>
              <img
                v-else-if="toolImages[tool.id]?.url"
                :src="toolImages[tool.id]?.url ?? undefined"
                :alt="`Shape and sizing for ${tool.name}`"
                class="tool-image"
              />
            </div>
          </div>
        </div>
      </section>

      <section v-if="result?.quote" class="card">
        <div class="card-head">
          <span class="step-badge">5</span>
          <div>
            <h2>Rough quote</h2>
            <p class="card-sub">Based on the best-matched layout.</p>
          </div>
        </div>
        <div class="quote-grid">
          <div class="quote-stat">
            <span class="quote-label">Drawer area</span>
            <span class="quote-value">{{ result.quote.drawerAreaSqIn }} <small>sq in</small></span>
          </div>
          <div class="quote-stat">
            <span class="quote-label">Foam cost</span>
            <span class="quote-value">${{ result.quote.foamCost }}</span>
          </div>
          <div class="quote-stat">
            <span class="quote-label">Missing tools</span>
            <span class="quote-value">{{ result.quote.missingToolCount }}</span>
          </div>
          <div class="quote-stat">
            <span class="quote-label">Design hours</span>
            <span class="quote-value">{{ result.quote.designHours }}</span>
          </div>
          <div class="quote-stat">
            <span class="quote-label">Design cost</span>
            <span class="quote-value">${{ result.quote.designCost }}</span>
          </div>
          <div class="quote-stat quote-stat-total">
            <span class="quote-label">Total estimate</span>
            <span class="quote-value">${{ result.quote.totalEstimate }}</span>
          </div>
        </div>
      </section>

      <section v-if="backtestResult" class="card">
        <div class="card-head">
          <div>
            <h2>Retrospective validation</h2>
            <p class="card-sub">Checking retrieval against known past outcomes.</p>
          </div>
        </div>
        <div class="hit-rate-banner">
          <div class="hit-rate-number">{{ Math.round(backtestResult.hitRate * 100) }}%</div>
          <p>
            <strong>{{ backtestResult.hits }}/{{ backtestResult.totalJobs }}</strong> past jobs where the
            layout actually used appeared in the top 3 retrieved, when queried with a
            slightly imperfect version of that job's tool list.
          </p>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Actual layout</th>
                <th>Top 3 retrieved</th>
                <th>Hit?</th>
                <th>Rank</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in backtestResult.results" :key="row.jobId">
                <td class="mono">{{ row.jobId }}</td>
                <td>{{ row.actualLayoutName }}</td>
                <td class="mono">{{ row.top3.join(", ") }}</td>
                <td>
                  <span :class="row.hitInTop3 ? 'badge badge-exact' : 'badge badge-none'">
                    {{ row.hitInTop3 ? "yes" : "no" }}
                  </span>
                </td>
                <td class="mono">{{ row.rank ?? "—" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  </div>
</template>

<style>
html, body {
  margin: 0;
  background: #f7f8fb;
}
</style>

<style scoped>
.app-shell {
  --bg: #f7f8fb;
  --surface: #ffffff;
  --surface-muted: #f4f5f9;
  --border: #e6e8ef;
  --text: #16181d;
  --text-muted: #5b6270;
  --text-faint: #8d93a1;
  --primary: #4f46e5;
  --primary-dark: #4338ca;
  --primary-soft: #eef0fd;
  --success-bg: #e7f8ee;
  --success-text: #16794a;
  --warning-bg: #fef3e0;
  --warning-text: #92590c;
  --danger-bg: #fdecec;
  --danger-text: #ab2a2a;
  --radius: 12px;
  --shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.04);
  --shadow-md: 0 2px 8px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04);

  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: "Inter", -apple-system, "Segoe UI", system-ui, sans-serif;
}

.topbar {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.topbar-inner {
  max-width: 1040px;
  margin: 0 auto;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.brand-mark {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 7px;
  background: linear-gradient(135deg, var(--primary), #8b85f0);
  box-shadow: var(--shadow-sm);
}

.brand-name {
  font-weight: 700;
  font-size: 1.02rem;
  letter-spacing: -0.01em;
}

.brand-accent {
  color: var(--primary);
}

.topbar-badge {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--primary);
  background: var(--primary-soft);
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
}

.page {
  max-width: 1040px;
  margin: 0 auto;
  padding: 2.25rem 1.5rem 5rem;
}

.intro {
  margin-bottom: 1.75rem;
}

.intro h1 {
  font-size: 1.65rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 0.5rem;
}

.subtitle {
  color: var(--text-muted);
  margin: 0;
  max-width: 68ch;
  line-height: 1.55;
  font-size: 0.95rem;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem 1.6rem;
  margin-bottom: 1.25rem;
  box-shadow: var(--shadow-md);
}

.card-head {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  margin-bottom: 1.1rem;
}

.card-head h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.card-sub {
  margin: 0.15rem 0 0;
  font-size: 0.84rem;
  color: var(--text-faint);
}

.step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 8px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 0.82rem;
  font-weight: 700;
  flex-shrink: 0;
}

.stat-pills {
  display: flex;
  gap: 0.4rem;
  margin-left: auto;
  flex-shrink: 0;
}

.stat-pill {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.22rem 0.6rem;
  border-radius: 999px;
  white-space: nowrap;
}

.stat-pill-exact { background: var(--success-bg); color: var(--success-text); }
.stat-pill-fuzzy { background: var(--warning-bg); color: var(--warning-text); }
.stat-pill-none { background: var(--danger-bg); color: var(--danger-text); }

textarea {
  width: 100%;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.88rem;
  padding: 0.8rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  resize: vertical;
  background: var(--surface-muted);
  color: var(--text);
  box-sizing: border-box;
}

textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-soft);
}

.actions {
  margin-top: 0.9rem;
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid transparent;
  padding: 0.55rem 1.15rem;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.87rem;
  font-weight: 600;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.05s ease;
}

.btn:active:not(:disabled) {
  transform: translateY(1px);
}

.btn-primary {
  background: var(--primary);
  color: white;
  box-shadow: var(--shadow-sm);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-dark);
}

.btn-secondary {
  background: var(--surface);
  color: var(--text);
  border-color: var(--border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--surface-muted);
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.spinner {
  width: 0.8rem;
  height: 0.8rem;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

.spinner-dark {
  border: 2px solid var(--border);
  border-top-color: var(--primary);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error {
  color: var(--danger-text);
  font-size: 0.87rem;
  margin-top: 0.75rem;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.86rem;
}

th {
  text-align: left;
  padding: 0.55rem 0.6rem;
  color: var(--text-faint);
  font-size: 0.71rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

td {
  text-align: left;
  padding: 0.6rem 0.6rem;
  border-bottom: 1px solid var(--border);
}

tbody tr:hover {
  background: var(--surface-muted);
}

.mono {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.badge {
  display: inline-block;
  padding: 0.16rem 0.6rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
}

.badge-exact { background: var(--success-bg); color: var(--success-text); }
.badge-fuzzy { background: var(--warning-bg); color: var(--warning-text); }
.badge-none { background: var(--danger-bg); color: var(--danger-text); }

.layout-grid {
  display: grid;
  gap: 0.75rem;
}

.layout-tile {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.95rem 1.15rem;
  background: var(--surface-muted);
}

.layout-tile-best {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.layout-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.55rem;
}

.layout-title strong {
  font-size: 0.95rem;
}

.best-tag {
  font-size: 0.66rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: white;
  background: var(--primary);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.score {
  margin-left: auto;
  color: var(--primary);
  font-weight: 700;
  font-size: 0.9rem;
}

.overlap-bar {
  height: 6px;
  border-radius: 999px;
  background: var(--border);
  overflow: hidden;
  margin-bottom: 0.7rem;
}

.overlap-bar-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 999px;
}

.layout-row {
  font-size: 0.84rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
  line-height: 1.45;
}

.label {
  color: var(--text-faint);
  font-weight: 600;
  margin-right: 0.3rem;
}

.hint {
  color: var(--text-faint);
  font-size: 0.82rem;
}

.tool-image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
}

.tool-image-tile {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.7rem;
  background: var(--surface-muted);
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.tool-image-tile:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.tool-image-title {
  font-size: 0.84rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.tool-image-body {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 90px;
}

.image-placeholder {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-faint);
  font-size: 0.82rem;
}

.tool-image {
  width: 100%;
  border-radius: 8px;
  background: white;
  border: 1px solid var(--border);
}

.quote-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
}

.quote-stat {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.85rem 1rem;
  background: var(--surface-muted);
  border-radius: 10px;
  border: 1px solid var(--border);
}

.quote-stat-total {
  background: var(--primary-soft);
  border-color: var(--primary);
}

.quote-label {
  font-size: 0.74rem;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-weight: 600;
}

.quote-value {
  font-size: 1.3rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.quote-value small {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-muted);
}

.hit-rate-banner {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1rem 1.25rem;
  background: var(--primary-soft);
  border-radius: 10px;
  margin-bottom: 1rem;
}

.hit-rate-number {
  font-size: 2.3rem;
  font-weight: 800;
  color: var(--primary);
  line-height: 1;
  flex-shrink: 0;
}

.hit-rate-banner p {
  margin: 0;
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.45;
}
</style>
