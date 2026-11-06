# Foam Layout Pilot (prototype)

List-to-layout prototype for the foam-insert quoting idea discussed with the team.
Runs entirely against a **synthetic catalog** (`server/src/data/catalog.ts`) that
stands in for data the SolidWorks Document Manager API would eventually extract
from the real part files — there is no SolidWorks license/API key involved here,
and no 3D model was generated. Swap `catalog.ts` for a real extractor's output
once that's available and the rest of the pipeline should keep working unchanged.

Validates the three "solid" pieces from the team's assessment:

1. **Parsing + matching** a messy pasted tool list against a catalog (exact +
   Levenshtein-based fuzzy matching).
2. **Layout retrieval** — top-3 past layouts by Jaccard (set) overlap of tool IDs.
3. **Rough quoting** — drawer area × foam price, plus a design-hours estimate
   from the count of tools not covered by the best-matching layout.

Also includes the cheap retrospective check the team proposed: `/api/backtest`
re-queries each past job with a slightly perturbed version of its own tool list
(one tool dropped, one decoy added) and reports whether the layout actually used
still comes back in the top 3.

## Stack

- `server/` — Express + TypeScript API
- `client/` — Vue 3 + TypeScript (Vite) single-page UI

## Run it

```bash
cd server && npm install && npm run dev   # http://localhost:4000
cd client && npm install && npm run dev   # http://localhost:5173 (or next free port)
```

Paste a tool list (part numbers or loose names, one per line) and click
**Analyze**, or click **Run retrospective backtest** to see the hit-rate check
against the synthetic past jobs.

## Next steps toward the real thing

- Replace `server/src/data/catalog.ts` with real output from a SolidWorks
  extractor (per the earlier note: a small C# or Python/`pywin32` tool reading
  the Document Manager API, dumping tool names/dimensions/layouts to JSON).
- Re-run `/api/backtest` against real past jobs to see if the retrieval
  approach holds up on real (messier) feature-naming data.
