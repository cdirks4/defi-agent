/**
 * Safely formats a number with the specified number of decimal places.
 * Returns a default value if the input is invalid.
 */
export function safeFormatNumber(
  value: number | string | undefined | null,
  decimals: number = 2,
  defaultValue: number = 0
): string {
  // Handle undefined, null, or empty string
  if (value === undefined || value === null || value === "") {
    return defaultValue.toFixed(decimals);
  }

  // Convert string to number if needed
  const numValue = typeof value === "string" ? parseFloat(value) : value;

  // Check if it's a valid number
  if (isNaN(numValue) || !isFinite(numValue)) {
    return defaultValue.toFixed(decimals);
  }

  return numValue.toFixed(decimals);
}

/**
 * Safely formats a currency value with specified decimal places, handling null/undefined values
 * @param value The number to format (or null/undefined)
 * @param decimals The number of decimal places to show
 * @param defaultValue Optional default value to use if input is null/undefined (defaults to 0)
 * @returns Formatted string representation of the currency value with $ prefix
 */
export function safeFormatCurrency(
  value: number | null | undefined,
  decimals: number,
  defaultValue: number = 0
): string {
  return "$" + safeFormatNumber(value, decimals, defaultValue);
}

/**
 * Safely formats a percentage with specified decimal places, handling null/undefined values
 * @param value The number to format (or null/undefined)
 * @param decimals The number of decimal places to show
 * @param defaultValue Optional default value to use if input is null/undefined (defaults to 0)
 * @returns Formatted string representation of the percentage value with % suffix
 */
export function safeFormatPercentage(
  value: number | null | undefined,
  decimals: number,
  defaultValue: number = 0
): string {
  return safeFormatNumber(value, decimals, defaultValue) + "%";
}
