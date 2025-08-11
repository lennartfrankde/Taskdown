// Settings service for managing user preferences and sync configuration

export interface UserSettings {
	syncEnabled: boolean;
	pocketbaseUrl: string;
	userId?: string;
	email?: string;
	username?: string;
	isAuthenticated: boolean;
	lastLoginAt?: Date;
}

const DEFAULT_SETTINGS: UserSettings = {
	syncEnabled: false,
	pocketbaseUrl: 'http://localhost:8090',
	isAuthenticated: false
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
		return this.settings.syncEnabled;
	}

	getSyncUrl(): string | null {
		return this.settings.syncEnabled ? this.settings.pocketbaseUrl : null;
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

		// Migrate from old sync mode system
		const legacySettings = localStorage.getItem('taskdown-settings');
		if (legacySettings) {
			try {
				const parsed = JSON.parse(legacySettings);
				// If user had any sync mode other than local-only, enable sync
				if (parsed.syncMode && parsed.syncMode !== 'local-only') {
					this.updateSettings({
						syncEnabled: true,
						pocketbaseUrl: parsed.customBackendUrl || 'http://localhost:8090'
					});
				}
			} catch (error) {
				console.warn('Failed to migrate legacy settings:', error);
			}
		}
	}
}

// Export singleton instance
export const settingsService = new SettingsService();

// Initialize migration on service load
settingsService.migrateFromLegacySync();