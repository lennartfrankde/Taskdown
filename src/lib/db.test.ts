import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from '$lib/db';

describe('Recurring Tasks', () => {
	beforeEach(async () => {
		// Clear the database before each test
		await dbService.clearAllData();
	});

	it('should create task with recurrence field', async () => {
		const taskId = await dbService.createTask({
			title: 'Test recurring task',
			tags: [],
			done: false,
			recurrence: 'daily'
		});

		const task = await dbService.getTask(taskId);
		expect(task).toBeDefined();
		expect(task?.recurrence).toBe('daily');
	});

	it('should default to "none" recurrence when not specified', async () => {
		const taskId = await dbService.createTask({
			title: 'Test task without recurrence',
			tags: [],
			done: false
		} as any);

		const task = await dbService.getTask(taskId);
		expect(task).toBeDefined();
		expect(task?.recurrence).toBe('none');
	});

	it('should create new task when marking recurring task as done', async () => {
		// Create a daily recurring task with a specific date
		const taskId = await dbService.createTask({
			title: 'Daily exercise',
			date: '2024-01-01',
			tags: ['health'],
			done: false,
			recurrence: 'daily'
		});

		// Get initial task count
		const initialTasks = await dbService.getTasks();
		expect(initialTasks).toHaveLength(1);

		// Mark task as done
		await dbService.toggleTaskDone(taskId);

		// Check that original task is marked as done
		const originalTask = await dbService.getTask(taskId);
		expect(originalTask?.done).toBe(true);

		// Check that a new task was created
		const allTasks = await dbService.getTasks();
		expect(allTasks).toHaveLength(2);

		// Find the new task (should be the one that's not done)
		const newTask = allTasks.find(task => task.id !== taskId);
		expect(newTask).toBeDefined();
		expect(newTask?.title).toBe('Daily exercise');
		expect(newTask?.done).toBe(false);
		expect(newTask?.recurrence).toBe('daily');
		expect(newTask?.tags).toEqual(['health']);
		expect(newTask?.date).toBe('2024-01-02'); // Should be next day
	});

	it('should create new task with weekly recurrence', async () => {
		const taskId = await dbService.createTask({
			title: 'Weekly meeting',
			date: '2024-01-01',
			time: '10:00',
			tags: ['work'],
			done: false,
			recurrence: 'weekly'
		});

		await dbService.toggleTaskDone(taskId);

		const allTasks = await dbService.getTasks();
		expect(allTasks).toHaveLength(2);

		const newTask = allTasks.find(task => task.id !== taskId);
		expect(newTask?.date).toBe('2024-01-08'); // Should be next week
		expect(newTask?.time).toBe('10:00'); // Should preserve time
	});

	it('should not create new task when non-recurring task is marked as done', async () => {
		const taskId = await dbService.createTask({
			title: 'One-time task',
			tags: [],
			done: false,
			recurrence: 'none'
		});

		await dbService.toggleTaskDone(taskId);

		const allTasks = await dbService.getTasks();
		expect(allTasks).toHaveLength(1);
		expect(allTasks[0].done).toBe(true);
	});

	it('should handle task being marked as undone', async () => {
		const taskId = await dbService.createTask({
			title: 'Daily task',
			date: '2024-01-01',
			tags: [],
			done: true, // Start as done
			recurrence: 'daily'
		});

		// Mark as undone - should not create new task
		await dbService.toggleTaskDone(taskId);

		const allTasks = await dbService.getTasks();
		expect(allTasks).toHaveLength(1);
		expect(allTasks[0].done).toBe(false);
	});
});