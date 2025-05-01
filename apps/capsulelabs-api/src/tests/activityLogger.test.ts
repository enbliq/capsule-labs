import mongoose from 'mongoose';
import { ActivityLogger } from '../services/activityLogger.service';
import { ActivityLog } from '../models/activityLog.model';
import { User } from '../models/user.model';

// Connect to a test database before tests
beforeAll(async () => {
	await mongoose.connect('mongodb://localhost:27017/timelycapsule');
});

// Clear the database between tests
beforeEach(async () => {
	await ActivityLog.deleteMany({});
	await User.deleteMany({});
});

// Disconnect after all tests
afterAll(async () => {
	await mongoose.connection.close();
});

describe('ActivityLogger', () => {
	test('should log user login activity', async () => {
		// Create a test user
		let user = new User({
			email: 'test@example.com',
			passwordHash: 'hashed_password',
			displayName: 'Test User',
			roles: ['user'],
			guest: false,
			isVerified: true,
			provider: 'local',
		});
		user = await user.save();

		// Mock data
		const logData = {
			userId: user._id as mongoose.Types.ObjectId,
			action: 'login',
			metadata: {
				ip: '127.0.0.1',
				device: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
				guest: false,
				provider: 'local',
			},
		};

		// Log the activity
		await ActivityLogger.log(logData);

		// Verify the log was created
		const logs = await ActivityLog.find({ userId: user._id });
		expect(logs.length).toBe(1);
		expect(logs[0].action).toBe('login');
		expect(logs[0].metadata.ip).toBe('127.0.0.1');
		expect(logs[0].metadata.provider).toBe('local');
	});

	test('should log guest session activity without userId', async () => {
		// Mock data
		const logData = {
			action: 'guest_session_start',
			metadata: {
				ip: '192.168.1.1',
				device: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)',
				guest: true,
			},
		};

		// Log the activity
		await ActivityLogger.log(logData);

		// Verify the log was created
		const logs = await ActivityLog.find({ action: 'guest_session_start' });
		expect(logs.length).toBe(1);
		expect(logs[0].userId).toBeUndefined();
		expect(logs[0].metadata.guest).toBe(true);
	});

	test('should sanitize sensitive data', async () => {
		// Create a test user
		const user = new User({
			email: 'test@example.com',
			passwordHash: 'hashed_password',
			displayName: 'Test User',
			roles: ['user'],
			guest: false,
			isVerified: true,
			provider: 'local',
		});
		await user.save();

		// Mock data with sensitive information
		const logData = {
			userId: user._id as mongoose.Types.ObjectId,
			action: 'password_reset',
			metadata: {
				ip: '127.0.0.1',
				device: 'Test Device',
				guest: false,
				passwordHash: 'secret123', // This should be removed
				token: 'jwt-token-123', // This should be removed
			},
		};

		// Log the activity
		await ActivityLogger.log(logData);

		// Verify the log was created with sensitive data removed
		const logs = await ActivityLog.find({ userId: user._id });
		expect(logs.length).toBe(1);
		expect(logs[0].metadata.passwordHash).toBeUndefined();
		expect(logs[0].metadata.token).toBeUndefined();
		expect(logs[0].metadata.ip).toBe('127.0.0.1');
	});

	test('should work with different user providers', async () => {
		// Create test users with different providers
		const localUser = new User({
			email: 'local@example.com',
			passwordHash: 'hashed_password',
			displayName: 'Local User',
			roles: ['user'],
			guest: false,
			isVerified: true,
			provider: 'local',
		});
		await localUser.save();

		const googleUser = new User({
			email: 'google@example.com',
			passwordHash: null,
			displayName: 'Google User',
			roles: ['user'],
			guest: false,
			isVerified: true,
			provider: 'google',
		});
		await googleUser.save();

		// Log activities for both users
		await ActivityLogger.log({
			userId: localUser._id,
			action: 'login',
			metadata: {
				provider: 'local',
				ip: '127.0.0.1',
				device: 'Chrome',
				guest: false,
			},
		});

		await ActivityLogger.log({
			userId: googleUser._id,
			action: 'login',
			metadata: {
				provider: 'google',
				ip: '127.0.0.2',
				device: 'Safari',
				guest: false,
			},
		});

		// Verify logs were created correctly
		const localUserLogs = await ActivityLog.find({ userId: localUser._id });
		expect(localUserLogs.length).toBe(1);
		expect(localUserLogs[0].metadata.provider).toBe('local');

		const googleUserLogs = await ActivityLog.find({ userId: googleUser._id });
		expect(googleUserLogs.length).toBe(1);
		expect(googleUserLogs[0].metadata.provider).toBe('google');
	});
});
