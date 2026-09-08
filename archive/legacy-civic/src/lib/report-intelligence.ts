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
  const client = new OpenAI({ 
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
  
  // Groq requires standard chat completions format, not the experimental `responses` API or Structured Outputs if it's not fully compatible.
  // Wait, does Groq support structured outputs exactly like OpenAI? 
  // Let's use the standard `chat.completions.create` and JSON mode or function calling.
  // The user specifies using existing openai SDK, and model qwen/qwen3.6-27b.
  // Wait, `client.responses.create` was an experimental feature in `openai` sdk? No, `responses` might be a new top-level API or legacy. Actually `client.chat.completions.create` is standard. Let's stick to `chat.completions.create` with JSON mode because `qwen/qwen3.6-27b` on Groq supports JSON mode.
  const content: Array<any> = [{
    type: "text",
    text: `Analyse this civic complaint. Citizen-selected category: ${selectedCategory}. Complaint: ${description}`,
  }];
  if (photo?.size) {
    const base64 = Buffer.from(await photo.arrayBuffer()).toString("base64");
    content.push({ type: "image_url", image_url: { url: `data:${photo.type};base64,${base64}`, detail: "low" } });
  }
  
  const response = await client.chat.completions.create({
    model: process.env.GROQ_REPORT_MODEL || "qwen/qwen3.6-27b",
    messages: [
      { role: "system", content: "Extract facts from the citizen report. Do not recommend solutions. Keep the title and summary concise. Return JSON with the exact following keys: title, category, severity, summary, observations (array). Valid categories: " + categories.map((c) => c.id).join(", ") + ". Valid severities: low, medium, high, critical." },
      { role: "user", content }
    ],
    response_format: { type: "json_object" }
  });
  
  return JSON.parse(response.choices[0].message.content || "{}") as Omit<ReportAnalysis, "engine" | "embedding" | "embeddingModel">;
}

export async function analyseReport(description: string, selectedCategory: CategoryId, photo?: File): Promise<ReportAnalysis> {
  if (process.env.GROQ_API_KEY?.trim() && process.env.OPENAI_API_KEY?.trim()) {
    try {
      const analysis = await openAIAnalysis(description, selectedCategory, photo);
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const embedding = await client.embeddings.create({ model: "text-embedding-3-small", dimensions: 1536, input: `${analysis.category}\n${analysis.title}\n${analysis.summary}` });
      return { ...analysis, engine: "openai", embedding: embedding.data[0].embedding, embeddingModel: "text-embedding-3-small" };
    } catch (error) {
      console.error("Groq/OpenAI report processing failed; using local fallback", error instanceof Error ? error.message : "unknown error");
    }
  }
  const analysis = localAnalysis(description, selectedCategory);
  return { ...analysis, embedding: localEmbedding(`${analysis.title} ${analysis.summary}`, analysis.category), embeddingModel: "local-hash-v1" };
}
