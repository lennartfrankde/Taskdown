// Settings service for managing user preferences and sync configuration

export type SyncMode = 'local-only' | 'custom-backend' | 'official-backend';

export interface UserSettings {
	syncMode: SyncMode;
	customBackendUrl?: string;
	userId?: string;
	email?: string;
	username?: string;
	isAuthenticated: boolean;
	lastLoginAt?: Date;
}

export interface SyncPlan {
	name: string;
	description: string;
	features: string[];
	price?: string;
	isRecommended?: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
	syncMode: 'local-only',
	isAuthenticated: false
};

const SYNC_PLANS: Record<SyncMode, SyncPlan> = {
	'local-only': {
		name: 'Nur Lokal',
		description: 'Alle Daten bleiben auf Ihrem Gerät gespeichert.',
		features: [
			'Vollständige Offline-Funktionalität',
			'Keine Internetverbindung erforderlich',
			'Maximaler Datenschutz',
			'Kostenlos'
		]
	},
	'custom-backend': {
		name: 'Eigener Server',
		description: 'Synchronisierung mit Ihrem eigenen PocketBase-Server.',
		features: [
			'Vollständige Kontrolle über Ihre Daten',
			'Synchronisierung zwischen Geräten',
			'Eigene Server-Konfiguration',
			'Kostenlos (eigene Infrastruktur)'
		]
	},
	'official-backend': {
		name: 'Taskdown Cloud',
		description: 'Verwaltete Synchronisierung über unsere offizielle Cloud.',
		features: [
			'Einfache Einrichtung',
			'Automatische Backups',
			'Sichere Synchronisierung',
			'Premium Support'
		],
		price: 'Kostenlos (Beta)',
		isRecommended: true
	}
};

class SettingsService {
	private settings: UserSettings = DEFAULT_SETTINGS;
	private listeners: ((settings: UserSettings) => void)[] = [];
	private storageKey = 'taskdown-settings';

	constructor() {
		this.loadSettings();
	}

	// Settings management
	getSettings(): UserSettings {
		return { ...this.settings };
	}

	updateSettings(updates: Partial<UserSettings>): void {
		this.settings = { ...this.settings, ...updates };
		this.saveSettings();
		this.notifyListeners();
	}

	resetSettings(): void {
		this.settings = { ...DEFAULT_SETTINGS };
		this.saveSettings();
		this.notifyListeners();
	}

	// Subscription management
	onSettingsChange(listener: (settings: UserSettings) => void): () => void {
		this.listeners.push(listener);
		return () => {
			const index = this.listeners.indexOf(listener);
			if (index > -1) {
				this.listeners.splice(index, 1);
			}
		};
	}

	private notifyListeners(): void {
		this.listeners.forEach(listener => listener(this.settings));
	}

	// Persistence
	private loadSettings(): void {
		if (typeof localStorage === 'undefined') {
			// SSR or non-browser environment
			this.settings = { ...DEFAULT_SETTINGS };
			return;
		}

		try {
			const stored = localStorage.getItem(this.storageKey);
			if (stored) {
				const parsed = JSON.parse(stored);
				// Convert date strings back to Date objects
				if (parsed.lastLoginAt) {
					parsed.lastLoginAt = new Date(parsed.lastLoginAt);
				}
				this.settings = { ...DEFAULT_SETTINGS, ...parsed };
			}
		} catch (error) {
			console.warn('Failed to load settings from localStorage:', error);
			this.settings = { ...DEFAULT_SETTINGS };
		}
	}

	private saveSettings(): void {
		if (typeof localStorage === 'undefined') {
			// SSR or non-browser environment
			return;
		}

		try {
			localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
		} catch (error) {
			console.warn('Failed to save settings to localStorage:', error);
		}
	}

	// Authentication helpers
	isLoggedIn(): boolean {
		return this.settings.isAuthenticated && !!this.settings.userId;
	}

	requiresAuth(): boolean {
		return this.settings.syncMode !== 'local-only';
	}

	getSyncUrl(): string | null {
		switch (this.settings.syncMode) {
			case 'local-only':
				return null;
			case 'custom-backend':
				return this.settings.customBackendUrl || null;
			case 'official-backend':
				return 'https://pocketbase.taskdown.app';
			default:
				return null;
		}
	}

	// Plan management
	getSyncPlans(): Record<SyncMode, SyncPlan> {
		return SYNC_PLANS;
	}

	getCurrentPlan(): SyncPlan {
		return SYNC_PLANS[this.settings.syncMode];
	}

	// User management
	setUser(user: { id: string; email?: string; username?: string }): void {
		this.updateSettings({
			userId: user.id,
			email: user.email,
			username: user.username,
			isAuthenticated: true,
			lastLoginAt: new Date()
		});
	}

	clearUser(): void {
		this.updateSettings({
			userId: undefined,
			email: undefined,
			username: undefined,
			isAuthenticated: false,
			lastLoginAt: undefined
		});
	}

	// Migration helper for existing users
	migrateFromLegacySync(): void {
		if (typeof localStorage === 'undefined') {
			// SSR or non-browser environment
			return;
		}

		// If user was using sync before, migrate them to custom backend
		// This preserves backward compatibility
		const wasUsingSyncBefore = localStorage.getItem('pocketbase-last-sync');
		if (wasUsingSyncBefore && this.settings.syncMode === 'local-only') {
			this.updateSettings({
				syncMode: 'custom-backend',
				customBackendUrl: 'http://localhost:8090'
			});
		}
	}
}

// Export singleton instance
export const settingsService = new SettingsService();

// Initialize migration on service load
settingsService.migrateFromLegacySync();