import Dexie, { type EntityTable } from 'dexie';

// Define interfaces for our database tables
export interface Task {
	id?: number;
	title: string;
	date?: string;
	time?: string;
	tags: string[];
	createdAt: Date;
	updatedAt: Date;
	done: boolean;
	usageCount?: number;
	recurrence?: 'none' | 'daily' | 'weekly' | 'custom';
	// Sync fields
	remoteId?: string;
	synced?: boolean;
	lastSyncAt?: Date;
}

export interface Note {
	id?: number;
	title: string;
	content: string;
	createdAt: Date;
	updatedAt: Date;
	// Sync fields
	remoteId?: string;
	synced?: boolean;
	lastSyncAt?: Date;
}

export interface Embedding {
	id?: number;
	taskId?: number;
	noteId?: number;
	vector: number[];
}

// Define the database schema
export class TaskdownDB extends Dexie {
	tasks!: EntityTable<Task, 'id'>;
	notes!: EntityTable<Note, 'id'>;
	embeddings!: EntityTable<Embedding, 'id'>;

	constructor() {
		super('TaskdownDatabase');

		this.version(1).stores({
			tasks: '++id, title, date, time, tags, createdAt, updatedAt, done',
			notes: '++id, title, content, createdAt, updatedAt',
			embeddings: '++id, taskId, noteId, vector'
		});

		// Add recurrence field in version 2
		this.version(2).stores({
			tasks: '++id, title, date, time, tags, createdAt, updatedAt, done, recurrence',
			notes: '++id, title, content, createdAt, updatedAt',
			embeddings: '++id, taskId, noteId, vector'
		}).upgrade(trans => {
			// Set default recurrence value for existing tasks
			return trans.table('tasks').toCollection().modify(task => {
				task.recurrence = 'none';
			});
		});

		// Add usageCount field in version 3
		this.version(3).stores({
			tasks: '++id, title, date, time, tags, createdAt, updatedAt, done, recurrence, usageCount',
			notes: '++id, title, content, createdAt, updatedAt',
			embeddings: '++id, taskId, noteId, vector'
		}).upgrade(trans => {
			// Set default usageCount value for existing tasks
			return trans.table('tasks').toCollection().modify(task => {
				task.usageCount = 0;
			});
		});

		// Add sync fields in version 4
		this.version(4).stores({
			tasks: '++id, title, date, time, tags, createdAt, updatedAt, done, recurrence, usageCount, remoteId, synced, lastSyncAt',
			notes: '++id, title, content, createdAt, updatedAt, remoteId, synced, lastSyncAt',
			embeddings: '++id, taskId, noteId, vector'
		}).upgrade(trans => {
			// Set default sync values for existing tasks and notes
			return Promise.all([
				trans.table('tasks').toCollection().modify(task => {
					task.synced = false;
					task.lastSyncAt = null;
				}),
				trans.table('notes').toCollection().modify(note => {
					note.synced = false;
					note.lastSyncAt = null;
				})
			]);
		});
	}
}

// Create database instance
export const db = new TaskdownDB();

