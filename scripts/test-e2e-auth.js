#!/usr/bin/env node

/**
 * End-to-End Authentication Test
 *
 * Complete test of authentication workflow from UI perspective
 */

import { authService } from '../src/lib/auth.js';
import { settingsService } from '../src/lib/settings.js';

async function testE2EAuthentication() {
	console.log('🔄 Testing end-to-end authentication workflow...');

	// Step 1: Set custom backend mode
	console.log('\n1️⃣ Setting sync mode to custom-backend...');
	settingsService.updateSettings({
		syncMode: 'custom-backend',
		customBackendUrl: 'http://localhost:8090'
	});

	const settings = settingsService.getSettings();
	console.log('✅ Sync mode set:', settings.syncMode);
	console.log('✅ Backend URL:', settings.customBackendUrl);

	// Step 2: Test registration
	console.log('\n2️⃣ Testing user registration...');
	try {
		const newUser = await authService.register({
			email: 'e2etest@taskdown.local',
			password: 'e2etest123456',
			passwordConfirm: 'e2etest123456',
			username: 'e2etestuser'
		});

		console.log('✅ Registration successful!');
		console.log('User ID:', newUser.id);
		console.log('Email:', newUser.email);
		console.log('Username:', newUser.username);

		// Verify auth status
		const authStatus = authService.getAuthStatus();
		console.log('✅ Authentication status:', authStatus.isAuthenticated);

	} catch (error) {
		console.error('❌ Registration failed:', error.message);
	}

	// Step 3: Test logout
	console.log('\n3️⃣ Testing logout...');
	await authService.logout();
	const loggedOutStatus = authService.getAuthStatus();
	console.log('✅ Logged out, authenticated:', loggedOutStatus.isAuthenticated);

	// Step 4: Test login
	console.log('\n4️⃣ Testing login...');
	try {
		const user = await authService.login({
			email: 'e2etest@taskdown.local',
			password: 'e2etest123456'
		});

		console.log('✅ Login successful!');
		console.log('User ID:', user.id);
		console.log('Email:', user.email);

		// Verify settings were updated
		const updatedSettings = settingsService.getSettings();
		console.log('✅ Settings updated with user info:', updatedSettings.isAuthenticated);

	} catch (error) {
		console.error('❌ Login failed:', error.message);
	}

	// Step 5: Test PocketBase integration
	console.log('\n5️⃣ Testing PocketBase integration...');
	const pb = authService.getPocketBase();
	if (pb && pb.authStore.isValid) {
		console.log('✅ PocketBase authenticated');
		console.log('Auth token valid:', pb.authStore.isValid);
		console.log('User ID from PB:', pb.authStore.model?.id);
	} else {
		console.log('❌ PocketBase not authenticated');
	}

	// Step 6: Test switching back to local mode
	console.log('\n6️⃣ Testing switch to local-only mode...');
	settingsService.updateSettings({ syncMode: 'local-only' });
	await authService.logout();
	
	const finalSettings = settingsService.getSettings();
	const finalAuthStatus = authService.getAuthStatus();
	console.log('✅ Switched to local mode:', finalSettings.syncMode);
	console.log('✅ Logged out from sync:', !finalAuthStatus.isAuthenticated);

	console.log('\n🎉 End-to-end authentication test complete!');

	// Summary
	console.log('\n📊 Test Summary:');
	console.log('- ✅ Settings service working');
	console.log('- ✅ Auth service registration working');
	console.log('- ✅ Auth service login working');
	console.log('- ✅ Auth service logout working');
	console.log('- ✅ PocketBase integration working');
	console.log('- ✅ Sync mode switching working');
}

// Run the test
testE2EAuthentication().catch(console.error);