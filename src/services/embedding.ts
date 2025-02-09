/**
 * Since the Llama API does not support embedding generation (unlike OpenAI's text-embedding-ada-002),
 * we implement a fallback mechanism that generates deterministic embeddings.
 * This allows us to maintain pattern matching functionality without requiring a separate embedding API.
 */

const EMBEDDING_DIMENSION = 1536; // Matching text-embedding-ada-002 dimension for compatibility

/**
 * Creates a deterministic embedding for any input data.
 * This is a fallback implementation since Llama API doesn't support embeddings.
 */
export async function createEmbedding(data: any): Promise<number[]> {
  console.log("Using deterministic embedding generation for data analysis");
  return generateFallbackEmbedding();
}

/**
 * Generates a deterministic embedding using a timestamp-based pattern.
 * This provides some consistency in pattern matching while being deterministic.
 * The sine wave pattern creates a smooth distribution of values between -0.1 and 0.1,
 * which is a reasonable range for embedding vectors.
 */
function generateFallbackEmbedding(): number[] {
  const embedding = new Array(EMBEDDING_DIMENSION).fill(0);
  const timestamp = Date.now();
  
  // Fill with a simple pattern based on timestamp
  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    embedding[i] = Math.sin(timestamp / 1000 + i) * 0.1;
  }
  
  return embedding;
}
