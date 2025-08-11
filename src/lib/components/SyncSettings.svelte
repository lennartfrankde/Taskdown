<script lang="ts">
	import { onMount } from 'svelte';
	import { settingsService, type UserSettings } from '$lib/settings';
	import { authService, type AuthStatus } from '$lib/auth';

	let settings: UserSettings = $state(settingsService.getSettings());
	let authStatus: AuthStatus = $state(authService.getAuthStatus());
	let showModal = $state(false);
	let currentTab: 'settings' | 'login' | 'register' = $state('settings');

	// Form states
	let loginForm = $state({ email: '', password: '' });
	let registerForm = $state({ email: '', password: '', passwordConfirm: '', username: '' });
	let pocketbaseUrl = $state('');

	onMount(() => {
		pocketbaseUrl = settings.pocketbaseUrl;
		
		const unsubscribeSettings = settingsService.onSettingsChange((newSettings) => {
			settings = newSettings;
			pocketbaseUrl = newSettings.pocketbaseUrl;
		});

		const unsubscribeAuth = authService.onAuthChange((newStatus) => {
			authStatus = newStatus;
		});

		return () => {
			unsubscribeSettings();
			unsubscribeAuth();
		};
	});

	function openSettings() {
		showModal = true;
		currentTab = 'settings';
	}

	function closeModal() {
		showModal = false;
		currentTab = 'settings';
	}

	function toggleSync() {
		if (settings.syncEnabled) {
			// Disable sync and logout
			if (authStatus.isAuthenticated) {
				authService.logout();
			}
			settingsService.updateSettings({ syncEnabled: false });
		} else {
			// Enable sync
			settingsService.updateSettings({ 
				syncEnabled: true,
				pocketbaseUrl: pocketbaseUrl 
			});
			// Don't auto-navigate to login, let user choose
		}
	}

	function updatePocketbaseUrl() {
		settingsService.updateSettings({ pocketbaseUrl: pocketbaseUrl });
	}

	async function handleLogin(event: Event) {
		event.preventDefault();
		try {
			await authService.login(loginForm);
			closeModal();
		} catch (error) {
			console.error('Login failed:', error);
		}
	}

	async function handleRegister(event: Event) {
		event.preventDefault();
		try {
			await authService.register(registerForm);
			closeModal();
		} catch (error) {
			console.error('Registration failed:', error);
		}
	}

	async function handleLogout() {
		await authService.logout();
		closeModal();
	}

	function getSyncIcon(): string {
		if (!settings.syncEnabled) return '📱';
		if (authStatus.isAuthenticated) return '☁️';
		return '🔒';
	}

	function getSyncStatusText(): string {
		if (!settings.syncEnabled) return 'Nur Lokal';
		if (authStatus.isAuthenticated) return 'Synchronisiert';
		return 'Anmeldung erforderlich';
	}
</script>

<!-- Settings Button -->
<button
	onclick={openSettings}
	class="flex items-center space-x-2 rounded-lg bg-white px-3 py-2 text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
	title="Sync-Einstellungen"
	aria-label="Sync-Einstellungen öffnen"
>
	<span>{getSyncIcon()}</span>
	<span class="hidden sm:inline">{getSyncStatusText()}</span>
</button>

