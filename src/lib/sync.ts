import PocketBase from 'pocketbase';
import type { Task, Note } from './db';
import { dbService } from './db';
import { settingsService } from './settings';
import { authService } from './auth';

// PocketBase record interfaces
export interface PBTask {
	id?: string;
	title: string;
	date?: string;
	time?: string;
	tags: string[];
	done: boolean;
	usageCount?: number;
	recurrence?: string;
	created?: string;
	updated?: string;
}

export interface PBNote {
	id?: string;
	title: string;
	content: string;
	created?: string;
	updated?: string;
}

export interface SyncStatus {
	isOnline: boolean;
	lastSync?: Date;
	syncInProgress: boolean;
	error?: string;
	isEnabled: boolean;
	requiresAuth: boolean;
}

export class SyncService {
	private pb: PocketBase | null = null;
	private syncInterval?: number;
	private status: SyncStatus = {
		isOnline: false,
		syncInProgress: false,
		isEnabled: false,
		requiresAuth: false
	};
	private listeners: ((status: SyncStatus) => void)[] = [];

	constructor() {
		// Initialize based on settings
		this.initializeSync();
		
		// Listen for settings changes
		settingsService.onSettingsChange(() => {
			this.initializeSync();
		});

		// Listen for auth changes
		authService.onAuthChange(() => {
			this.updateSyncStatus();
		});
	}

	private initializeSync(): void {
		const settings = settingsService.getSettings();

		if (!settings.syncEnabled) {
			this.pb = null;
			this.updateStatus({
				isEnabled: false,
				requiresAuth: false,
				isOnline: false
			});
			this.stopAutoSync();
		} else if (settings.pocketbaseUrl) {
			this.pb = authService.getPocketBase();
			this.updateStatus({
				isEnabled: true,
				requiresAuth: true
			});
			this.checkConnection();
		}
	}

	private updateSyncStatus(): void {
		const authStatus = authService.getAuthStatus();
		const settings = settingsService.getSettings();
		
		if (!settings.syncEnabled) {
			this.updateStatus({
				isEnabled: false,
				requiresAuth: false,
				isOnline: false
			});
		} else {
			this.updateStatus({
				isEnabled: true,
				requiresAuth: true,
				isOnline: authStatus.isAuthenticated && this.status.isOnline
			});
		}
	}

	// Status management
	getStatus(): SyncStatus {
		return { ...this.status };
	}

	onStatusChange(listener: (status: SyncStatus) => void): () => void {
		this.listeners.push(listener);
		return () => {
			const index = this.listeners.indexOf(listener);
			if (index > -1) {
				this.listeners.splice(index, 1);
			}
		};
	}

	private updateStatus(updates: Partial<SyncStatus>) {
		this.status = { ...this.status, ...updates };
		this.listeners.forEach((listener) => listener(this.status));
	}

	private async checkConnection(): Promise<boolean> {
		if (!this.pb) {
			this.updateStatus({ isOnline: false, error: 'Sync deaktiviert' });
			return false;
		}

		const authStatus = authService.getAuthStatus();
		if (!authStatus.isAuthenticated) {
			this.updateStatus({ isOnline: false, error: 'Anmeldung erforderlich' });
			return false;
		}

		try {
			await this.pb.health.check();
			this.updateStatus({ isOnline: true, error: undefined });
			return true;
		} catch (error) {
			this.updateStatus({
				isOnline: false,
				error: 'PocketBase-Verbindung fehlgeschlagen'
			});
			return false;
		}
	}

	// Convert between local and remote formats
	private taskToRemote(task: Task): PBTask {
		return {
			id: task.remoteId,
			title: task.title,
			date: task.date,
			time: task.time,
			tags: task.tags,
			done: task.done,
			usageCount: task.usageCount || 0,
			recurrence: task.recurrence || 'none'
		};
	}

