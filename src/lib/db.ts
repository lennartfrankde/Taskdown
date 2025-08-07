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
}

export interface Note {
	id?: number;
	title: string;
	content: string;
	createdAt: Date;
	updatedAt: Date;
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
	}
}

// Create database instance
export const db = new TaskdownDB();

// Service class with CRUD methods
export class DatabaseService {
	// Task CRUD operations
	async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
		const now = new Date();
		return await db.tasks.add({
			...task,
			createdAt: now,
			updatedAt: now
		});
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
			return await this.updateTask(id, { done: !task.done });
		}
		throw new Error('Task not found');
	}

	// Note CRUD operations
	async createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
		const now = new Date();
		return await db.notes.add({
			...note,
			createdAt: now,
			updatedAt: now
		});
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
		return await db.embeddings.add(embedding);
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
}

// Export singleton instance of the service
export const dbService = new DatabaseService();
