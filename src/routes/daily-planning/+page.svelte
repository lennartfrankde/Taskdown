<script lang="ts">
	import { onMount } from 'svelte';
	import { dbService, type Task } from '$lib/db';

	let previousDayTasks: Task[] = [];
	let suggestions: Task[] = [];
	let isLoading = true;
	let selectedTaskForPostpone: Task | null = null;
	let postponeDate = '';
	let error = '';

	onMount(async () => {
		await loadDailyPlanningData();
	});

	async function loadDailyPlanningData() {
		try {
			isLoading = true;
			error = '';

			// Load uncompleted tasks from previous days
			previousDayTasks = await dbService.getUncompletedTasksFromPreviousDays();

			// Load task suggestions based on usage frequency
			suggestions = await dbService.getTaskSuggestionsByUsage(5);
		} catch (e) {
			error = `Fehler beim Laden der Daten: ${e}`;
		} finally {
			isLoading = false;
		}
	}

	async function scheduleForToday(task: Task) {
		try {
			if (task.id) {
				await dbService.rescheduleTaskToToday(task.id);
				await loadDailyPlanningData();
			}
		} catch (e) {
			error = `Fehler beim Einplanen für heute: ${e}`;
		}
	}

	function openPostponeDialog(task: Task) {
		selectedTaskForPostpone = task;
		// Set minimum date to tomorrow
		const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
		postponeDate = tomorrow.toISOString().split('T')[0];
	}

	function closePostponeDialog() {
		selectedTaskForPostpone = null;
		postponeDate = '';
	}

	async function confirmPostpone() {
		try {
			if (selectedTaskForPostpone?.id && postponeDate) {
				await dbService.rescheduleTaskToDate(selectedTaskForPostpone.id, postponeDate);
				closePostponeDialog();
				await loadDailyPlanningData();
			}
		} catch (e) {
			error = `Fehler beim Verschieben: ${e}`;
		}
	}

	async function createTaskFromSuggestion(suggestionTask: Task) {
		try {
			const today = new Date().toISOString().split('T')[0];
			await dbService.createTask({
				title: suggestionTask.title,
				tags: suggestionTask.tags,
				date: today,
				done: false,
				usageCount: 0
			});
			await loadDailyPlanningData();
		} catch (e) {
			error = `Fehler beim Erstellen der Aufgabe: ${e}`;
		}
	}

	function formatDate(dateString: string | undefined): string {
		if (!dateString) return 'Kein Datum';
		const date = new Date(dateString);
		return date.toLocaleDateString('de-DE');
	}
</script>

<svelte:head>
	<title>Tagesplanung - Taskdown</title>
</svelte:head>

<div class="container mx-auto max-w-4xl p-4">
	<div class="mb-6">
		<h1 class="mb-2 text-3xl font-bold text-gray-900">Tagesplanung</h1>
		<p class="text-gray-600">Verwalte unerledigte Aufgaben und plane deinen Tag</p>
	</div>

	{#if error}
		<div class="mb-4 rounded border border-red-400 bg-red-100 p-4 text-red-700">
			{error}
		</div>
	{/if}

	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<div class="text-gray-600">Lädt...</div>
		</div>
	{:else}
		<!-- Uncompleted tasks from previous days -->
		<div class="mb-8">
			<h2 class="mb-4 text-2xl font-semibold text-gray-800">
				Unerledigte Aufgaben von vorherigen Tagen
			</h2>

			{#if previousDayTasks.length === 0}
				<div class="rounded-lg border border-green-200 bg-green-50 p-4">
					<p class="text-green-800">🎉 Keine unerledigten Aufgaben von vorherigen Tagen!</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each previousDayTasks as task (task.id)}
						<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<h3 class="font-medium text-gray-900">{task.title}</h3>
									<p class="mt-1 text-sm text-gray-500">
										Geplant für: {formatDate(task.date)}
									</p>
									{#if task.tags.length > 0}
										<div class="mt-2 flex gap-1">
											{#each task.tags as tag, index (index)}
												<span
													class="inline-block rounded bg-gray-100 px-2 py-1 text-xs text-gray-700"
												>
													{tag}
												</span>
											{/each}
										</div>
									{/if}
								</div>
								<div class="ml-4 flex gap-2">
									<button
										on:click={() => scheduleForToday(task)}
										class="rounded bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-700"
									>
										Heute einplanen
									</button>
									<button
										on:click={() => openPostponeDialog(task)}
										class="rounded bg-gray-600 px-3 py-1 text-sm text-white transition-colors hover:bg-gray-700"
									>
										Später verschieben
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Task suggestions -->
		<div class="mb-8">
			<h2 class="mb-4 text-2xl font-semibold text-gray-800">Vorschläge basierend auf Häufigkeit</h2>

			{#if suggestions.length === 0}
				<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
					<p class="text-blue-800">
						Noch keine Vorschläge verfügbar. Erledige einige Aufgaben, um Vorschläge zu erhalten.
					</p>
				</div>
			{:else}
				<div class="grid gap-3 md:grid-cols-2">
					{#each suggestions as suggestion (suggestion.id)}
						<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<h3 class="font-medium text-gray-900">{suggestion.title}</h3>
									<p class="mt-1 text-sm text-gray-500">
										Verwendet: {suggestion.usageCount || 0} mal
									</p>
									{#if suggestion.tags.length > 0}
										<div class="mt-2 flex gap-1">
											{#each suggestion.tags as tag, index (index)}
												<span
													class="inline-block rounded bg-gray-100 px-2 py-1 text-xs text-gray-700"
												>
													{tag}
												</span>
											{/each}
										</div>
									{/if}
								</div>
								<button
									on:click={() => createTaskFromSuggestion(suggestion)}
									class="ml-4 rounded bg-green-600 px-3 py-1 text-sm text-white transition-colors hover:bg-green-700"
								>
									Hinzufügen
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Postpone Modal -->
{#if selectedTaskForPostpone}
	<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
		<div class="w-full max-w-md rounded-lg bg-white p-6">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Aufgabe verschieben</h3>

			<div class="mb-4">
				<p class="mb-2 text-gray-700">
					<strong>{selectedTaskForPostpone.title}</strong>
				</p>
				<p class="text-sm text-gray-500">Wähle ein neues Datum für diese Aufgabe:</p>
			</div>

			<div class="mb-6">
				<label for="postpone-date" class="mb-2 block text-sm font-medium text-gray-700">
					Neues Datum
				</label>
				<input
					id="postpone-date"
					type="date"
					bind:value={postponeDate}
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
				/>
			</div>

			<div class="flex gap-3">
				<button
					on:click={confirmPostpone}
					disabled={!postponeDate}
					class="flex-1 rounded bg-blue-600 py-2 text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
				>
					Verschieben
				</button>
				<button
					on:click={closePostponeDialog}
					class="flex-1 rounded bg-gray-300 py-2 text-gray-700 transition-colors hover:bg-gray-400"
				>
					Abbrechen
				</button>
			</div>
		</div>
	</div>
{/if}
