#!/usr/bin/env node

/**
 * PocketBase Collection Setup Script
 *
 * This script creates the required collections for Taskdown sync functionality.
 * Run this after starting PocketBase and creating an admin account.
 *
 * Usage:
 *   node scripts/setup-pocketbase.js [pocketbase-url] [admin-email] [admin-password]
 *
 * Example:
 *   node scripts/setup-pocketbase.js http://localhost:8090 admin@example.com password123
 */

import PocketBase from 'pocketbase';

const DEFAULT_URL = 'http://localhost:8090';

async function setupPocketBaseCollections() {
	const args = process.argv.slice(2);
	const pbUrl = args[0] || DEFAULT_URL;
	const adminEmail = args[1];
	const adminPassword = args[2];

	console.log(`🚀 Setting up PocketBase collections at ${pbUrl}`);

	const pb = new PocketBase(pbUrl);

	try {
		// Test connection
		await pb.health.check();
		console.log('✅ PocketBase connection successful');
	} catch (error) {
		console.error('❌ Failed to connect to PocketBase:', error.message);
		console.log('\n💡 Make sure PocketBase is running:');
		console.log('   npm run services:start');
		process.exit(1);
	}

	// Authenticate as admin if credentials provided
	if (adminEmail && adminPassword) {
		try {
			await pb.admins.authWithPassword(adminEmail, adminPassword);
			console.log('✅ Admin authentication successful');
		} catch (error) {
			console.error('❌ Admin authentication failed:', error.message);
			console.log('\n💡 Please check your admin credentials or create an admin account at:');
			console.log(`   ${pbUrl}/_/`);
			process.exit(1);
		}
	} else {
		console.log('⚠️  No admin credentials provided. You may need to authenticate manually.');
		console.log(`   Go to ${pbUrl}/_/ to create or log in as admin first.`);
	}

	// Collection schemas
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
				},
				{
					name: 'user',
					type: 'relation',
					required: true,
					options: {
						collectionId: '_pb_users_auth_',
						cascadeDelete: true,
						minSelect: null,
						maxSelect: 1,
						displayFields: null
					}
				}
			],
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
				},
				{
					name: 'user',
					type: 'relation',
					required: true,
					options: {
						collectionId: '_pb_users_auth_',
						cascadeDelete: true,
						minSelect: null,
						maxSelect: 1,
						displayFields: null
					}
				}
			],
			listRule: '',
			viewRule: '',
			createRule: '',
			updateRule: '',
			deleteRule: ''
		}
	];

	// Authentication rules to be applied after collection creation
	const authRules = {
		tasks: {
			listRule: '@request.auth.id != "" && user = @request.auth.id',
			viewRule: '@request.auth.id != "" && user = @request.auth.id',
			createRule: '@request.auth.id != ""',
			updateRule: '@request.auth.id != "" && user = @request.auth.id',
			deleteRule: '@request.auth.id != "" && user = @request.auth.id'
		},
		notes: {
			listRule: '@request.auth.id != "" && user = @request.auth.id',
			viewRule: '@request.auth.id != "" && user = @request.auth.id',
			createRule: '@request.auth.id != ""',
			updateRule: '@request.auth.id != "" && user = @request.auth.id',
			deleteRule: '@request.auth.id != "" && user = @request.auth.id'
		}
	};

	// Create collections
	for (const collectionData of collections) {
		try {
			// Check if collection already exists
			try {
				await pb.collections.getOne(collectionData.name);
				console.log(`⏭️  Collection '${collectionData.name}' already exists, skipping`);
				continue;
			} catch (error) {
				// Collection doesn't exist, proceed to create it
			}

			await pb.collections.create(collectionData);
			console.log(`✅ Created collection '${collectionData.name}'`);
		} catch (error) {
			console.error(`❌ Failed to create collection '${collectionData.name}':`, error.message);
			if (error.data) {
				console.error('Error details:', JSON.stringify(error.data, null, 2));
			}

			if (error.message.includes('unauthorized')) {
				console.log('\n💡 Authentication required. Please provide admin credentials:');
				console.log(`   node scripts/setup-pocketbase.js ${pbUrl} admin@example.com your-password`);
				console.log(`   Or log in manually at ${pbUrl}/_/ and run this script again.`);
			}
		}
	}

	// Apply authentication rules
	console.log('\n🔐 Setting up authentication rules...');
	for (const [collectionName, rules] of Object.entries(authRules)) {
		try {
			const collection = await pb.collections.getOne(collectionName);
			await pb.collections.update(collection.id, rules);
			console.log(`✅ Applied auth rules to '${collectionName}' collection`);
		} catch (error) {
			console.error(`❌ Failed to apply auth rules to '${collectionName}':`, error.message);
			if (error.data) {
				console.error('Error details:', JSON.stringify(error.data, null, 2));
			}
		}
	}

	console.log('\n🎉 PocketBase setup complete!');
	console.log('\n📋 Next steps:');
	console.log('1. Configure API rules for your collections if needed');
	console.log('2. Set up user authentication (optional)');
	console.log('3. Start your Taskdown application');
	console.log('\n📖 For detailed setup instructions, see docs/POCKETBASE_SETUP.md');
}

// Run the setup
setupPocketBaseCollections().catch(console.error);
