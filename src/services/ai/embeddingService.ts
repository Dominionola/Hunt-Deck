import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key",
});

export const EMBEDDING_MODEL = "text-embedding-3-large";
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generates 1536-dimensional vector embedding for a single text string
 * using OpenAI text-embedding-3-large.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const sanitizedText = text.replace(/\n+/g, " ").trim().slice(0, 8000);

  if (!process.env.OPENAI_API_KEY) {
    // Generate deterministic 1536-dim mock vector for local development/testing
    return generateMockEmbedding(sanitizedText, EMBEDDING_DIMENSIONS);
  }

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: sanitizedText,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data[0].embedding;
}

/**
 * Computes cosine similarity between two float vectors.
 * Returns a value between -1.0 and 1.0 (typically 0.0 to 1.0 for embeddings).
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Creates deterministic normalized embedding vector for development without API keys.
 */
function generateMockEmbedding(input: string, dimensions: number): number[] {
  const vector: number[] = new Array(dimensions).fill(0);
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }

  let sumSq = 0;
  for (let i = 0; i < dimensions; i++) {
    const val = Math.sin((hash + i) * 0.17);
    vector[i] = val;
    sumSq += val * val;
  }

  const norm = Math.sqrt(sumSq);
  return vector.map((v) => (norm > 0 ? v / norm : 0));
}
