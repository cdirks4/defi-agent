import { format } from 'date-fns';

/**
 * Safely formats a date string using date-fns, handling invalid dates
 * @param dateString The date string to format
 * @param formatStr The date-fns format string to use
 * @param defaultValue Optional default value to return if date is invalid (defaults to '-')
 * @returns Formatted date string or default value if date is invalid
 */
export function safeFormatDate(
  dateString: string | null | undefined,
  formatStr: string,
  defaultValue: string = '-'
): string {
  if (!dateString) {
    return defaultValue;
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return defaultValue;
    }
    return format(date, formatStr);
  } catch (error) {
    console.warn('Error formatting date:', error);
    return defaultValue;
  }
}
