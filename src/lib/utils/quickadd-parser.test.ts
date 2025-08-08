import { describe, it, expect } from 'vitest';
import {
	parseTime,
	parseDate,
	parseTags,
	parseQuickAdd,
	validateQuickAdd
} from './quickadd-parser';

describe('QuickAdd Parser', () => {
	describe('parseTime', () => {
		it('should parse valid time format @HH:mm', () => {
			const result = parseTime('Meeting @14:30 with team');
			expect(result.time).toBe('14:30');
			expect(result.remaining).toBe('Meeting with team');
		});

		it('should parse single digit hours', () => {
			const result = parseTime('Call @9:15 tomorrow');
			expect(result.time).toBe('09:15');
			expect(result.remaining).toBe('Call tomorrow');
		});

		it('should handle no time', () => {
			const result = parseTime('Simple task without time');
			expect(result.time).toBeUndefined();
			expect(result.remaining).toBe('Simple task without time');
		});

		it('should validate time ranges', () => {
			const invalidHour = parseTime('Invalid @25:30 time');
			expect(invalidHour.time).toBeUndefined();

			const invalidMinute = parseTime('Invalid @14:61 time');
			expect(invalidMinute.time).toBeUndefined();
		});

		it('should take the first valid time', () => {
			const result = parseTime('Task @10:30 and @15:45');
			expect(result.time).toBe('10:30');
			expect(result.remaining).toBe('Task and @15:45');
		});
	});

	describe('parseDate', () => {
		it('should parse date format @DD.MM', () => {
			const result = parseDate('Meeting @25.12 tomorrow');
			const currentYear = new Date().getFullYear();
			expect(result.date).toBe(`${currentYear}-12-25`);
			expect(result.remaining).toBe('Meeting tomorrow');
		});

		it('should parse date format @DD.MM.YYYY', () => {
			const result = parseDate('Project @15.03.2024 deadline');
			expect(result.date).toBe('2024-03-15');
			expect(result.remaining).toBe('Project deadline');
		});

		it('should handle no date', () => {
			const result = parseDate('Task without date');
			expect(result.date).toBeUndefined();
			expect(result.remaining).toBe('Task without date');
		});

		it('should validate date ranges', () => {
			const invalidDay = parseDate('Invalid @32.12 date');
			expect(invalidDay.date).toBeUndefined();

			const invalidMonth = parseDate('Invalid @15.13 date');
			expect(invalidMonth.date).toBeUndefined();
		});

		it('should handle single digit days and months', () => {
			const result = parseDate('Task @5.3.2024');
			expect(result.date).toBe('2024-03-05');
		});
	});

	describe('parseTags', () => {
		it('should parse single tag', () => {
			const result = parseTags('Important task #urgent');
			expect(result.tags).toEqual(['urgent']);
			expect(result.remaining).toBe('Important task');
		});

		it('should parse multiple tags', () => {
			const result = parseTags('Project #work #important #deadline');
			expect(result.tags).toEqual(['work', 'important', 'deadline']);
			expect(result.remaining).toBe('Project');
		});

		it('should handle no tags', () => {
			const result = parseTags('Simple task');
			expect(result.tags).toEqual([]);
			expect(result.remaining).toBe('Simple task');
		});

		it('should handle tags with numbers and hyphens', () => {
			const result = parseTags('Task #work-item #v2 #test_123');
			expect(result.tags).toEqual(['work-item', 'v2', 'test_123']);
		});

		it('should convert tags to lowercase', () => {
			const result = parseTags('Task #URGENT #Important');
			expect(result.tags).toEqual(['urgent', 'important']);
		});
	});

	describe('parseQuickAdd', () => {
		it('should parse complete input with all elements', () => {
			const result = parseQuickAdd('Meeting with team @14:30 @25.12.2024 #work #important');
			expect(result).toEqual({
				title: 'Meeting with team',
				time: '14:30',
				date: '2024-12-25',
				tags: ['work', 'important']
			});
		});

		it('should parse input with only title', () => {
			const result = parseQuickAdd('Simple task');
			expect(result).toEqual({
				title: 'Simple task',
				time: undefined,
				date: undefined,
				tags: []
			});
		});

		it('should handle mixed order of elements', () => {
			const result = parseQuickAdd('#urgent Call client @9:00 tomorrow @15.03');
			expect(result.title).toBe('Call client tomorrow');
			expect(result.time).toBe('09:00');
			expect(result.date).toContain('-03-15');
			expect(result.tags).toEqual(['urgent']);
		});

		it('should handle empty input', () => {
			const result = parseQuickAdd('');
			expect(result).toEqual({
				title: '',
				time: undefined,
				date: undefined,
				tags: []
			});
		});

		it('should clean up extra spaces', () => {
			const result = parseQuickAdd('   Multiple   spaces   in   title   @10:30   #tag   ');
			expect(result.title).toBe('Multiple spaces in title');
			expect(result.time).toBe('10:30');
			expect(result.tags).toEqual(['tag']);
		});
	});

	describe('validateQuickAdd', () => {
		it('should validate complete task', () => {
			const parsed = {
				title: 'Valid task',
				time: '10:30',
				date: '2024-12-25',
				tags: ['work']
			};
			const result = validateQuickAdd(parsed);
			expect(result.isValid).toBe(true);
			expect(result.missingFields).toEqual([]);
		});

		it('should validate task with only title', () => {
			const parsed = {
				title: 'Simple task',
				tags: []
			};
			const result = validateQuickAdd(parsed);
			expect(result.isValid).toBe(true);
			expect(result.missingFields).toEqual([]);
		});

		it('should detect missing title', () => {
			const parsed = {
				title: '',
				time: '10:30',
				tags: ['work']
			};
			const result = validateQuickAdd(parsed);
			expect(result.isValid).toBe(false);
			expect(result.missingFields).toEqual(['title']);
		});

		it('should detect missing title with only whitespace', () => {
			const parsed = {
				title: '   ',
				tags: []
			};
			const result = validateQuickAdd(parsed);
			expect(result.isValid).toBe(false);
			expect(result.missingFields).toEqual(['title']);
		});
	});
});