	private taskFromRemote(pbTask: PBTask, localId?: number): Partial<Task> {
		return {
			id: localId,
			remoteId: pbTask.id,
			title: pbTask.title,
			date: pbTask.date,
			time: pbTask.time,
			tags: pbTask.tags,
			done: pbTask.done,
			usageCount: pbTask.usageCount || 0,
			recurrence: (pbTask.recurrence as Task['recurrence']) || 'none',
			createdAt: pbTask.created ? new Date(pbTask.created) : new Date(),
			updatedAt: pbTask.updated ? new Date(pbTask.updated) : new Date(),
			synced: true,
			lastSyncAt: new Date()
		};
	}

	private noteToRemote(note: Note): PBNote {
		return {
			id: note.remoteId,
			title: note.title,
			content: note.content
		};
	}

	private noteFromRemote(pbNote: PBNote, localId?: number): Partial<Note> {
		return {
			id: localId,
			remoteId: pbNote.id,
			title: pbNote.title,
			content: pbNote.content,
			createdAt: pbNote.created ? new Date(pbNote.created) : new Date(),
			updatedAt: pbNote.updated ? new Date(pbNote.updated) : new Date(),
			synced: true,
			lastSyncAt: new Date()
		};
	}

	// Main sync method
	async sync(): Promise<void> {
		if (this.status.syncInProgress) {
			return;
		}

		const settings = settingsService.getSettings();
		if (!settings.syncEnabled) {
			return; // No sync needed
		}

		if (!this.pb) {
			throw new Error('Sync nicht verfügbar - PocketBase nicht initialisiert');
		}

		const authStatus = authService.getAuthStatus();
		if (!authStatus.isAuthenticated) {
			throw new Error('Anmeldung erforderlich für Synchronisierung');
		}

		try {
			this.updateStatus({ syncInProgress: true, error: undefined });

			const isOnline = await this.checkConnection();
			if (!isOnline) {
				throw new Error('PocketBase-Server nicht verfügbar');
			}

			// Try to sync tasks and notes, handle missing collections gracefully
			await Promise.allSettled([
				this.syncTasks().catch((error) => {
					console.warn('Tasks sync failed (collections may not exist):', error);
					// Don't throw - let sync continue
				}),
				this.syncNotes().catch((error) => {
					console.warn('Notes sync failed (collections may not exist):', error);
					// Don't throw - let sync continue
				})
			]);

			this.updateStatus({
				lastSync: new Date(),
				error: undefined
			});
		} catch (error) {
			this.updateStatus({
				error: error instanceof Error ? error.message : 'Sync fehlgeschlagen'
			});
			throw error;
		} finally {
			this.updateStatus({ syncInProgress: false });
		}
	}

	private async syncTasks(): Promise<void> {
		if (!this.pb) return;

		// Get all local tasks
		const localTasks = await dbService.getTasks();

		// Get all remote tasks (user-specific if authenticated)
		const remoteTasks = await this.pb.collection('tasks').getFullList<PBTask>();

		// Create maps for easier lookup
		const localByRemoteId = new Map<string, Task>();
		const localWithoutRemote: Task[] = [];

		localTasks.forEach((task) => {
			if (task.remoteId) {
				localByRemoteId.set(task.remoteId, task);
			} else {
				localWithoutRemote.push(task);
			}
		});

		const remoteById = new Map<string, PBTask>();
		remoteTasks.forEach((task) => {
			if (task.id) {
				remoteById.set(task.id, task);
			}
		});

		// Sync existing remote tasks
		for (const remoteTask of remoteTasks) {
			if (!remoteTask.id) continue;

			const localTask = localByRemoteId.get(remoteTask.id);

			if (localTask) {
				// Both exist - check which is newer
				const localUpdated = localTask.updatedAt.getTime();
				const remoteUpdated = new Date(remoteTask.updated || 0).getTime();

				if (localUpdated > remoteUpdated) {
					// Local is newer - update remote
					await this.pb.collection('tasks').update(remoteTask.id, this.taskToRemote(localTask));
					await this.markTaskSynced(localTask.id!);
				} else if (remoteUpdated > localUpdated) {
					// Remote is newer - update local
					const updates = this.taskFromRemote(remoteTask, localTask.id);
					await dbService.updateTask(localTask.id!, updates);
				} else {
					// Same time - just mark as synced
					await this.markTaskSynced(localTask.id!);
				}
			} else {
				// Remote only - create local
				const newTask = this.taskFromRemote(remoteTask);
				await dbService.createTask(newTask as Omit<Task, 'id' | 'createdAt' | 'updatedAt'>);
			}
		}

		// Upload local-only tasks
		for (const localTask of localWithoutRemote) {
			try {
				const remoteTask = await this.pb
					.collection('tasks')
					.create<PBTask>(this.taskToRemote(localTask));

				if (remoteTask.id && localTask.id) {
					await dbService.updateTask(localTask.id, {
						remoteId: remoteTask.id,
						synced: true,
						lastSyncAt: new Date()
					});
				}
			} catch (error) {
				console.error('Failed to upload task:', error);
			}
		}
	}

