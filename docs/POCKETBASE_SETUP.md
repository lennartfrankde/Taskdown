# PocketBase Setup for Taskdown Sync

This document explains how to set up PocketBase collections to enable synchronization with the Taskdown application.

## Quick Setup

### 1. Start PocketBase

For development:

```bash
npm run services:start
```

This will start PocketBase at `http://localhost:8090`.

### 2. Access PocketBase Admin

1. Open `http://localhost:8090/_/` in your browser
2. Create an admin account if this is your first time
3. Log in to the PocketBase admin interface

### 3. Create Collections

You need to create two collections: `tasks` and `notes`.

#### Tasks Collection

1. Go to "Collections" in the admin interface
2. Click "New collection"
3. Set the collection name to `tasks`
4. Add the following fields:

| Field Name   | Type   | Required | Options                                      |
| ------------ | ------ | -------- | -------------------------------------------- |
| `title`      | Text   | Yes      | -                                            |
| `date`       | Text   | No       | -                                            |
| `time`       | Text   | No       | -                                            |
| `tags`       | JSON   | No       | -                                            |
| `done`       | Bool   | Yes      | Default: false                               |
| `usageCount` | Number | No       | Default: 0                                   |
| `recurrence` | Select | No       | Options: "none", "daily", "weekly", "custom" |

#### Notes Collection

1. Click "New collection" again
2. Set the collection name to `notes`
3. Add the following fields:

| Field Name | Type   | Required | Options |
| ---------- | ------ | -------- | ------- |
| `title`    | Text   | Yes      | -       |
| `content`  | Editor | No       | -       |

### 4. Configure API Rules (Optional)

By default, PocketBase requires authentication for all operations. For testing or if you want to allow anonymous access, you can modify the API rules:

1. Go to each collection
2. Click on the "API Rules" tab
3. Set the rules according to your security requirements

For development/testing (⚠️ **Not recommended for production**):

- List/Search: `@request.auth.id != ""`
- View: `@request.auth.id != ""`
- Create: `@request.auth.id != ""`
- Update: `@request.auth.id != ""`
- Delete: `@request.auth.id != ""`

## Environment Configuration

### Development

The sync service automatically connects to `http://localhost:8090` when running locally.

### Production

Set the PocketBase URL using environment variables:

```bash
# During build time
VITE_POCKETBASE_URL=https://your-pocketbase-server.com
```

Or in your `.env` file:

```env
VITE_POCKETBASE_URL=https://your-pocketbase-server.com
```

### Runtime Configuration

You can also pass the URL directly when creating the sync service:

```typescript
import { SyncService } from '$lib/sync';

const syncService = new SyncService('https://your-pocketbase-server.com');
```

## Collection Schema Export

If you want to export your collection schema for easy setup, you can use PocketBase's backup feature:

1. Go to "Settings" > "Backups" in the admin interface
2. Create a backup
3. The backup file contains the complete schema and can be restored on other instances

## Authentication (Advanced)

For production use, you should implement user authentication:

1. Create a `users` collection or use PocketBase's built-in auth
2. Modify the sync service to handle authentication
3. Update API rules to use proper user-based permissions

Example API rule for user-owned data:

```
@request.auth.id != "" && @request.auth.id = @request.data.userId
```

## Troubleshooting

### Collections Don't Exist Error

If you see errors about collections not existing:

1. Verify you've created the `tasks` and `notes` collections
2. Check that the collection names are exactly `tasks` and `notes` (lowercase)
3. Ensure PocketBase is running and accessible

### Permission Denied Error

If you get permission errors:

1. Check your API rules in each collection
2. Verify authentication is working correctly
3. For testing, you can temporarily allow unauthenticated access

### Connection Failed Error

If the sync service can't connect:

1. Verify PocketBase is running
2. Check the URL configuration
3. Ensure there are no firewall or network issues
4. Check browser console for detailed error messages

## Manual Collection Creation Script

You can also create collections programmatically using PocketBase's JavaScript SDK:

```typescript
import PocketBase from 'pocketbase';

async function setupCollections() {
	const pb = new PocketBase('http://localhost:8090');

	// Note: This requires admin authentication
	// await pb.admins.authWithPassword('admin@example.com', 'password');

	try {
		// Create tasks collection
		await pb.collections.create({
			name: 'tasks',
			type: 'base',
			schema: [
				{ name: 'title', type: 'text', required: true },
				{ name: 'date', type: 'text' },
				{ name: 'time', type: 'text' },
				{ name: 'tags', type: 'json' },
				{ name: 'done', type: 'bool', required: true },
				{ name: 'usageCount', type: 'number' },
				{
					name: 'recurrence',
					type: 'select',
					options: { values: ['none', 'daily', 'weekly', 'custom'] }
				}
			]
		});

		// Create notes collection
		await pb.collections.create({
			name: 'notes',
			type: 'base',
			schema: [
				{ name: 'title', type: 'text', required: true },
				{ name: 'content', type: 'editor' }
			]
		});

		console.log('Collections created successfully!');
	} catch (error) {
		console.error('Error creating collections:', error);
	}
}
```
