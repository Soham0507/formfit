import { tools, foamPricePerSqIn, designHoursPerMissingTool, designHourRate } from "../data/catalog.js";
import type { LayoutRanking } from "./retrieval.js";

export interface QuoteEstimate {
  basedOnLayoutId: string;
  drawerAreaSqIn: number;
  foamCost: number;
  missingToolCount: number;
  designHours: number;
  designCost: number;
  totalEstimate: number;
}

export function estimateQuote(bestMatch: LayoutRanking): QuoteEstimate {
  const { layout, missingToolIds } = bestMatch;
  const drawerAreaSqIn = layout.drawerWidthIn * layout.drawerHeightIn;
  const foamCost = drawerAreaSqIn * foamPricePerSqIn;

  const missingToolCount = missingToolIds.length;
  const designHours = missingToolCount * designHoursPerMissingTool;
  const designCost = designHours * designHourRate;

  return {
    basedOnLayoutId: layout.id,
    drawerAreaSqIn,
    foamCost: round2(foamCost),
    missingToolCount,
    designHours: round2(designHours),
    designCost: round2(designCost),
    totalEstimate: round2(foamCost + designCost),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function toolNames(ids: string[]): string[] {
  return ids.map((id) => tools.find((t) => t.id === id)?.name ?? id);
}
