/**
 * Parser utilities for QuickAdd functionality
 * Parses time (@HH:mm), date (@DD.MM or @DD.MM.YYYY), and tags (#tag) from input text
 */

export interface ParsedQuickAdd {
	title: string;
	time?: string;
	date?: string;
	tags: string[];
}

/**
 * Parse time in format @HH:mm (e.g., @14:30, @09:15)
 */
export function parseTime(text: string): { time?: string; remaining: string } {
	const timeRegex = /@(\d{1,2}):(\d{2})\b/g;
	const matches = Array.from(text.matchAll(timeRegex));

	if (matches.length === 0) {
		return { remaining: text };
	}

	// Take the first valid time found
	const match = matches[0];
	const hours = parseInt(match[1], 10);
	const minutes = parseInt(match[2], 10);

	// Validate time format
	if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
		const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
		const remaining = text.replace(match[0], '').replace(/\s+/g, ' ').trim();
		return { time, remaining };
	}

	return { remaining: text };
}

/**
 * Parse date in format @DD.MM or @DD.MM.YYYY (e.g., @25.12, @25.12.2024)
 */
export function parseDate(text: string): { date?: string; remaining: string } {
	const dateRegex = /@(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?\b/g;
	const matches = Array.from(text.matchAll(dateRegex));

	if (matches.length === 0) {
		return { remaining: text };
	}

	// Take the first valid date found
	const match = matches[0];
	const day = parseInt(match[1], 10);
	const month = parseInt(match[2], 10);
	const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();

	// Validate date format
	if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 9999) {
		// Create a date string in YYYY-MM-DD format
		const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
		const remaining = text.replace(match[0], '').replace(/\s+/g, ' ').trim();
		return { date, remaining };
	}

	return { remaining: text };
}

/**
 * Parse tags in format #tag (e.g., #work, #important, #meeting)
 */
export function parseTags(text: string): { tags: string[]; remaining: string } {
	const tagRegex = /#([a-zA-Z0-9_-]+)\b/g;
	const matches = Array.from(text.matchAll(tagRegex));

	if (matches.length === 0) {
		return { tags: [], remaining: text };
	}

	const tags = matches.map((match) => match[1].toLowerCase());
	const remaining = text.replace(tagRegex, '').replace(/\s+/g, ' ').trim();

	return { tags, remaining };
}

/**
 * Parse the complete QuickAdd text to extract title, time, date, and tags
 */
export function parseQuickAdd(text: string): ParsedQuickAdd {
	if (!text || !text.trim()) {
		return { title: '', tags: [] };
	}

	let remaining = text.trim();

	// Parse time
	const timeResult = parseTime(remaining);
	remaining = timeResult.remaining;

	// Parse date
	const dateResult = parseDate(remaining);
	remaining = dateResult.remaining;

	// Parse tags
	const tagsResult = parseTags(remaining);
	remaining = tagsResult.remaining;

	// Clean up multiple spaces and trim
	const title = remaining.replace(/\s+/g, ' ').trim();

	return {
		title,
		time: timeResult.time,
		date: dateResult.date,
		tags: tagsResult.tags
	};
}

/**
 * Validate if parsed result has required fields for a complete task
 */
export function validateQuickAdd(parsed: ParsedQuickAdd): {
	isValid: boolean;
	missingFields: string[];
} {
	const missingFields: string[] = [];

	if (!parsed.title || parsed.title.trim().length === 0) {
		missingFields.push('title');
	}

	// Note: time and date are optional, only title is required
	// Tags are always optional

	return {
		isValid: missingFields.length === 0,
		missingFields
	};
}
