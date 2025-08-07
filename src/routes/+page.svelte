<script lang="ts">
	import { onMount } from 'svelte';
	import { dbService, type Task } from '$lib/db';
	import QuickAdd from '$lib/components/QuickAdd.svelte';
	import TaskList from '$lib/components/TaskList.svelte';

	let tasks: Task[] = [];
	let dbStatus = 'Loading...';
	let isInitialized = false;

	async function loadTasks() {
		try {
			tasks = await dbService.getTasks();
		} catch (error) {
			console.error('Error loading tasks:', error);
		}
	}

	onMount(async () => {
		try {
			// Check if we already have tasks, if not create a sample
			const existingTasks = await dbService.getTasks();
			if (existingTasks.length === 0) {
				await dbService.createTask({
					title: 'Welcome to Taskdown! This is a sample task.',
					tags: ['sample'],
					done: false,
					recurrence: 'none'
				});
			}

			await loadTasks();
			dbStatus = `Database working! Found ${tasks.length} task(s)`;
			isInitialized = true;
		} catch (error) {
			dbStatus = `Database error: ${error}`;
		}
	});

	function handleTaskCreated() {
		loadTasks();
	}

	function handleTaskUpdated() {
		loadTasks();
	}
</script>

<div class="min-h-screen bg-gray-50 p-4">
	<div class="mx-auto max-w-4xl">
		<header class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900">Taskdown</h1>
			<p class="mt-2 text-gray-600">Your task management application with recurring tasks</p>
		</header>

		<div class="space-y-8">
			<!-- Status indicator -->
			<div class="rounded-md bg-green-50 p-4">
				<div class="flex">
					<div class="flex-shrink-0">
						<svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
						</svg>
					</div>
					<div class="ml-3">
						<p class="text-sm font-medium text-green-800">{dbStatus}</p>
					</div>
				</div>
			</div>

			<!-- Quick Add Form -->
			{#if isInitialized}
				<QuickAdd onTaskCreated={handleTaskCreated} />
			{/if}

			<!-- Task List -->
			{#if isInitialized}
				<div>
					<h2 class="mb-4 text-xl font-semibold text-gray-900">Your Tasks</h2>
					<TaskList {tasks} on:taskUpdated={handleTaskUpdated} />
				</div>
			{/if}
		</div>
	</div>
</div>
