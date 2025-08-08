import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncService } from './sync';
import type { Task, Note } from './db';

// Mock PocketBase
vi.mock('pocketbase', () => {
	return {
		default: vi.fn().mockImplementation(() => ({
			health: {
				check: vi.fn().mockResolvedValue({})
			},
			collection: vi.fn().mockReturnValue({
				getFullList: vi.fn().mockResolvedValue([]),
				create: vi.fn().mockResolvedValue({ id: 'remote-id' }),
				update: vi.fn().mockResolvedValue({})
			})
		}))
	};
});

// Mock database service
vi.mock('./db', () => ({
	dbService: {
		getTasks: vi.fn().mockResolvedValue([]),
		getNotes: vi.fn().mockResolvedValue([]),
		createTask: vi.fn().mockResolvedValue(1),
		createNote: vi.fn().mockResolvedValue(1),
		updateTask: vi.fn().mockResolvedValue(1),
		updateNote: vi.fn().mockResolvedValue(1)
	}
}));

describe('SyncService', () => {
	let syncService: SyncService;

	beforeEach(() => {
		vi.clearAllMocks();
		syncService = new SyncService();
	});

	it('should initialize with correct default status', () => {
		const status = syncService.getStatus();
		expect(status.syncInProgress).toBe(false);
		expect(status.lastSync).toBeUndefined();
		expect(status.error).toBeUndefined();
	});

	it('should update status when sync starts and ends', async () => {
		const statusUpdates: any[] = [];
		syncService.onStatusChange((status) => {
			statusUpdates.push({ ...status });
		});

		await syncService.sync();

		// Should have at least two updates: sync start and sync end
		expect(statusUpdates.length).toBeGreaterThanOrEqual(2);

		// Check that sync started
		const startUpdate = statusUpdates.find((s) => s.syncInProgress === true);
		expect(startUpdate).toBeDefined();

		// Check final status
		const finalStatus = syncService.getStatus();
		expect(finalStatus.syncInProgress).toBe(false);
		expect(finalStatus.lastSync).toBeInstanceOf(Date);
	});

	it('should handle connection errors gracefully', async () => {
		// Mock a connection failure
		const syncServiceWithError = new SyncService('http://invalid-url');

		const status = syncServiceWithError.getStatus();
		expect(status.isOnline).toBe(false);
	});

	it('should convert task formats correctly', () => {
		const task: Task = {
			id: 1,
			title: 'Test Task',
			tags: ['work'],
			done: false,
			createdAt: new Date('2024-01-01'),
			updatedAt: new Date('2024-01-02'),
			usageCount: 5,
			recurrence: 'daily'
		};

		// Access private method through any
		const syncServiceAny = syncService as any;
		const remoteTask = syncServiceAny.taskToRemote(task);

		expect(remoteTask.title).toBe('Test Task');
		expect(remoteTask.tags).toEqual(['work']);
		expect(remoteTask.done).toBe(false);
		expect(remoteTask.usageCount).toBe(5);
		expect(remoteTask.recurrence).toBe('daily');
	});

	it('should start and stop auto sync', () => {
		const setIntervalSpy = vi.spyOn(global, 'setInterval');
		const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

		syncService.startAutoSync(1); // 1 minute for testing
		expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);

		syncService.stopAutoSync();
		expect(clearIntervalSpy).toHaveBeenCalled();
	});

	it('should handle listener subscription and unsubscription', () => {
		const listener = vi.fn();
		const unsubscribe = syncService.onStatusChange(listener);

		// Trigger a status update
		const syncServiceAny = syncService as any;
		syncServiceAny.updateStatus({ isOnline: true });

		expect(listener).toHaveBeenCalledWith(expect.objectContaining({ isOnline: true }));

		// Unsubscribe and trigger another update
		unsubscribe();
		listener.mockClear();

		syncServiceAny.updateStatus({ isOnline: false });
		expect(listener).not.toHaveBeenCalled();
	});
});
