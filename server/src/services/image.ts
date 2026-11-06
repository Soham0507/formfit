import type { Tool } from "../data/catalog.js";

const apiKey = process.env.XAI_API_KEY;

export class ImageGenerationDisabledError extends Error {
  constructor() {
    super("XAI_API_KEY is not set in server/.env");
    this.name = "ImageGenerationDisabledError";
  }
}

async function callXaiImageApi(prompt: string): Promise<Buffer> {
  if (!apiKey) {
    throw new ImageGenerationDisabledError();
  }

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
    throw new Error(`xAI API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    data: Array<{ b64_json?: string; url?: string }>;
  };

  const first = json.data[0];
  if (first?.b64_json) {
    return Buffer.from(first.b64_json, "base64");
  }
  if (first?.url) {
    const imgRes = await fetch(first.url);
    return Buffer.from(await imgRes.arrayBuffer());
  }

  throw new Error(`No image data in xAI response: ${JSON.stringify(json)}`);
}

function buildLayoutPrompt(layoutName: string, toolNames: string[]): string {
  const toolList = toolNames.join(", ");
  return (
    `Top-down product photo of a custom-cut black foam drawer organizer insert ` +
    `inside a metal toolbox drawer, titled "${layoutName}" in concept only (no ` +
    `text rendered on the image). Shadow-foam style with two-tone foam (black ` +
    `top layer cut out, bright yellow foam base layer visible in the cutout ` +
    `shapes). The cutouts hold these tools neatly arranged in a grid, each tool ` +
    `shape outlined precisely in its own foam cavity: ${toolList}. Studio ` +
    `lighting, slight overhead angle, sharp focus, realistic industrial ` +
    `photography style, no text or logos.`
  );
}

export function generateLayoutImage(layoutName: string, toolNames: string[]): Promise<Buffer> {
  return callXaiImageApi(buildLayoutPrompt(layoutName, toolNames));
}

function buildToolShapePrompt(name: string, widthIn: number, heightIn: number): string {
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

export function generateToolShapeImage(tool: Tool): Promise<Buffer> {
  return callXaiImageApi(buildToolShapePrompt(tool.name, tool.widthIn, tool.heightIn));
}
