/**
 * LLMProvider — base interface for all LLM integrations.
 * Extend this class and implement analyze() to add a real provider.
 */
export class LLMProvider {
  async analyze(_data, _context) {
    throw new Error(`${this.constructor.name} must implement analyze()`);
  }
}
