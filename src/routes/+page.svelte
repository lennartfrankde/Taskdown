<script lang="ts">
	import { onMount } from 'svelte';
	import { dbService, type Task } from '$lib/db';
	import QuickAdd from '$lib/components/QuickAdd.svelte';

	let tasks: Task[] = $state([]);
	let dbStatus = $state('Loading...');

	onMount(async () => {
		try {
			// Fetch all tasks
			tasks = await dbService.getTasks();
			dbStatus = `Database working! Found ${tasks.length} task(s)`;
		} catch (error) {
			dbStatus = `Database error: ${error}`;
		}
	});

	// Function to refresh tasks list
	async function refreshTasks() {
		try {
			tasks = await dbService.getTasks();
		} catch (error) {
			console.error('Error refreshing tasks:', error);
		}
	}

	// Auto-refresh tasks when page gains focus to catch new tasks
	onMount(() => {
		const handleFocus = () => refreshTasks();
		window.addEventListener('focus', handleFocus);

		// Set up periodic refresh every 5 seconds
		const interval = setInterval(refreshTasks, 5000);

		return () => {
			window.removeEventListener('focus', handleFocus);
			clearInterval(interval);
		};
	});
</script>

<div class="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-900">
	<div class="mx-auto max-w-4xl space-y-8">
		<!-- Header -->
		<div class="text-center">
			<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Taskdown</h1>
			<p class="mt-2 text-gray-600 dark:text-gray-400">Your task management application</p>
		</div>

		<!-- QuickAdd Component -->
		<QuickAdd />

		<!-- Database Status -->
		<div
			class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
		>
			<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Database Status</h2>
			<p class="text-gray-700 dark:text-gray-300">{dbStatus}</p>
		</div>

		<!-- Tasks List -->
		{#if tasks.length > 0}
			<div
				class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
			>
				<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Recent Tasks</h2>
				<div class="space-y-3">
					{#each tasks as task (task.id)}
						<div
							class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700"
						>
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<h3 class="font-medium text-gray-900 dark:text-gray-100">{task.title}</h3>
									<div class="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
										{#if task.date || task.time}
											<div class="flex items-center space-x-4">
												{#if task.date}
													<span class="inline-flex items-center">
														📅 {new Date(task.date).toLocaleDateString()}
													</span>
												{/if}
												{#if task.time}
													<span class="inline-flex items-center">
														🕐 {task.time}
													</span>
												{/if}
											</div>
										{/if}
										{#if task.tags.length > 0}
											<div class="flex flex-wrap gap-1">
												{#each task.tags as tag (tag)}
													<span
														class="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
													>
														#{tag}
													</span>
												{/each}
											</div>
										{/if}
										<div class="text-xs text-gray-500 dark:text-gray-500">
											Created: {task.createdAt.toLocaleString()}
										</div>
									</div>
								</div>
								<div class="ml-4">
									{#if task.done}
										<span
											class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300"
										>
											✓ Done
										</span>
									{:else}
										<span
											class="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
										>
											⏳ Pending
										</span>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
