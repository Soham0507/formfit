import { Router } from "express";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { matchToolList } from "../services/match.js";
import { rankLayouts } from "../services/retrieval.js";
import { estimateQuote, toolNames } from "../services/quote.js";
import {
  generateLayoutImage,
  generateToolShapeImage,
  ImageGenerationDisabledError,
} from "../services/image.js";
import { layouts, tools } from "../data/catalog.js";

export const apiRouter = Router();

const GENERATED_DIR = path.resolve(import.meta.dirname, "../../generated");

apiRouter.post("/analyze", (req, res) => {
  const { toolListText } = req.body as { toolListText?: string };
  if (!toolListText || typeof toolListText !== "string") {
    return res.status(400).json({ error: "toolListText is required" });
  }

  const matchedLines = matchToolList(toolListText);
  const matchedToolIds = matchedLines
    .map((l) => l.tool?.id)
    .filter((id): id is string => Boolean(id));

  const rankings = rankLayouts(matchedToolIds, 3);
  const best = rankings[0];
  const quote = best ? estimateQuote(best) : null;

  res.json({
    matchedLines: matchedLines.map((l) => ({
      ...l,
      tool: l.tool,
    })),
    topLayouts: rankings.map((r) => ({
      layoutId: r.layout.id,
      name: r.layout.name,
      overlapScore: Math.round(r.overlapScore * 100) / 100,
      matchedTools: toolNames(r.matchedToolIds),
      missingTools: toolNames(r.missingToolIds),
      extraTools: toolNames(r.extraToolIds),
    })),
    quote,
  });
});

// Renders (or returns a cached render of) a layout as a concept image via the
// xAI Grok image API. Not a CAD/manufacturing output - just a visual for
// pitching the idea. Cached to disk per layout so repeat requests don't spend
// API credits re-generating the same layout.
apiRouter.post("/render-layout/:layoutId", async (req, res) => {
  const layout = layouts.find((l) => l.id === req.params.layoutId);
  if (!layout) {
    return res.status(404).json({ error: "Unknown layoutId" });
  }

  const fileName = `${layout.id}.png`;
  const filePath = path.join(GENERATED_DIR, fileName);

  if (!existsSync(filePath)) {
    try {
      const image = await generateLayoutImage(layout.name, toolNames(layout.toolIds));
      await mkdir(GENERATED_DIR, { recursive: true });
      await writeFile(filePath, image);
    } catch (err) {
      if (err instanceof ImageGenerationDisabledError) {
        return res.status(503).json({ error: err.message });
      }
      return res.status(502).json({ error: (err as Error).message });
    }
  }

  res.json({ imageUrl: `/generated/${fileName}` });
});

// Renders (or returns a cached render of) a single tool's shape + dimensions
// as an isolated outline image - this is what the client actually asked for
// (per-tool cutout shape and sizing), not a whole-board composite. Cached to
// disk per tool for the same reason as render-layout above.
apiRouter.post("/tool-image/:toolId", async (req, res) => {
  const tool = tools.find((t) => t.id === req.params.toolId);
  if (!tool) {
    return res.status(404).json({ error: "Unknown toolId" });
  }

  const toolsDir = path.join(GENERATED_DIR, "tools");
  const fileName = `${tool.id}.png`;
  const filePath = path.join(toolsDir, fileName);

  if (!existsSync(filePath)) {
    try {
      const image = await generateToolShapeImage(tool);
      await mkdir(toolsDir, { recursive: true });
      await writeFile(filePath, image);
    } catch (err) {
      if (err instanceof ImageGenerationDisabledError) {
        return res.status(503).json({ error: err.message });
      }
      return res.status(502).json({ error: (err as Error).message });
    }
  }

  res.json({ imageUrl: `/generated/tools/${fileName}` });
});

// Retrospective validation: for every past job, simulate a slightly imperfect
// request for it (drop one tool, add one unrelated decoy tool - a request
// list is rarely an exact match to a past layout's tool set) and check
// whether the layout actually used still shows up in the top-3 results. This
// is the cheap check the coworker's note proposed before investing in
// nesting or photo recognition.
apiRouter.get("/backtest", (_req, res) => {
  const results = layouts.map((job, index) => {
    const decoyLayout = layouts[(index + 1) % layouts.length];
    const decoyToolId = decoyLayout.toolIds.find((id) => !job.toolIds.includes(id));
    const simulatedRequest = job.toolIds
      .slice(0, Math.max(1, job.toolIds.length - 1))
      .concat(decoyToolId ? [decoyToolId] : []);

    const rankings = rankLayouts(simulatedRequest, 3);
    const rank = rankings.findIndex((r) => r.layout.id === job.id);
    return {
      jobId: job.usedOnJobId,
      actualLayoutId: job.id,
      actualLayoutName: job.name,
      top3: rankings.map((r) => r.layout.id),
      hitInTop3: rank !== -1,
      rank: rank === -1 ? null : rank + 1,
    };
  });

  const hits = results.filter((r) => r.hitInTop3).length;

  res.json({
    totalJobs: results.length,
    hits,
    hitRate: Math.round((hits / results.length) * 100) / 100,
    results,
  });
});