	private async syncNotes(): Promise<void> {
		if (!this.pb) return;

		// Get all local notes
		const localNotes = await dbService.getNotes();

		// Get all remote notes (user-specific if authenticated)
		const remoteNotes = await this.pb.collection('notes').getFullList<PBNote>();

		// Create maps for easier lookup
		const localByRemoteId = new Map<string, Note>();
		const localWithoutRemote: Note[] = [];

		localNotes.forEach((note) => {
			if (note.remoteId) {
				localByRemoteId.set(note.remoteId, note);
			} else {
				localWithoutRemote.push(note);
			}
		});

		const remoteById = new Map<string, PBNote>();
		remoteNotes.forEach((note) => {
			if (note.id) {
				remoteById.set(note.id, note);
			}
		});

		// Sync existing remote notes
		for (const remoteNote of remoteNotes) {
			if (!remoteNote.id) continue;

			const localNote = localByRemoteId.get(remoteNote.id);

			if (localNote) {
				// Both exist - check which is newer
				const localUpdated = localNote.updatedAt.getTime();
				const remoteUpdated = new Date(remoteNote.updated || 0).getTime();

				if (localUpdated > remoteUpdated) {
					// Local is newer - update remote
					await this.pb.collection('notes').update(remoteNote.id, this.noteToRemote(localNote));
					await this.markNoteSynced(localNote.id!);
				} else if (remoteUpdated > localUpdated) {
					// Remote is newer - update local
					const updates = this.noteFromRemote(remoteNote, localNote.id);
					await dbService.updateNote(localNote.id!, updates);
				} else {
					// Same time - just mark as synced
					await this.markNoteSynced(localNote.id!);
				}
			} else {
				// Remote only - create local
				const newNote = this.noteFromRemote(remoteNote);
				await dbService.createNote(newNote as Omit<Note, 'id' | 'createdAt' | 'updatedAt'>);
			}
		}

		// Upload local-only notes
		for (const localNote of localWithoutRemote) {
			try {
				const remoteNote = await this.pb
					.collection('notes')
					.create<PBNote>(this.noteToRemote(localNote));

				if (remoteNote.id && localNote.id) {
					await dbService.updateNote(localNote.id, {
						remoteId: remoteNote.id,
						synced: true,
						lastSyncAt: new Date()
					});
				}
			} catch (error) {
				console.error('Failed to upload note:', error);
			}
		}
	}

	private async markTaskSynced(taskId: number): Promise<void> {
		await dbService.updateTask(taskId, {
			synced: true,
			lastSyncAt: new Date()
		});
	}

	private async markNoteSynced(noteId: number): Promise<void> {
		await dbService.updateNote(noteId, {
			synced: true,
			lastSyncAt: new Date()
		});
	}

	// Automatic sync
	startAutoSync(intervalMinutes: number = 5): void {
		this.stopAutoSync();
		
		const settings = settingsService.getSettings();
		if (!settings.syncEnabled) {
			return; // No auto-sync when sync is disabled
		}
		
		this.syncInterval = window.setInterval(
			async () => {
				try {
					await this.sync();
				} catch (error) {
					console.error('Auto-sync failed:', error);
				}
			},
			intervalMinutes * 60 * 1000
		);
	}

	stopAutoSync(): void {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
			this.syncInterval = undefined;
		}
	}
}

// Export singleton instance
export const syncService = new SyncService();
