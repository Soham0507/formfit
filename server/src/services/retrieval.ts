import { layouts, type Layout } from "../data/catalog.js";

export interface LayoutRanking {
  layout: Layout;
  overlapScore: number; // Jaccard similarity of tool id sets
  matchedToolIds: string[];
  missingToolIds: string[]; // requested tools not present in this layout
  extraToolIds: string[]; // tools in this layout not requested
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function rankLayouts(requestedToolIds: string[], topN = 3): LayoutRanking[] {
  const requested = new Set(requestedToolIds);

  const rankings: LayoutRanking[] = layouts.map((layout) => {
    const layoutSet = new Set(layout.toolIds);
    const matchedToolIds = layout.toolIds.filter((id) => requested.has(id));
    const missingToolIds = requestedToolIds.filter((id) => !layoutSet.has(id));
    const extraToolIds = layout.toolIds.filter((id) => !requested.has(id));

    return {
      layout,
      overlapScore: jaccard(requested, layoutSet),
      matchedToolIds,
      missingToolIds,
      extraToolIds,
    };
  });

  return rankings.sort((a, b) => b.overlapScore - a.overlapScore).slice(0, topN);
}
