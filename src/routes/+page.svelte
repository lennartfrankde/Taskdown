<script lang="ts">
	import { onMount } from 'svelte';
	import { dbService, type Task } from '$lib/db';

	let tasks: Task[] = [];
	let dbStatus = 'Loading...';

	onMount(async () => {
		try {
			// Test database connection by creating a sample task
			await dbService.createTask({
				title: 'Sample Task',
				tags: ['test'],
				done: false,
				usageCount: 0
			});

			// Fetch all tasks
			tasks = await dbService.getTasks();
			dbStatus = `Database working! Found ${tasks.length} task(s)`;
		} catch (error) {
			dbStatus = `Database error: ${error}`;
		}
	});
</script>

<svelte:head>
	<title>Taskdown - Task Management</title>
</svelte:head>

<div class="container mx-auto max-w-4xl p-4">
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold text-gray-900">Hello Taskdown</h1>
		<p class="text-gray-600">Your task management application with Dexie.js database is ready!</p>
	</div>

	<div class="rounded-lg border bg-white p-6 shadow-sm">
		<h2 class="mb-4 text-xl font-semibold text-gray-800">Database Status</h2>
		<p class="mb-4 text-gray-700">{dbStatus}</p>

		{#if tasks.length > 0}
			<h3 class="mb-3 text-lg font-semibold text-gray-800">Tasks:</h3>
			<div class="space-y-3">
				{#each tasks as task (task.id)}
					<div class="rounded-lg border border-gray-200 p-4">
						<div class="flex items-start justify-between">
							<div>
								<h4 class="font-medium text-gray-900">{task.title}</h4>
								<p class="mt-1 text-sm text-gray-500">
									Created: {task.createdAt.toLocaleString()}
								</p>
								{#if task.usageCount > 0}
									<p class="mt-1 text-sm text-blue-600">
										Usage Count: {task.usageCount}
									</p>
								{/if}
							</div>
							{#if task.tags.length > 0}
								<div class="flex gap-1">
									{#each task.tags as tag, index (index)}
										<span class="inline-block rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
											{tag}
										</span>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
		<h3 class="mb-2 text-lg font-semibold text-blue-900">🗓️ Neu: Tagesplanung</h3>
		<p class="mb-4 text-blue-800">
			Verwalte unerledigte Aufgaben von vorherigen Tagen und erhalte intelligente Vorschläge
			basierend auf deiner Nutzung.
		</p>
		<a
			href="/daily-planning"
			class="inline-block rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
		>
			Zur Tagesplanung →
		</a>
	</div>
</div>