// Service class with CRUD methods
export class DatabaseService {
	// Task CRUD operations
	async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
		const now = new Date();
		const taskWithDefaults = {
			...task,
			usageCount: task.usageCount || 0,
			recurrence: task.recurrence || 'none',
			createdAt: now,
			updatedAt: now
		};
		return await db.tasks.add(taskWithDefaults) as number;
	}

	async getTasks(): Promise<Task[]> {
		return await db.tasks.orderBy('createdAt').reverse().toArray();
	}

	async getTask(id: number): Promise<Task | undefined> {
		return await db.tasks.get(id);
	}

	async updateTask(id: number, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<number> {
		const updateData = {
			...updates,
			updatedAt: new Date()
		};
		return await db.tasks.update(id, updateData);
	}

	async deleteTask(id: number): Promise<void> {
		await db.tasks.delete(id);
		// Also delete related embeddings
		await db.embeddings.where('taskId').equals(id).delete();
	}

	async toggleTaskDone(id: number): Promise<number> {
		const task = await this.getTask(id);
		if (task) {
			const updates: Partial<Task> = { done: !task.done };
			
			// Increment usage count when task is completed
			if (!task.done) {
				updates.usageCount = (task.usageCount || 0) + 1;
			}
			
			// Mark the current task as done
			const updateResult = await this.updateTask(id, updates);
			
			// If the task is being marked as done and has recurrence, create a new task
			if (!task.done && task.recurrence && task.recurrence !== 'none') {
				await this.createRecurringTask(task);
			}
			
			return updateResult;
		}
		throw new Error('Task not found');
	}

	private calculateNextDate(currentDate: string | undefined, recurrence: string): string {
		const today = new Date();
		let nextDate = new Date(today);

		// If task has a specific date, use it as base, otherwise use today
		if (currentDate) {
			const taskDate = new Date(currentDate);
			if (!isNaN(taskDate.getTime())) {
				nextDate = new Date(taskDate);
			}
		}

		switch (recurrence) {
			case 'daily':
				nextDate.setDate(nextDate.getDate() + 1);
				break;
			case 'weekly':
				nextDate.setDate(nextDate.getDate() + 7);
				break;
			case 'custom':
				// For now, default to weekly for custom (can be extended later)
				nextDate.setDate(nextDate.getDate() + 7);
				break;
			default:
				// Should not happen, but fallback to tomorrow
				nextDate.setDate(nextDate.getDate() + 1);
		}

		return nextDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
	}

	private async createRecurringTask(originalTask: Task): Promise<void> {
		const nextDate = this.calculateNextDate(originalTask.date, originalTask.recurrence || 'none');
		
		await this.createTask({
			title: originalTask.title,
			date: nextDate,
			time: originalTask.time,
			tags: [...originalTask.tags],
			recurrence: originalTask.recurrence || 'none',
			usageCount: 0,
			done: false
		});
	}

	// Note CRUD operations
	async createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
		const now = new Date();
		return await db.notes.add({
			...note,
			createdAt: now,
			updatedAt: now
		}) as number;
	}

	async getNotes(): Promise<Note[]> {
		return await db.notes.orderBy('createdAt').reverse().toArray();
	}

	async getNote(id: number): Promise<Note | undefined> {
		return await db.notes.get(id);
	}

	async updateNote(id: number, updates: Partial<Omit<Note, 'id' | 'createdAt'>>): Promise<number> {
		const updateData = {
			...updates,
			updatedAt: new Date()
		};
		return await db.notes.update(id, updateData);
	}

	async deleteNote(id: number): Promise<void> {
		await db.notes.delete(id);
		// Also delete related embeddings
		await db.embeddings.where('noteId').equals(id).delete();
	}

	// Embedding CRUD operations
	async createEmbedding(embedding: Omit<Embedding, 'id'>): Promise<number> {
		return await db.embeddings.add(embedding) as number;
	}

	async getEmbeddings(): Promise<Embedding[]> {
		return await db.embeddings.toArray();
	}

	async getEmbeddingsByTask(taskId: number): Promise<Embedding[]> {
		return await db.embeddings.where('taskId').equals(taskId).toArray();
	}

	async getEmbeddingsByNote(noteId: number): Promise<Embedding[]> {
		return await db.embeddings.where('noteId').equals(noteId).toArray();
	}

	async deleteEmbedding(id: number): Promise<void> {
		await db.embeddings.delete(id);
	}

	// Utility methods
	async clearAllData(): Promise<void> {
		await db.transaction('rw', [db.tasks, db.notes, db.embeddings], async () => {
			await db.tasks.clear();
			await db.notes.clear();
			await db.embeddings.clear();
		});
	}

	async getTasksWithTags(tags: string[]): Promise<Task[]> {
		return await db.tasks.filter((task) => tags.some((tag) => task.tags.includes(tag))).toArray();
	}

	async searchNotes(query: string): Promise<Note[]> {
		const searchTerm = query.toLowerCase();
		return await db.notes
			.filter(
				(note) =>
					note.title.toLowerCase().includes(searchTerm) ||
					note.content.toLowerCase().includes(searchTerm)
			)
			.toArray();
	}

	// Daily Planning specific methods
	async getUncompletedTasksFromDate(date: Date): Promise<Task[]> {
		const dateString = date.toISOString().split('T')[0];
		return await db.tasks.filter((task) => !task.done && task.date === dateString).toArray();
	}

	async getUncompletedTasksFromPreviousDays(): Promise<Task[]> {
		const today = new Date();
		const todayString = today.toISOString().split('T')[0];

		return await db.tasks
			.filter((task) => !task.done && task.date != null && task.date < todayString)
			.toArray();
	}

	async getTaskSuggestionsByUsage(limit: number = 5): Promise<Task[]> {
		return await db.tasks
			.orderBy('usageCount')
			.reverse()
			.filter((task) => (task.usageCount || 0) > 0)
			.limit(limit)
			.toArray();
	}

	async rescheduleTaskToToday(id: number): Promise<number> {
		const today = new Date().toISOString().split('T')[0];
		const task = await this.getTask(id);
		if (task) {
			const updates: Partial<Task> = {
				date: today,
				usageCount: (task.usageCount || 0) + 1
			};
			return await this.updateTask(id, updates);
		}
		throw new Error('Task not found');
	}

	async rescheduleTaskToDate(id: number, newDate: string): Promise<number> {
		const task = await this.getTask(id);
		if (task) {
			const updates: Partial<Task> = {
				date: newDate,
				usageCount: (task.usageCount || 0) + 1
			};
			return await this.updateTask(id, updates);
		}
		throw new Error('Task not found');
	}
}

// Export singleton instance of the service
export const dbService = new DatabaseService();
