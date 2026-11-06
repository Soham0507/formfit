import "dotenv/config";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const apiKey = process.env.XAI_API_KEY;
if (!apiKey) {
  console.error("XAI_API_KEY is not set in server/.env");
  process.exit(1);
}

const prompt =
  "Flat 2D technical line drawing, top-down orthographic CAD-style layout " +
  "sheet, white background, black outlines only, no shading, no color, no " +
  "photorealism. Shows a rectangular drawer tray boundary with precise tool " +
  "cutout outlines arranged in a grid: three combination wrenches of " +
  "increasing size, a 3/8-inch drive ratchet, a 1/4-inch drive ratchet, " +
  "needle nose pliers, diagonal cutting pliers, a phillips screwdriver, and a " +
  "flathead screwdriver. Each shape is a clean closed outline like a laser-cut " +
  "die-line pattern, with thin dimension lines and small tick marks along two " +
  "edges indicating width and height measurements (no actual legible numbers " +
  "required). Precise engineering drawing style, vector-art look, no text " +
  "labels, no logos, no 3D perspective.";

async function main() {
  const res = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-imagine-image",
      prompt,
      n: 1,
      response_format: "b64_json",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`xAI API error ${res.status}: ${text}`);
    process.exit(1);
  }

  const json = (await res.json()) as {
    data: Array<{ b64_json?: string; url?: string }>;
  };

  const outDir = path.resolve(import.meta.dirname, "../../generated");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "mechanic-starter-set-a-dieline.png");

  const first = json.data[0];
  if (first?.b64_json) {
    await writeFile(outPath, Buffer.from(first.b64_json, "base64"));
  } else if (first?.url) {
    const imgRes = await fetch(first.url);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    await writeFile(outPath, buf);
  } else {
    console.error("No image data in response:", JSON.stringify(json));
    process.exit(1);
  }

  console.log(`Saved image to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
