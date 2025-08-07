<script lang="ts">
	import { dbService, type Task } from '$lib/db';
	import { createEventDispatcher } from 'svelte';

	interface Props {
		onTaskCreated?: () => void;
	}

	let { onTaskCreated }: Props = $props();

	const dispatch = createEventDispatcher<{
		taskCreated: Task;
	}>();

	let title = $state('');
	let date = $state('');
	let time = $state('');
	let tags = $state('');
	let recurrence = $state<'none' | 'daily' | 'weekly' | 'custom'>('none');
	let isLoading = $state(false);

	async function handleSubmit(event: Event) {
		event.preventDefault();
		
		if (!title.trim()) return;
		
		isLoading = true;
		try {
			const taskId = await dbService.createTask({
				title: title.trim(),
				date: date || undefined,
				time: time || undefined,
				tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
				recurrence,
				done: false
			});

			const newTask = await dbService.getTask(taskId);
			if (newTask) {
				dispatch('taskCreated', newTask);
			}

			// Reset form
			title = '';
			date = '';
			time = '';
			tags = '';
			recurrence = 'none';

			if (onTaskCreated) {
				onTaskCreated();
			}
		} catch (error) {
			console.error('Error creating task:', error);
		} finally {
			isLoading = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
	<h2 class="mb-4 text-lg font-semibold text-gray-900">Add New Task</h2>
	
	<div class="space-y-4">
		<div>
			<label for="title" class="block text-sm font-medium text-gray-700">Task Title</label>
			<input
				id="title"
				type="text"
				bind:value={title}
				placeholder="Enter task title..."
				required
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label for="date" class="block text-sm font-medium text-gray-700">Date</label>
				<input
					id="date"
					type="date"
					bind:value={date}
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			</div>
			<div>
				<label for="time" class="block text-sm font-medium text-gray-700">Time</label>
				<input
					id="time"
					type="time"
					bind:value={time}
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			</div>
		</div>

		<div>
			<label for="tags" class="block text-sm font-medium text-gray-700">Tags</label>
			<input
				id="tags"
				type="text"
				bind:value={tags}
				placeholder="tag1, tag2, tag3"
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>
			<p class="mt-1 text-xs text-gray-500">Separate tags with commas</p>
		</div>

		<div>
			<label for="recurrence" class="block text-sm font-medium text-gray-700">Recurrence</label>
			<select
				id="recurrence"
				bind:value={recurrence}
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			>
				<option value="none">No recurrence</option>
				<option value="daily">Daily</option>
				<option value="weekly">Weekly</option>
				<option value="custom">Custom</option>
			</select>
		</div>

		<button
			type="submit"
			disabled={!title.trim() || isLoading}
			class="w-full rounded-md bg-blue-600 px-4 py-2 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
		>
			{isLoading ? 'Creating...' : 'Add Task'}
		</button>
	</div>
</form>