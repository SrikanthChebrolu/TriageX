import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document }          from '@langchain/core/documents';
import { getHistoricalIncidents } from '../../data/index.js';

/**
 * SimpleEmbeddings — deterministic char-code based embedder.
 * No API key needed. Produces a normalised 50-dim vector from text.
 * Swap for OpenAIEmbeddings / BedrockEmbeddings in production.
 */
class SimpleEmbeddings {
  async embedDocuments(texts) {
    return texts.map(t => this._embed(t));
  }
  async embedQuery(text) {
    return this._embed(text);
  }
  _embed(text) {
    const vector = new Array(50).fill(0);
    for (let i = 0; i < text.length; i++) {
      vector[i % 50] += text.charCodeAt(i) / 1000;
    }
    const magnitude = Math.sqrt(vector.reduce((s, v) => s + v * v, 0)) || 1;
    return vector.map(v => v / magnitude);
  }
}

/** Module-level singleton — lives for the process lifetime (in-memory). */
let _store = null;

/**
 * initKnowledgeStore — seeds the vector store with all historical incidents.
 * Call once at application startup (main.js).
 */
export async function initKnowledgeStore() {
  const incidents  = getHistoricalIncidents();
  const embeddings = new SimpleEmbeddings();

  const documents = incidents.map(inc =>
    new Document({
      pageContent: `${inc.title}. ${inc.description}`,
      metadata:    inc,
    })
  );

  _store = await MemoryVectorStore.fromDocuments(documents, embeddings);
  console.log(`KnowledgeStore seeded with ${incidents.length} historical incidents.`);
  return _store;
}

/** Returns the singleton store. Throws if not yet initialised. */
export function getKnowledgeStore() {
  if (!_store) throw new Error('KnowledgeStore not initialised — call initKnowledgeStore() at startup.');
  return _store;
}

export { SimpleEmbeddings };
