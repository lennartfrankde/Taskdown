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
				done: false
			});

			// Fetch all tasks
			tasks = await dbService.getTasks();
			dbStatus = `Database working! Found ${tasks.length} task(s)`;
		} catch (error) {
			dbStatus = `Database error: ${error}`;
		}
	});
</script>

<h1>Hello Taskdown</h1>
<p>Your task management application with Dexie.js database is ready!</p>

<div class="mt-8">
	<h2 class="mb-4 text-xl font-bold">Database Status</h2>
	<p class="mb-4">{dbStatus}</p>

	{#if tasks.length > 0}
		<h3 class="mb-2 text-lg font-semibold">Tasks:</h3>
		<ul class="space-y-2">
			{#each tasks as task (task.id)}
				<li class="rounded border p-2">
					<strong>{task.title}</strong>
					<span class="ml-2 text-sm text-gray-600">
						(Created: {task.createdAt.toLocaleString()})
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>