<!-- Settings Modal -->
{#if showModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
		<div class="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl m-4">
			<div class="border-b border-gray-200 p-6">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-gray-900">Sync-Einstellungen</h2>
					<button
						onclick={closeModal}
						class="text-gray-400 hover:text-gray-600"
						aria-label="Schließen"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<div class="p-6">
				{#if currentTab === 'settings'}
					<div class="space-y-6">
						<div>
							<label class="flex items-center space-x-3">
								<input
									type="checkbox"
									checked={settings.syncEnabled}
									onchange={toggleSync}
									class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
								/>
								<span class="text-sm font-medium text-gray-900">
									Synchronisierung aktivieren
								</span>
							</label>
							<p class="text-sm text-gray-600 mt-1 ml-7">
								Synchronisiert Ihre Daten mit einem PocketBase-Server
							</p>
						</div>

						{#if settings.syncEnabled}
							<div>
								<label for="pocketbase-url" class="block text-sm font-medium text-gray-700 mb-2">
									PocketBase Server URL
								</label>
								<input
									id="pocketbase-url"
									type="url"
									bind:value={pocketbaseUrl}
									placeholder="http://localhost:8090"
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									onblur={updatePocketbaseUrl}
								/>
								<p class="text-xs text-gray-500 mt-1">
									URL Ihres PocketBase-Servers
								</p>
							</div>

							{#if !authStatus.isAuthenticated}
								<div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
									<p class="text-sm text-yellow-800">
										<strong>Anmeldung erforderlich:</strong> 
										Sie müssen sich anmelden, um die Synchronisierung zu nutzen.
									</p>
									<div class="mt-3 flex space-x-2">
										<button
											onclick={() => currentTab = 'login'}
											class="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200"
										>
											Anmelden
										</button>
										<button
											onclick={() => currentTab = 'register'}
											class="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200"
										>
											Registrieren
										</button>
									</div>
								</div>
							{:else}
								<div class="p-4 bg-green-50 border border-green-200 rounded-lg">
									<div class="flex items-center justify-between">
										<div>
											<p class="text-sm text-green-800">
												<strong>Angemeldet als:</strong> {authStatus.user?.email}
											</p>
											<p class="text-xs text-green-600 mt-1">
												Synchronisierung aktiv
											</p>
										</div>
										<button
											onclick={handleLogout}
											class="text-sm text-green-700 hover:text-green-900 underline"
										>
											Abmelden
										</button>
									</div>
								</div>
							{/if}
						{:else}
							<div class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
								<div class="flex items-center space-x-3">
									<span class="text-2xl">📱</span>
									<div>
										<h3 class="font-medium text-gray-900">Nur Lokal</h3>
										<p class="text-sm text-gray-600">
											Alle Daten bleiben auf Ihrem Gerät gespeichert
										</p>
									</div>
								</div>
							</div>
						{/if}
					</div>

				{:else if currentTab === 'login'}
					<div class="space-y-4">
						<div class="text-center mb-6">
							<h3 class="text-lg font-semibold text-gray-900">Anmelden</h3>
							<p class="text-sm text-gray-600 mt-1">
								Melden Sie sich an, um die Synchronisierung zu aktivieren
							</p>
						</div>

						{#if authStatus.error}
							<div class="p-3 bg-red-50 border border-red-200 rounded-md">
								<p class="text-sm text-red-800">{authStatus.error}</p>
							</div>
						{/if}

						<form onsubmit={handleLogin} class="space-y-4">
							<div>
								<label for="login-email" class="block text-sm font-medium text-gray-700 mb-1">
									E-Mail
								</label>
								<input
									id="login-email"
									type="email"
									bind:value={loginForm.email}
									required
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>

							<div>
								<label for="login-password" class="block text-sm font-medium text-gray-700 mb-1">
									Passwort
								</label>
								<input
									id="login-password"
									type="password"
									bind:value={loginForm.password}
									required
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>

							<button
								type="submit"
								disabled={authStatus.loading}
								class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
							>
								{authStatus.loading ? 'Anmelden...' : 'Anmelden'}
							</button>
						</form>

						<div class="text-center">
							<button
								onclick={() => currentTab = 'register'}
								class="text-sm text-blue-600 hover:text-blue-800"
							>
								Noch kein Konto? Registrieren
							</button>
						</div>

						<div class="text-center">
							<button
								onclick={() => currentTab = 'settings'}
								class="text-sm text-gray-500 hover:text-gray-700"
							>
								← Zurück zu den Einstellungen
							</button>
						</div>
					</div>

				{:else if currentTab === 'register'}
					<div class="space-y-4">
						<div class="text-center mb-6">
							<h3 class="text-lg font-semibold text-gray-900">Registrieren</h3>
							<p class="text-sm text-gray-600 mt-1">
								Erstellen Sie ein Konto für die Synchronisierung
							</p>
						</div>

						{#if authStatus.error}
							<div class="p-3 bg-red-50 border border-red-200 rounded-md">
								<p class="text-sm text-red-800">{authStatus.error}</p>
							</div>
						{/if}

						<form onsubmit={handleRegister} class="space-y-4">
							<div>
								<label for="register-email" class="block text-sm font-medium text-gray-700 mb-1">
									E-Mail
								</label>
								<input
									id="register-email"
									type="email"
									bind:value={registerForm.email}
									required
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>

							<div>
								<label for="register-username" class="block text-sm font-medium text-gray-700 mb-1">
									Benutzername (optional)
								</label>
								<input
									id="register-username"
									type="text"
									bind:value={registerForm.username}
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>

							<div>
								<label for="register-password" class="block text-sm font-medium text-gray-700 mb-1">
									Passwort
								</label>
								<input
									id="register-password"
									type="password"
									bind:value={registerForm.password}
									required
									minlength="8"
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>

							<div>
								<label for="register-password-confirm" class="block text-sm font-medium text-gray-700 mb-1">
									Passwort bestätigen
								</label>
								<input
									id="register-password-confirm"
									type="password"
									bind:value={registerForm.passwordConfirm}
									required
									minlength="8"
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>

							<button
								type="submit"
								disabled={authStatus.loading || registerForm.password !== registerForm.passwordConfirm}
								class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
							>
								{authStatus.loading ? 'Registrieren...' : 'Registrieren'}
							</button>
						</form>

						<div class="text-center">
							<button
								onclick={() => currentTab = 'login'}
								class="text-sm text-blue-600 hover:text-blue-800"
							>
								Bereits ein Konto? Anmelden
							</button>
						</div>

						<div class="text-center">
							<button
								onclick={() => currentTab = 'settings'}
								class="text-sm text-gray-500 hover:text-gray-700"
							>
								← Zurück zu den Einstellungen
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}