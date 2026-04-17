import { MockLLMProvider }          from './MockLLMProvider.js';
import { MockTriageLLMProvider }    from './MockTriageLLMProvider.js';
import { MockRootCauseLLMProvider } from './MockRootCauseLLMProvider.js';
import { LLM_PROVIDER }             from '../../config.js';

/** Returns the configured LLM provider for log analysis. */
export function getLLMProvider() {
  if (LLM_PROVIDER === 'mock') return new MockLLMProvider();
  throw new Error(`Unknown LLM_PROVIDER: "${LLM_PROVIDER}"`);
}

/** Returns the configured LLM provider for incident triage. */
export function getTriageLLMProvider() {
  if (LLM_PROVIDER === 'mock') return new MockTriageLLMProvider();
  throw new Error(`Unknown LLM_PROVIDER: "${LLM_PROVIDER}"`);
}

/** Returns the configured LLM provider for root-cause analysis. */
export function getRootCauseLLMProvider() {
  if (LLM_PROVIDER === 'mock') return new MockRootCauseLLMProvider();
  throw new Error(`Unknown LLM_PROVIDER: "${LLM_PROVIDER}"`);
}
