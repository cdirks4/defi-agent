/**
 * Safely parses a JSON string, returning null if parsing fails
 * @param value The string to parse
 * @returns The parsed JSON object or null if parsing fails
 */
export function safeParseJSON<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return null;
  }
}