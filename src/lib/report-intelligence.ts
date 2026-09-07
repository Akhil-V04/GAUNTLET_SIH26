import "server-only";

import OpenAI from "openai";
import { categories, type CategoryId } from "@/lib/categories";

export type ReportAnalysis = {
  title: string;
  category: CategoryId;
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  observations: string[];
  engine: "openai" | "local";
  embedding: number[];
  embeddingModel: string;
};

const categoryTerms: Record<CategoryId, string[]> = {
  roads: ["pothole", "road", "footpath", "pavement", "crater"],
  drainage: ["drain", "drainage", "sewage", "waterlogging", "flood"],
  sanitation: ["garbage", "trash", "waste", "dumping", "rubbish"],
  streetlights: ["streetlight", "street light", "lamp", "dark road"],
  mosquitoes: ["mosquito", "breeding", "larvae"],
  noise: ["noise", "loud", "speaker", "music", "neighbour"],
  internet: ["internet", "broadband", "wifi", "network", "telecom"],
  animals: ["dog", "dogs", "animal", "cattle", "stray"],
  water: ["drinking water", "water supply", "tap", "contaminated water"],
  electricity: ["electricity", "power cut", "transformer", "wire", "outage"],
  other: [],
};

const canonical: Record<string, string> = {
  potholes: "pothole", crater: "pothole", damaged: "damage", broken: "damage",
  trash: "garbage", rubbish: "garbage", waste: "garbage", dumping: "garbage",
  flooded: "waterlogging", flood: "waterlogging", sewage: "drainage", drains: "drainage",
  lamp: "streetlight", lights: "streetlight", streetlights: "streetlight",
  dogs: "dog", stray: "animal", blackout: "electricity", outage: "outage",
  broadband: "internet", wifi: "internet", loud: "noise", speakers: "noise",
};

function pickCategory(text: string, selected: CategoryId): CategoryId {
  if (selected !== "other") return selected;
  const lower = text.toLowerCase();
  let best: CategoryId = "other";
  let score = 0;
  for (const [category, terms] of Object.entries(categoryTerms) as [CategoryId, string[]][]) {
    const hits = terms.filter((term) => lower.includes(term)).length;
    if (hits > score) { best = category; score = hits; }
  }
  return best;
}

export function localEmbedding(text: string, category: CategoryId) {
  const vector = new Array<number>(1536).fill(0);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 2);
  const tokens = [`category:${category}`, `category:${category}`, ...words.map((word) => canonical[word] ?? word)];
  for (const token of tokens) {
    let hash = 2166136261;
    for (let i = 0; i < token.length; i++) hash = Math.imul(hash ^ token.charCodeAt(i), 16777619);
    const index = (hash >>> 0) % vector.length;
    vector[index] += (hash & 1) === 0 ? 1 : -1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(7)));
}

function localAnalysis(description: string, selectedCategory: CategoryId): Omit<ReportAnalysis, "embedding" | "embeddingModel"> {
  const category = pickCategory(description, selectedCategory);
  const lower = description.toLowerCase();
  const severity = /fire|sparking|electrocution|accident|collapsed|danger|emergency|contaminated/.test(lower)
    ? "critical" : /severe|major|overflow|days|unsafe|complete outage/.test(lower)
      ? "high" : /minor|small|intermittent/.test(lower) ? "low" : "medium";
  const clean = description.replace(/\s+/g, " ").trim();
  const title = clean.length <= 76 ? clean : `${clean.slice(0, 73).trim()}…`;
  return { title, category, severity, summary: clean, observations: ["Text report processed", "Location included for nearby matching"], engine: "local" };
}

async function openAIAnalysis(description: string, selectedCategory: CategoryId, photo?: File) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const content: Array<{ type: "input_text"; text: string } | { type: "input_image"; image_url: string; detail: "low" }> = [{
    type: "input_text",
    text: `Analyse this civic complaint. Citizen-selected category: ${selectedCategory}. Complaint: ${description}`,
  }];
  if (photo?.size) {
    const base64 = Buffer.from(await photo.arrayBuffer()).toString("base64");
    content.push({ type: "input_image", image_url: `data:${photo.type};base64,${base64}`, detail: "low" });
  }
  const response = await client.responses.create({
    model: process.env.OPENAI_REPORT_MODEL || "gpt-4.1-mini",
    instructions: "Extract facts from the citizen report. Do not recommend solutions. Keep the title and summary concise.",
    input: [{ role: "user", content }],
    text: { format: { type: "json_schema", name: "civic_report", strict: true, schema: {
      type: "object", additionalProperties: false,
      properties: {
        title: { type: "string" },
        category: { type: "string", enum: categories.map((item) => item.id) },
        severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
        summary: { type: "string" },
        observations: { type: "array", items: { type: "string" }, maxItems: 4 },
      },
      required: ["title", "category", "severity", "summary", "observations"],
    } } },
  });
  return JSON.parse(response.output_text) as Omit<ReportAnalysis, "engine" | "embedding" | "embeddingModel">;
}

export async function analyseReport(description: string, selectedCategory: CategoryId, photo?: File): Promise<ReportAnalysis> {
  if (process.env.OPENAI_API_KEY?.trim()) {
    try {
      const analysis = await openAIAnalysis(description, selectedCategory, photo);
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const embedding = await client.embeddings.create({ model: "text-embedding-3-small", dimensions: 1536, input: `${analysis.category}\n${analysis.title}\n${analysis.summary}` });
      return { ...analysis, engine: "openai", embedding: embedding.data[0].embedding, embeddingModel: "text-embedding-3-small" };
    } catch (error) {
      console.error("OpenAI report processing failed; using local fallback", error instanceof Error ? error.message : "unknown error");
    }
  }
  const analysis = localAnalysis(description, selectedCategory);
  return { ...analysis, embedding: localEmbedding(`${analysis.title} ${analysis.summary}`, analysis.category), embeddingModel: "local-hash-v1" };
}
