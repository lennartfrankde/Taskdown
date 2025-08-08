#!/usr/bin/env node

/**
 * Create PocketBase Admin Account
 *
 * This script creates the initial admin account for PocketBase.
 * Run this before running the setup-pocketbase.js script.
 */

import PocketBase from 'pocketbase';

const DEFAULT_URL = 'http://localhost:8090';
const DEFAULT_EMAIL = 'admin@taskdown.local';
const DEFAULT_PASSWORD = 'admin123456';

async function createAdmin() {
	const args = process.argv.slice(2);
	const pbUrl = args[0] || DEFAULT_URL;
	const adminEmail = args[1] || DEFAULT_EMAIL;
	const adminPassword = args[2] || DEFAULT_PASSWORD;

	console.log(`🚀 Creating admin account at ${pbUrl}`);

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

	try {
		// Check if admin already exists by trying to authenticate
		try {
			await pb.admins.authWithPassword(adminEmail, adminPassword);
			console.log('✅ Admin account already exists and can authenticate');
			return;
		} catch (error) {
			// Admin doesn't exist or credentials are wrong, continue to create
		}

		// Create admin account
		await pb.admins.create({
			email: adminEmail,
			password: adminPassword,
			passwordConfirm: adminPassword
		});

		console.log('✅ Admin account created successfully');
		console.log(`   Email: ${adminEmail}`);
		console.log(`   Password: ${adminPassword}`);
		console.log('\n⚠️  Please change the default password in production!');

	} catch (error) {
		if (error.message.includes('already exists')) {
			console.log('✅ Admin account already exists');
		} else {
			console.error('❌ Failed to create admin account:', error.message);
			console.log('\n💡 You may need to create the admin account manually at:');
			console.log(`   ${pbUrl}/_/`);
		}
	}
}

// Run the setup
createAdmin().catch(console.error);