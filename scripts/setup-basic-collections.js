#!/usr/bin/env node

/**
 * Simple PocketBase Collection Setup Script
 *
 * Creates basic collections for Taskdown without complex auth rules initially.
 * Auth rules can be added later once we confirm basic auth is working.
 */

import PocketBase from 'pocketbase';

const DEFAULT_URL = 'http://localhost:8090';

async function createBasicCollections() {
	const args = process.argv.slice(2);
	const pbUrl = args[0] || DEFAULT_URL;
	const adminEmail = args[1];
	const adminPassword = args[2];

	console.log(`🚀 Setting up basic PocketBase collections at ${pbUrl}`);

	const pb = new PocketBase(pbUrl);

	try {
		// Test connection
		await pb.health.check();
		console.log('✅ PocketBase connection successful');
	} catch (error) {
		console.error('❌ Failed to connect to PocketBase:', error.message);
		process.exit(1);
	}

	// Authenticate as admin if credentials provided
	if (adminEmail && adminPassword) {
		try {
			await pb.admins.authWithPassword(adminEmail, adminPassword);
			console.log('✅ Admin authentication successful');
		} catch (error) {
			console.error('❌ Admin authentication failed:', error.message);
			process.exit(1);
		}
	}

	// Basic collection schemas without auth rules
	const collections = [
		{
			name: 'tasks',
			type: 'base',
			schema: [
				{
					name: 'title',
					type: 'text',
					required: true,
					options: {}
				},
				{
					name: 'date',
					type: 'text',
					required: false,
					options: {}
				},
				{
					name: 'time',
					type: 'text',
					required: false,
					options: {}
				},
				{
					name: 'tags',
					type: 'json',
					required: false,
					options: {}
				},
				{
					name: 'done',
					type: 'bool',
					required: true,
					options: {}
				},
				{
					name: 'usageCount',
					type: 'number',
					required: false,
					options: {
						min: 0
					}
				},
				{
					name: 'recurrence',
					type: 'select',
					required: false,
					options: {
						maxSelect: 1,
						values: ['none', 'daily', 'weekly', 'custom']
					}
				}
			],
			// Open access for now - we'll add auth rules later
			listRule: '',
			viewRule: '',
			createRule: '',
			updateRule: '',
			deleteRule: ''
		},
		{
			name: 'notes',
			type: 'base',
			schema: [
				{
					name: 'title',
					type: 'text',
					required: true,
					options: {}
				},
				{
					name: 'content',
					type: 'editor',
					required: false,
					options: {}
				}
			],
			// Open access for now - we'll add auth rules later
			listRule: '',
			viewRule: '',
			createRule: '',
			updateRule: '',
			deleteRule: ''
		}
	];

	// Create collections
	for (const collectionData of collections) {
		try {
			// Check if collection already exists
			let existingCollection;
			try {
				existingCollection = await pb.collections.getOne(collectionData.name);
				console.log(`⏭️  Collection '${collectionData.name}' already exists, skipping`);
				continue;
			} catch (error) {
				// Collection doesn't exist, proceed to create it
			}

			// If collection exists but we had errors, delete and recreate
			if (existingCollection) {
				await pb.collections.delete(existingCollection.id);
				console.log(`🗑️  Deleted existing '${collectionData.name}' collection`);
			}

			await pb.collections.create(collectionData);
			console.log(`✅ Created collection '${collectionData.name}'`);
		} catch (error) {
			console.error(`❌ Failed to create collection '${collectionData.name}':`, error.message);
			if (error.data) {
				console.error('Error details:', JSON.stringify(error.data, null, 2));
			}
		}
	}

	console.log('\n🎉 Basic PocketBase setup complete!');
	console.log('\n📋 Next steps:');
	console.log('1. Test user authentication with the existing users collection');
	console.log('2. Add user relation fields to collections once auth is working');
	console.log('3. Apply proper auth rules after user relations are added');
}

// Run the setup
createBasicCollections().catch(console.error);