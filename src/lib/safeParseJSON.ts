/**
 * Safely parses JSON from various inputs, handling:
 * - Already parsed objects
 * - JSON strings with extra text
 * - Common formatting issues
 * 
 * @example
 * // Already parsed object
 * const input = { action: "HOLD", confidence: 0.75 };
 * const result = safeParseJSON(input); // Returns the object as-is
 * 
 * @example
 * // Single-line JSON string
 * const input = '{"action":"HOLD","confidence":0.75}';
 * const result = safeParseJSON(input); // Returns parsed object
 * 
 * @example
 * // Multi-line JSON with unescaped characters
 * const input = `{
 *   "action": "HOLD",
 *   "confidence": 0.75,
 *   "reasoning": "The price has increased,
 *                but confidence is low"
 * }`;
 * const result = safeParseJSON(input); // Returns parsed object
 * 
 * @param input The input to parse - either a string containing JSON or an already parsed object
 * @returns The parsed object or null if parsing fails
 */
export function safeParseJSON<T>(input: unknown): T | null {
  // Handle null/undefined input
  if (input == null) {
    console.warn('Received null/undefined input for JSON parsing');
    return null;
  }

  // If input is already an object (but not a string object), return it
  if (typeof input === 'object' && !(input instanceof String)) {
    return input as T;
  }

  // Convert input to string for parsing
  const inputStr = String(input);

  // Handle empty or whitespace-only input
  if (!inputStr.trim()) {
    console.warn('Received empty input for JSON parsing');
    return null;
  }

  try {
    // First try direct parsing
    return JSON.parse(inputStr) as T;
  } catch (error) {
    // If direct parsing fails, try to extract and clean JSON object
    try {
      const jsonMatch = inputStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        // Get the matched JSON string
        let jsonStr = jsonMatch[0];

        // Clean up common formatting issues:
        // 1. Replace unescaped newlines in strings with \n
        jsonStr = jsonStr.replace(/:\s*"([^"]*(?:(?:\r\n|\n|\r)[^"]*)*?)"/g, (match, p1) => {
          const cleaned = p1.replace(/[\r\n]+\s*/g, '\\n');
          return `: "${cleaned}"`;
        });

        // 2. Remove any other unescaped control characters
        jsonStr = jsonStr.replace(/[\u0000-\u001F]+/g, '');

        // 3. Ensure proper spacing after colons (but not in string values)
        jsonStr = jsonStr.replace(/([^\\])":\s*([^"\s{[])/g, '$1": $2');

        // Try parsing the cleaned JSON
        return JSON.parse(jsonStr) as T;
      }
    } catch (extractError) {
      console.error('Failed to extract and parse JSON:', {
        originalInput: inputStr.slice(0, 200) + '...',
        error: extractError instanceof Error ? extractError.message : 'Unknown error',
        cleaningAttempted: true
      });
    }
    return null;
  }
}
