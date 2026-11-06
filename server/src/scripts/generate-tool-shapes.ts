import "dotenv/config";
import { existsSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { tools } from "../data/catalog.js";

const apiKey = process.env.XAI_API_KEY;
if (!apiKey) {
  console.error("XAI_API_KEY is not set in server/.env");
  process.exit(1);
}

// Full catalog. Pass specific tool ids as CLI args to regenerate a subset,
// e.g. `npx tsx src/scripts/generate-tool-shapes.ts t1 t6`.
const cliIds = process.argv.slice(2);
const sampleToolIds = cliIds.length > 0 ? cliIds : tools.map((t) => t.id);

function buildPrompt(name: string, widthIn: number, heightIn: number): string {
  return (
    `Single isolated flat 2D technical line drawing of one tool: a ${name}. ` +
    `Pure white background, black outline only, no shading, no color, no ` +
    `photorealism, no 3D perspective - a clean closed silhouette outline as if ` +
    `for a laser-cut foam cavity template. Centered in frame with generous ` +
    `white margin. Below the outline, a horizontal dimension line with arrow ` +
    `ends labeled "${widthIn.toFixed(2)} in" for the overall length, and a ` +
    `vertical dimension line to the right labeled "${heightIn.toFixed(2)} in" ` +
    `for the overall height. Precise engineering drawing style, vector-art ` +
    `look, no other text, no logos, no background objects.`
  );
}

async function generateOne(toolId: string) {
  const tool = tools.find((t) => t.id === toolId);
  if (!tool) throw new Error(`Unknown tool id ${toolId}`);

  const outDir = path.resolve(import.meta.dirname, "../../generated/tools");
  const outPath = path.join(outDir, `${tool.id}.png`);
  if (existsSync(outPath)) {
    console.log(`Skipping ${tool.name} (already generated at ${outPath})`);
    return;
  }

  const res = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-imagine-image",
      prompt: buildPrompt(tool.name, tool.widthIn, tool.heightIn),
      n: 1,
      response_format: "b64_json",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`xAI API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    data: Array<{ b64_json?: string; url?: string }>;
  };

  await mkdir(outDir, { recursive: true });

  const first = json.data[0];
  if (first?.b64_json) {
    await writeFile(outPath, Buffer.from(first.b64_json, "base64"));
  } else if (first?.url) {
    const imgRes = await fetch(first.url);
    await writeFile(outPath, Buffer.from(await imgRes.arrayBuffer()));
  } else {
    throw new Error(`No image data for ${tool.id}: ${JSON.stringify(json)}`);
  }

  console.log(`Saved ${tool.name} -> ${outPath}`);
}

async function main() {
  for (const id of sampleToolIds) {
    await generateOne(id);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
