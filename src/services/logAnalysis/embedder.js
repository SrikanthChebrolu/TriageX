import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document }          from '@langchain/core/documents';
import { SimpleEmbeddings }  from '../rag/knowledgeStore.js';

/**
 * buildVectorStore — embeds all log messages into a per-request in-memory store.
 * The store is discarded after the response — it is not the KnowledgeStore singleton.
 *
 * @param {Array} logs - normalised log entries
 * @returns {MemoryVectorStore}
 */
export async function buildVectorStore(logs) {
  const embeddings = new SimpleEmbeddings();
  const documents  = logs.map(log =>
    new Document({
      pageContent: log.message,
      metadata:    log,
    })
  );
  return MemoryVectorStore.fromDocuments(documents, embeddings);
}
