<script lang="ts">
	import { dbService, type Task } from '$lib/db';
	import { createEventDispatcher } from 'svelte';

	interface Props {
		tasks: Task[];
	}

	let { tasks }: Props = $props();

	const dispatch = createEventDispatcher<{
		taskUpdated: void;
	}>();

	async function toggleTaskDone(taskId: number | undefined) {
		if (!taskId) return;

		try {
			await dbService.toggleTaskDone(taskId);
			dispatch('taskUpdated');
		} catch (error) {
			console.error('Error toggling task:', error);
		}
	}

	function formatDate(dateString: string | undefined): string {
		if (!dateString) return '';
		try {
			return new Date(dateString).toLocaleDateString();
		} catch {
			return dateString;
		}
	}

	function getRecurrenceLabel(recurrence: string): string {
		switch (recurrence) {
			case 'daily':
				return '🔄 Daily';
			case 'weekly':
				return '🔄 Weekly';
			case 'custom':
				return '🔄 Custom';
			default:
				return '';
		}
	}
</script>

<div class="space-y-3">
	{#each tasks as task (task.id)}
		<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div class="flex items-start justify-between">
				<div class="flex items-start space-x-3">
					<input
						type="checkbox"
						checked={task.done}
						onchange={() => toggleTaskDone(task.id)}
						class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
					/>
					<div class="flex-1">
						<h3
							class="text-base font-medium {task.done
								? 'text-gray-500 line-through'
								: 'text-gray-900'}"
						>
							{task.title}
						</h3>

						<div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
							{#if task.date}
								<span class="inline-flex items-center">
									📅 {formatDate(task.date)}
								</span>
							{/if}

							{#if task.time}
								<span class="inline-flex items-center">
									🕐 {task.time}
								</span>
							{/if}

							{#if task.recurrence && task.recurrence !== 'none'}
								<span
									class="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
								>
									{getRecurrenceLabel(task.recurrence)}
								</span>
							{/if}
						</div>

						{#if task.tags.length > 0}
							<div class="mt-2 flex flex-wrap gap-1">
								{#each task.tags as tag}
									<span
										class="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800"
									>
										#{tag}
									</span>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<div class="text-xs text-gray-400">
					{task.createdAt.toLocaleDateString()}
				</div>
			</div>
		</div>
	{/each}

	{#if tasks.length === 0}
		<div class="py-8 text-center text-gray-500">
			<p class="text-lg">No tasks yet</p>
			<p class="text-sm">Create your first task above!</p>
		</div>
	{/if}
</div>
