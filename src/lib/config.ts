// Configuration module for environment variables

// Get PocketBase URL from various sources
function getPocketBaseUrl(): string {
	// Runtime environment variable (for server-side or injected globals)
	if (typeof window !== 'undefined' && (window as any).ENV?.POCKETBASE_URL) {
		return (window as any).ENV.POCKETBASE_URL;
	}

	// Check if we're in localhost development
	if (typeof window !== 'undefined' && window.location.origin.includes('localhost')) {
		return 'http://localhost:8090';
	}

	// Production default - can be overridden via user settings
	return 'http://localhost:8090';
}

export const config = {
	// Default PocketBase URL - users can override this in settings
	get defaultPocketbaseUrl() {
		return getPocketBaseUrl();
	}
};
