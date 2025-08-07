<script lang="ts">
	import { onMount } from 'svelte';
	import { dbService, type Task } from '$lib/db';

	let allTasks = $state<Task[]>([]);
	let openTasks = $state<Task[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	function getTaskDateTime(task: Task): Date {
		if (task.date) {
			const dateStr = task.time ? `${task.date} ${task.time}` : task.date;
			const parsed = new Date(dateStr);
			return isNaN(parsed.getTime()) ? task.createdAt : parsed;
		}
		return task.createdAt;
	}

	function updateOpenTasks() {
		const filtered = allTasks.filter((task) => !task.done);
		const sorted = filtered.sort((a, b) => {
			// Sort by date and time if available, otherwise by creation date
			const aDateTime = getTaskDateTime(a);
			const bDateTime = getTaskDateTime(b);
			return aDateTime.getTime() - bDateTime.getTime();
		});
		openTasks = sorted;
	}

	async function loadTasks() {
		try {
			isLoading = true;
			error = null;
			allTasks = await dbService.getTasks();
			updateOpenTasks();
		} catch (err) {
			error = `Error loading tasks: ${err}`;
			console.error('Failed to load tasks:', err);
		} finally {
			isLoading = false;
		}
	}

	async function toggleTask(task: Task) {
		if (!task.id) return;

		try {
			await dbService.toggleTaskDone(task.id);
			// Reload tasks to reflect the change
			await loadTasks();
		} catch (err) {
			error = `Error updating task: ${err}`;
			console.error('Failed to toggle task:', err);
		}
	}

	onMount(() => {
		loadTasks();
	});
</script>

<div class="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-2xl">
		<header class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900 sm:text-4xl">Taskdown</h1>
			<p class="mt-2 text-gray-600">Manage your tasks efficiently</p>
		</header>

		<main>
			{#if error}
				<div class="mb-6 rounded-md bg-red-50 p-4">
					<div class="flex">
						<div class="ml-3">
							<h3 class="text-sm font-medium text-red-800">Error</h3>
							<div class="mt-2 text-sm text-red-700">
								<p>{error}</p>
							</div>
						</div>
					</div>
				</div>
			{/if}

			{#if isLoading}
				<div class="flex items-center justify-center py-8">
					<div class="text-gray-500">Loading tasks...</div>
				</div>
			{:else if openTasks.length === 0}
				<div class="rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 text-center">
					<h3 class="text-lg font-medium text-gray-900">No open tasks</h3>
					<p class="mt-2 text-sm text-gray-500">All tasks are completed or none exist yet.</p>
				</div>
			{:else}
				<div class="space-y-4">
					<h2 class="text-xl font-semibold text-gray-900">
						Open Tasks ({openTasks.length})
					</h2>

					<ul class="divide-y divide-gray-200 rounded-lg bg-white shadow">
						{#each openTasks as task (task.id)}
							<li class="px-4 py-4 sm:px-6">
								<div class="flex items-start space-x-3">
									<div class="flex-shrink-0">
										<input
											type="checkbox"
											checked={task.done}
											onchange={() => toggleTask(task)}
											class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
											aria-label="Mark task as complete"
										/>
									</div>
									<div class="min-w-0 flex-1">
										<div class="text-sm font-medium text-gray-900">
											{task.title}
										</div>
										<div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
											{#if task.date || task.time}
												<span class="flex items-center">
													<svg
														class="mr-1 h-4 w-4"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
														></path>
													</svg>
													{task.date ? task.date : ''}
													{task.time ? ` ${task.time}` : ''}
												</span>
											{/if}
											{#if task.tags.length > 0}
												<div class="flex flex-wrap gap-1">
													{#each task.tags as tag, index (index)}
														<span
															class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
														>
															{tag}
														</span>
													{/each}
												</div>
											{/if}
										</div>
									</div>
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</main>
	</div>
</div>
