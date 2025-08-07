<script lang="ts">
	import { dbService } from '$lib/db';
	import { parseQuickAdd, validateQuickAdd } from '$lib/utils/quickadd-parser';

	// Component state
	let inputValue = $state('');
	let isLoading = $state(false);
	let feedback = $state('');
	let feedbackType = $state<'success' | 'error' | 'info'>('info');

	// Track parsed content for real-time feedback
	let parsedContent = $derived(parseQuickAdd(inputValue));

	// Show preview of what will be parsed
	let previewText = $derived.by(() => {
		if (!inputValue.trim()) return '';

		const parts: string[] = [];
		if (parsedContent.title) parts.push(`Title: "${parsedContent.title}"`);
		if (parsedContent.time) parts.push(`Time: ${parsedContent.time}`);
		if (parsedContent.date) parts.push(`Date: ${parsedContent.date}`);
		if (parsedContent.tags.length > 0) parts.push(`Tags: ${parsedContent.tags.join(', ')}`);

		return parts.join(' • ');
	});

	async function handleSubmit() {
		if (isLoading) return;

		const parsed = parseQuickAdd(inputValue);
		const validation = validateQuickAdd(parsed);

		if (!validation.isValid) {
			feedback = `Missing required fields: ${validation.missingFields.join(', ')}`;
			feedbackType = 'error';
			return;
		}

		try {
			isLoading = true;
			feedback = '';

			// Create the task using the database service
			await dbService.createTask({
				title: parsed.title,
				date: parsed.date,
				time: parsed.time,
				tags: parsed.tags,
				done: false
			});

			// Success feedback
			feedback = 'Task created successfully!';
			feedbackType = 'success';

			// Clear input after successful creation
			inputValue = '';

			// Clear success message after a short delay
			setTimeout(() => {
				feedback = '';
			}, 2000);
		} catch (error) {
			feedback = `Error creating task: ${error}`;
			feedbackType = 'error';
		} finally {
			isLoading = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSubmit();
		}
	}
</script>

<div class="mx-auto w-full max-w-2xl">
	<!-- Title -->
	<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Quick Add Task</h2>

	<!-- Input field -->
	<div class="relative mb-4">
		<input
			bind:value={inputValue}
			onkeydown={handleKeydown}
			placeholder="Enter task... (@14:30 for time, @25.12 for date, #tag for tags)"
			disabled={isLoading}
			class="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
		/>

		<!-- Submit button -->
		<button
			onclick={handleSubmit}
			disabled={isLoading || !inputValue.trim()}
			class="absolute top-1/2 right-2 -translate-y-1/2 transform rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-600"
		>
			{isLoading ? 'Adding...' : 'Add'}
		</button>
	</div>

	<!-- Live preview -->
	{#if previewText}
		<div
			class="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
		>
			<div class="mb-1 text-sm text-gray-600 dark:text-gray-400">Preview:</div>
			<div class="text-sm text-gray-800 dark:text-gray-200">{previewText}</div>
		</div>
	{/if}

	<!-- Feedback message -->
	{#if feedback}
		<div
			class="rounded-lg p-3 text-sm {feedbackType === 'success'
				? 'border border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300'
				: feedbackType === 'error'
					? 'border border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'
					: 'border border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300'}"
		>
			{feedback}
		</div>
	{/if}

	<!-- Help text -->
	<div class="mt-4 space-y-1 text-xs text-gray-500 dark:text-gray-400">
		<div><strong>Quick formats:</strong></div>
		<div>• Time: @14:30 or @9:15</div>
		<div>• Date: @25.12 or @25.12.2024</div>
		<div>• Tags: #work #important #urgent</div>
		<div>• Example: "Call client @10:30 @15.03.2024 #work #important"</div>
	</div>
</div>
