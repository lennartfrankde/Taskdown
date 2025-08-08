// Authentication service for PocketBase user management

import PocketBase from 'pocketbase';
import { settingsService, type UserSettings } from './settings';

export interface AuthUser {
	id: string;
	email: string;
	username?: string;
	verified: boolean;
	avatar?: string;
	created: string;
	updated: string;
}

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface RegisterCredentials {
	email: string;
	password: string;
	passwordConfirm: string;
	username?: string;
}

export interface AuthStatus {
	isAuthenticated: boolean;
	user?: AuthUser;
	loading: boolean;
	error?: string;
}

class AuthService {
	private pb: PocketBase | null = null;
	private authStatus: AuthStatus = {
		isAuthenticated: false,
		loading: false
	};
	private listeners: ((status: AuthStatus) => void)[] = [];

	constructor() {
		// Initialize PocketBase when needed
		settingsService.onSettingsChange((settings) => {
			this.initializePocketBase(settings);
		});
		
		// Initialize with current settings
		this.initializePocketBase(settingsService.getSettings());
	}

	private initializePocketBase(settings: UserSettings): void {
		const syncUrl = settingsService.getSyncUrl();
		
		if (syncUrl && settings.syncMode !== 'local-only') {
			this.pb = new PocketBase(syncUrl);
			
			// Check if user is already authenticated
			if (this.pb.authStore.isValid) {
				this.updateAuthStatus({
					isAuthenticated: true,
					user: this.pb.authStore.model as AuthUser,
					loading: false
				});
				
				// Update settings with user info
				if (this.pb.authStore.model) {
					settingsService.setUser({
						id: this.pb.authStore.model.id,
						email: this.pb.authStore.model.email,
						username: this.pb.authStore.model.username
					});
				}
			}
		} else {
			this.pb = null;
			this.updateAuthStatus({
				isAuthenticated: false,
				user: undefined,
				loading: false
			});
		}
	}

	// Status management
	getAuthStatus(): AuthStatus {
		return { ...this.authStatus };
	}

	onAuthChange(listener: (status: AuthStatus) => void): () => void {
		this.listeners.push(listener);
		return () => {
			const index = this.listeners.indexOf(listener);
			if (index > -1) {
				this.listeners.splice(index, 1);
			}
		};
	}

	private updateAuthStatus(updates: Partial<AuthStatus>): void {
		this.authStatus = { ...this.authStatus, ...updates };
		this.listeners.forEach(listener => listener(this.authStatus));
	}

	// Authentication methods
	async login(credentials: LoginCredentials): Promise<AuthUser> {
		if (!this.pb) {
			throw new Error('PocketBase not initialized. Please select a sync backend first.');
		}

		try {
			this.updateAuthStatus({ loading: true, error: undefined });

			const authData = await this.pb.collection('users').authWithPassword(
				credentials.email,
				credentials.password
			);

			const user = authData.record as AuthUser;
			
			this.updateAuthStatus({
				isAuthenticated: true,
				user,
				loading: false
			});

			// Update settings
			settingsService.setUser({
				id: user.id,
				email: user.email,
				username: user.username
			});

			return user;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Login failed';
			this.updateAuthStatus({
				loading: false,
				error: errorMessage
			});
			throw error;
		}
	}

	async register(credentials: RegisterCredentials): Promise<AuthUser> {
		if (!this.pb) {
			throw new Error('PocketBase not initialized. Please select a sync backend first.');
		}

		try {
			this.updateAuthStatus({ loading: true, error: undefined });

			// Create user
			const user = await this.pb.collection('users').create({
				email: credentials.email,
				username: credentials.username,
				password: credentials.password,
				passwordConfirm: credentials.passwordConfirm
			});

			// Request email verification (optional)
			try {
				await this.pb.collection('users').requestVerification(credentials.email);
			} catch (error) {
				console.warn('Email verification request failed:', error);
			}

			// Auto-login after registration
			const authData = await this.pb.collection('users').authWithPassword(
				credentials.email,
				credentials.password
			);

			const authUser = authData.record as AuthUser;
			
			this.updateAuthStatus({
				isAuthenticated: true,
				user: authUser,
				loading: false
			});

			// Update settings
			settingsService.setUser({
				id: authUser.id,
				email: authUser.email,
				username: authUser.username
			});

			return authUser;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Registration failed';
			this.updateAuthStatus({
				loading: false,
				error: errorMessage
			});
			throw error;
		}
	}

	async logout(): Promise<void> {
		if (this.pb) {
			this.pb.authStore.clear();
		}
		
		this.updateAuthStatus({
			isAuthenticated: false,
			user: undefined,
			loading: false,
			error: undefined
		});

		// Clear user from settings
		settingsService.clearUser();
	}

	async refreshAuth(): Promise<boolean> {
		if (!this.pb || !this.pb.authStore.isValid) {
			return false;
		}

		try {
			await this.pb.collection('users').authRefresh();
			return true;
		} catch (error) {
			console.warn('Auth refresh failed:', error);
			await this.logout();
			return false;
		}
	}

	// Password management
	async requestPasswordReset(email: string): Promise<void> {
		if (!this.pb) {
			throw new Error('PocketBase not initialized');
		}

		await this.pb.collection('users').requestPasswordReset(email);
	}

	async confirmPasswordReset(token: string, password: string, passwordConfirm: string): Promise<void> {
		if (!this.pb) {
			throw new Error('PocketBase not initialized');
		}

		await this.pb.collection('users').confirmPasswordReset(token, password, passwordConfirm);
	}

	// User profile management
	async updateProfile(updates: { username?: string; email?: string }): Promise<AuthUser> {
		if (!this.pb || !this.authStatus.isAuthenticated || !this.authStatus.user) {
			throw new Error('User not authenticated');
		}

		const updatedUser = await this.pb.collection('users').update(this.authStatus.user.id, updates);
		
		this.updateAuthStatus({
			user: updatedUser as AuthUser
		});

		// Update settings
		settingsService.setUser({
			id: updatedUser.id,
			email: updatedUser.email,
			username: updatedUser.username
		});

		return updatedUser as AuthUser;
	}

	// Utility methods
	getPocketBase(): PocketBase | null {
		return this.pb;
	}

	isReady(): boolean {
		const settings = settingsService.getSettings();
		return settings.syncMode === 'local-only' || this.pb !== null;
	}

	requiresAuthentication(): boolean {
		return settingsService.requiresAuth();
	}
}

// Export singleton instance
export const authService = new AuthService();