<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import SyncSettings from '$lib/components/SyncSettings.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<nav class="border-b bg-white shadow-sm">
		<div class="container mx-auto px-4 py-3">
			<div class="flex items-center justify-between">
				<h1 class="text-xl font-bold text-gray-900">
					<a href="/" class="transition-colors hover:text-blue-600">Taskdown</a>
				</h1>
				<div class="flex items-center gap-4">
					<a href="/" class="text-gray-600 transition-colors hover:text-blue-600"> Home </a>
					<a href="/daily-planning" class="text-gray-600 transition-colors hover:text-blue-600">
						Tagesplanung
					</a>
					<SyncSettings />
				</div>
			</div>
		</div>
	</nav>

	<main>
		{@render children?.()}
	</main>
</div>
