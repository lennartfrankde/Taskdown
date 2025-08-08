<script lang="ts">
	import { onMount } from 'svelte';
	import { settingsService, type SyncMode, type UserSettings } from '$lib/settings';
	import { authService, type AuthStatus } from '$lib/auth';

	let settings: UserSettings = $state(settingsService.getSettings());
	let authStatus: AuthStatus = $state(authService.getAuthStatus());
	let showModal = $state(false);
	let currentTab: 'plans' | 'login' | 'register' = $state('plans');
	let customUrl = $state('');

	// Form states
	let loginForm = $state({ email: '', password: '' });
	let registerForm = $state({ email: '', password: '', passwordConfirm: '', username: '' });

	onMount(() => {
		const unsubscribeSettings = settingsService.onSettingsChange((newSettings) => {
			settings = newSettings;
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
		currentTab = 'plans';
		if (settings.syncMode === 'custom-backend') {
			customUrl = settings.customBackendUrl || '';
		}
	}

	function closeModal() {
		showModal = false;
		currentTab = 'plans';
	}

	function selectSyncMode(mode: SyncMode) {
		if (mode === 'custom-backend') {
			// Show custom URL input
			currentTab = 'plans';
		} else if (mode === 'official-backend') {
			// Need authentication for sync modes
			settingsService.updateSettings({ syncMode: mode });
			currentTab = 'login';
		} else if (mode === 'custom-backend') {
			// Need authentication for sync modes with custom backend
			settingsService.updateSettings({ syncMode: mode });
			if (customUrl) {
				settingsService.updateSettings({ customBackendUrl: customUrl });
			}
			currentTab = 'login';
		} else {
			// Local only mode
			settingsService.updateSettings({ syncMode: mode });
			if (authStatus.isAuthenticated) {
				authService.logout();
			}
			closeModal();
		}
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

	function updateCustomUrl() {
		if (customUrl) {
			settingsService.updateSettings({ 
				syncMode: 'custom-backend',
				customBackendUrl: customUrl 
			});
		}
	}

	function getSyncModeIcon(mode: SyncMode): string {
		switch (mode) {
			case 'local-only': return '📱';
			case 'custom-backend': return '🏠';
			case 'official-backend': return '☁️';
		}
	}

	function getSyncModeColor(mode: SyncMode): string {
		switch (mode) {
			case 'local-only': return 'border-gray-200 bg-gray-50';
			case 'custom-backend': return 'border-blue-200 bg-blue-50';
			case 'official-backend': return 'border-purple-200 bg-purple-50';
		}
	}

	function isCurrentMode(mode: SyncMode): boolean {
		return settings.syncMode === mode;
	}

	const plans = settingsService.getSyncPlans();
</script>

<!-- Settings Button -->
<button
	onclick={openSettings}
	class="flex items-center space-x-2 rounded-lg bg-white px-3 py-2 text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
	title="Sync-Einstellungen"
>
	<span>{getSyncModeIcon(settings.syncMode)}</span>
	<span class="hidden sm:inline">Sync-Einstellungen</span>
</button>

<!-- Settings Modal -->
{#if showModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
		<div class="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl m-4">
			<div class="border-b border-gray-200 p-6">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-gray-900">Synchronisations-Einstellungen</h2>
					<button
						onclick={closeModal}
						class="text-gray-400 hover:text-gray-600"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<div class="p-6">
				{#if currentTab === 'plans'}
					<div class="space-y-4">
						<p class="text-gray-600 mb-6">
							Wählen Sie, wie Ihre Daten synchronisiert werden sollen:
						</p>

						{#each Object.entries(plans) as [mode, plan]}
							<div class={`rounded-lg border-2 p-4 cursor-pointer transition-all ${
								isCurrentMode(mode as SyncMode) 
									? 'border-blue-500 bg-blue-50' 
									: getSyncModeColor(mode as SyncMode)
							} ${plan.isRecommended ? 'ring-2 ring-purple-300' : ''}`}
								onclick={() => selectSyncMode(mode as SyncMode)}
							>
								<div class="flex items-start justify-between">
									<div class="flex items-center space-x-3">
										<span class="text-2xl">{getSyncModeIcon(mode as SyncMode)}</span>
										<div>
											<h3 class="font-semibold text-gray-900 flex items-center space-x-2">
												<span>{plan.name}</span>
												{#if plan.isRecommended}
													<span class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
														Empfohlen
													</span>
												{/if}
											</h3>
											<p class="text-sm text-gray-600 mt-1">{plan.description}</p>
										</div>
									</div>
									{#if plan.price}
										<span class="text-sm font-medium text-gray-900">{plan.price}</span>
									{/if}
								</div>

								<ul class="mt-3 space-y-1">
									{#each plan.features as feature}
										<li class="text-sm text-gray-600 flex items-center space-x-2">
											<svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
											<span>{feature}</span>
										</li>
									{/each}
								</ul>

								{#if mode === 'custom-backend'}
									<div class="mt-4">
										<label class="block text-sm font-medium text-gray-700 mb-2">
											PocketBase Server URL
										</label>
										<input
											type="url"
											bind:value={customUrl}
											placeholder="http://localhost:8090"
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											onclick={(e) => e.stopPropagation()}
											onblur={updateCustomUrl}
										/>
									</div>
								{/if}
							</div>
						{/each}

						{#if settings.syncMode !== 'local-only' && !authStatus.isAuthenticated}
							<div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
								<p class="text-sm text-yellow-800">
									<strong>Anmeldung erforderlich:</strong> 
									Für die Synchronisierung müssen Sie sich anmelden oder registrieren.
								</p>
							</div>
						{/if}

						{#if authStatus.isAuthenticated}
							<div class="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm text-green-800">
											<strong>Angemeldet als:</strong> {authStatus.user?.email}
										</p>
										<p class="text-xs text-green-600 mt-1">
											Sync-Modus: {plans[settings.syncMode].name}
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
								<label class="block text-sm font-medium text-gray-700 mb-1">
									E-Mail
								</label>
								<input
									type="email"
									bind:value={loginForm.email}
									required
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>

							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">
									Passwort
								</label>
								<input
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
								onclick={() => currentTab = 'plans'}
								class="text-sm text-gray-500 hover:text-gray-700"
							>
								← Zurück zur Auswahl
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
								<label class="block text-sm font-medium text-gray-700 mb-1">
									E-Mail
								</label>
								<input
									type="email"
									bind:value={registerForm.email}
									required
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>

							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">
									Benutzername (optional)
								</label>
								<input
									type="text"
									bind:value={registerForm.username}
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>

							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">
									Passwort
								</label>
								<input
									type="password"
									bind:value={registerForm.password}
									required
									minlength="8"
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>

							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">
									Passwort bestätigen
								</label>
								<input
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
								onclick={() => currentTab = 'plans'}
								class="text-sm text-gray-500 hover:text-gray-700"
							>
								← Zurück zur Auswahl
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}