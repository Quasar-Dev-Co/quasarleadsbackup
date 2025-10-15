import OpenAI from 'openai';

// Cache OpenAI clients per API key to avoid re-instantiation
const clientCache: Map<string, OpenAI> = new Map();

/**
 * Returns an OpenAI client using the provided API key from user credentials.
 * NO fallback to environment variables - API key MUST come from database.
 */
export function getOpenAIClient(apiKey?: string): OpenAI {
  const effectiveKey = (apiKey && apiKey.trim()) || '';
  if (!effectiveKey) {
    throw new Error('OPENAI_API_KEY is required from user credentials (no env fallback)');
  }

  const cacheKey = effectiveKey;
  const existing = clientCache.get(cacheKey);
  if (existing) return existing;

  console.log(`🔑 Creating OpenAI client with user-provided key (length: ${effectiveKey.length})`);
  const client = new OpenAI({ apiKey: effectiveKey });
  clientCache.set(cacheKey, client);
  return client;
}

export default getOpenAIClient;
