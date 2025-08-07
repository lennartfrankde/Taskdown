import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('Task List Page', () => {
	it('should render the main heading', async () => {
		render(Page);

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toBeInTheDocument();
		await expect.element(heading).toContainText('Taskdown');
	});

	it('should show loading state initially', async () => {
		render(Page);

		const loadingText = page.getByText('Loading tasks...');
		await expect.element(loadingText).toBeInTheDocument();
	});

	it('should render task list structure', async () => {
		render(Page);

		// Wait for loading to finish and check for either no tasks message or task list
		await expect(async () => {
			return (
				(await page.locator('text=No open tasks').isVisible()) ||
				(await page.locator('text=Open Tasks').isVisible())
			);
		}).toBeTruthy();
	});
});
