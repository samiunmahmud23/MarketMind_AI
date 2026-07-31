import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";

/**
 * Simple in-memory vector store with cosine similarity.
 * Replaces @langchain/community's MemoryVectorStore (which isn't available
 * as a subpath export in the installed version). This is intentionally
 * simple — it stores documents with their embedding vectors and performs
 * brute-force cosine similarity search. Perfect for this project's scale
 * (hundreds of documents, not millions).
 */
interface StoredDoc {
  id: string;
  content: string;
  metadata: Record<string, any>;
  vector: number[];
}

class SimpleVectorStore {
  private docs: StoredDoc[] = [];
  private embeddings: ZaiEmbeddings;
  private static instance: SimpleVectorStore | null = null;

  constructor(embeddings: ZaiEmbeddings) {
    this.embeddings = embeddings;
  }

  static getInstance(): SimpleVectorStore {
    // Use globalThis to ensure the singleton persists across Next.js
    // route module boundaries in dev mode (Turbopack compiles each route
    // separately, so class-level statics don't share).
    const g = globalThis as any;
    if (!g.__ragVectorStore) {
      g.__ragVectorStore = new SimpleVectorStore(new ZaiEmbeddings());
    }
    return g.__ragVectorStore;
  }

  async addDocuments(docs: Document[]): Promise<void> {
    const vectors = await this.embeddings.embedDocuments(docs.map((d) => d.pageContent));
    for (let i = 0; i < docs.length; i++) {
      this.docs.push({
        id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        content: docs[i].pageContent,
        metadata: docs[i].metadata || {},
        vector: vectors[i],
      });
    }
  }

  async addText(text: string, metadata: Record<string, any>): Promise<void> {
    await this.addDocuments([new Document({ pageContent: text, metadata })]);
  }

  async similaritySearch(query: string, k: number = 5): Promise<{ content: string; metadata: Record<string, any>; score: number }[]> {
    if (this.docs.length === 0) return [];
    const queryVector = await this.embeddings.embedQuery(query);
    const scored = this.docs.map((doc) => ({
      content: doc.content,
      metadata: doc.metadata,
      score: cosineSimilarity(queryVector, doc.vector),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  }

  clear(): void {
    this.docs = [];
  }

  count(): number {
    return this.docs.length;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

/**
 * ZaiEmbeddings — a lightweight, dependency-free embeddings implementation.
 *
 * Since z-ai-web-dev-sdk doesn't expose a dedicated embeddings endpoint,
 * we use a TF-IDF + hashing-trick approach to generate fixed-size vectors
 * from text. This gives us keyword-based semantic similarity that works
 * offline without any external API calls.
 *
 * How it works:
 * 1. Tokenize text into lowercase words (strip punctuation)
 * 2. Apply a hashing function to map each token to a dimension (0..255)
 * 3. Use TF (term frequency) weighting
 * 4. Normalize the vector (L2 norm)
 *
 * This produces a 256-dimensional vector per text. Cosine similarity between
 * vectors reflects shared vocabulary — perfect for marketing content retrieval.
 */

const EMBEDDING_DIM = 256;

// Simple string hash (djb2 algorithm) — deterministic, fast, good distribution
function hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash);
}

// Tokenize text into lowercase words
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

// Generate a 256-dim TF-based embedding vector
function embedText(text: string): number[] {
  const tokens = tokenize(text);
  if (tokens.length === 0) return new Array(EMBEDDING_DIM).fill(0);

  const counts: Record<number, number> = {};
  for (const token of tokens) {
    const dim = hash(token) % EMBEDDING_DIM;
    counts[dim] = (counts[dim] || 0) + 1;
  }

  const vector = new Array(EMBEDDING_DIM).fill(0);
  for (const [dim, count] of Object.entries(counts)) {
    vector[parseInt(dim)] = count / tokens.length; // TF normalization
  }

  // L2 normalize
  let norm = 0;
  for (const v of vector) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) vector[i] /= norm;
  }

  return vector;
}

export class ZaiEmbeddings extends Embeddings {
  constructor(params?: EmbeddingsParams) {
    super(params || {});
  }

  async embedQuery(text: string): Promise<number[]> {
    return embedText(text);
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return texts.map((t) => embedText(t));
  }
}

/**
 * RAG vector store — stores all generated marketing content for retrieval.
 *
 * Uses MemoryVectorStore (in-memory, pure JS) with ZaiEmbeddings.
 * Documents are loaded from the SQLite database on startup and can be
 * refreshed via the /api/rag/seed endpoint.
 */
export class RagVectorStore {
  static async addDocuments(docs: Document[]): Promise<void> {
    await SimpleVectorStore.getInstance().addDocuments(docs);
  }

  static async addText(text: string, metadata: Record<string, any>): Promise<void> {
    await SimpleVectorStore.getInstance().addText(text, metadata);
  }

  static async similaritySearch(
    query: string,
    k: number = 5
  ): Promise<{ content: string; metadata: Record<string, any>; score: number }[]> {
    return SimpleVectorStore.getInstance().similaritySearch(query, k);
  }

  static async clear(): Promise<void> {
    SimpleVectorStore.getInstance().clear();
  }

  static async count(): Promise<number> {
    return SimpleVectorStore.getInstance().count();
  }
}

/**
 * Text splitter for chunking long documents before embedding.
 */
export function createTextSplitter(chunkSize = 500, chunkOverlap = 50) {
  return new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });
}
