<script lang="ts">
	import { onMount } from 'svelte';
	import { syncService, type SyncStatus } from '$lib/sync';

	let status: SyncStatus = $state(syncService.getStatus());
	let showDetails = $state(false);

	onMount(() => {
		// Subscribe to status changes
		const unsubscribe = syncService.onStatusChange((newStatus) => {
			status = newStatus;
		});

		// Start auto-sync (every 5 minutes)
		syncService.startAutoSync(5);

		return () => {
			unsubscribe();
			syncService.stopAutoSync();
		};
	});

	async function handleManualSync() {
		try {
			await syncService.sync();
		} catch (error) {
			console.error('Manual sync failed:', error);
		}
	}

	function formatLastSync(date?: Date): string {
		if (!date) return 'Nie';
		
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMin = Math.floor(diffMs / (1000 * 60));
		
		if (diffMin < 1) return 'Gerade eben';
		if (diffMin < 60) return `vor ${diffMin} Min`;
		
		const diffHour = Math.floor(diffMin / 60);
		if (diffHour < 24) return `vor ${diffHour} Std`;
		
		const diffDay = Math.floor(diffHour / 24);
		return `vor ${diffDay} Tag${diffDay > 1 ? 'en' : ''}`;
	}

	function getStatusColor(): string {
		if (status.syncInProgress) return 'text-blue-600';
		if (status.error) return 'text-red-600';
		if (status.isOnline) return 'text-green-600';
		return 'text-gray-400';
	}

	function getStatusIcon(): string {
		if (status.syncInProgress) return '🔄';
		if (status.error) return '❌';
		if (status.isOnline) return '✅';
		return '⚪';
	}

	function getStatusText(): string {
		if (status.syncInProgress) return 'Synchronisiert...';
		if (status.error) return 'Sync-Fehler';
		if (status.isOnline) return 'Online';
		return 'Offline';
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
	<div class="flex items-center justify-between">
		<div class="flex items-center space-x-3">
			<span class="text-lg">{getStatusIcon()}</span>
			<div>
				<div class="flex items-center space-x-2">
					<span class="font-medium text-gray-900">PocketBase Sync</span>
					<span class={`text-sm ${getStatusColor()}`}>
						{getStatusText()}
					</span>
				</div>
				<div class="text-sm text-gray-500">
					Letzter Sync: {formatLastSync(status.lastSync)}
				</div>
			</div>
		</div>
		
		<div class="flex items-center space-x-2">
			<button
				type="button"
				onclick={() => showDetails = !showDetails}
				class="text-sm text-gray-500 hover:text-gray-700"
			>
				{showDetails ? 'Weniger' : 'Details'}
			</button>
			
			<button
				type="button"
				onclick={handleManualSync}
				disabled={status.syncInProgress}
				class="rounded bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
			>
				{status.syncInProgress ? 'Läuft...' : 'Sync'}
			</button>
		</div>
	</div>

	{#if showDetails}
		<div class="mt-4 border-t border-gray-100 pt-4">
			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span class="font-medium text-gray-700">Status:</span>
					<span class={getStatusColor()}>
						{status.isOnline ? 'Verbunden' : 'Nicht verbunden'}
					</span>
				</div>
				<div>
					<span class="font-medium text-gray-700">Auto-Sync:</span>
					<span class="text-gray-600">Alle 5 Minuten</span>
				</div>
			</div>

			{#if status.error}
				<div class="mt-3 rounded-md bg-red-50 p-3">
					<div class="text-sm text-red-800">
						<strong>Fehler:</strong> {status.error}
					</div>
				</div>
			{/if}

			<div class="mt-3 text-xs text-gray-500">
				<p>
					• Lokale Änderungen werden automatisch mit PocketBase synchronisiert<br>
					• Bei Konflikten werden lokale Änderungen bevorzugt<br>
					• Sync läuft auch im Hintergrund alle 5 Minuten
				</p>
			</div>
		</div>
	{/if}
</div>