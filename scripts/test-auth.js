#!/usr/bin/env node

/**
 * Test PocketBase Authentication
 *
 * Test script to verify that authentication is working correctly
 */

import PocketBase from 'pocketbase';

const DEFAULT_URL = 'http://localhost:8090';

async function testAuthentication() {
	console.log('🧪 Testing PocketBase authentication...');

	const pb = new PocketBase(DEFAULT_URL);

	try {
		// Test connection
		await pb.health.check();
		console.log('✅ PocketBase connection successful');
	} catch (error) {
		console.error('❌ Failed to connect to PocketBase:', error.message);
		process.exit(1);
	}

	// Test user login
	try {
		console.log('\n🔐 Testing user authentication...');
		const authData = await pb.collection('users').authWithPassword(
			'test@taskdown.local',
			'test123456'
		);

		console.log('✅ User authentication successful!');
		console.log('User details:', {
			id: authData.record.id,
			email: authData.record.email,
			verified: authData.record.verified
		});

		// Test creating a task as the authenticated user
		try {
			console.log('\n📝 Testing task creation...');
			const task = await pb.collection('tasks').create({
				title: 'Test Task from API',
				done: false,
				date: '2025-08-08',
				tags: ['test', 'api']
			});

			console.log('✅ Task created successfully!');
			console.log('Task details:', {
				id: task.id,
				title: task.title,
				done: task.done
			});

			// List tasks
			const tasks = await pb.collection('tasks').getList();
			console.log(`📋 Found ${tasks.totalItems} tasks total`);

		} catch (error) {
			console.error('❌ Task creation failed:', error.message);
			if (error.data) {
				console.error('Error details:', JSON.stringify(error.data, null, 2));
			}
		}

		// Test logout
		pb.authStore.clear();
		console.log('✅ User logged out successfully');

	} catch (error) {
		console.error('❌ User authentication failed:', error.message);
		if (error.data) {
			console.error('Error details:', JSON.stringify(error.data, null, 2));
		}
	}

	// Test registration of a new user
	try {
		console.log('\n📝 Testing user registration...');
		const newUser = await pb.collection('users').create({
			email: 'newtest@taskdown.local',
			password: 'newtest123456',
			passwordConfirm: 'newtest123456'
		});

		console.log('✅ User registration successful!');
		console.log('New user ID:', newUser.id);

		// Test login with new user
		const authData = await pb.collection('users').authWithPassword(
			'newtest@taskdown.local',
			'newtest123456'
		);

		console.log('✅ New user login successful!');

	} catch (error) {
		console.error('❌ User registration failed:', error.message);
		if (error.data) {
			console.error('Error details:', JSON.stringify(error.data, null, 2));
		}
	}

	console.log('\n🎉 Authentication tests complete!');
}

// Run the tests
testAuthentication().catch(console.error);