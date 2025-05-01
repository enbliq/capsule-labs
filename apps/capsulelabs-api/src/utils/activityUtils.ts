import mongoose from 'mongoose';
import { ActivityLogger } from '../services/activityLogger.service';
import { IActivityLogMetadata } from '../models/activityLog.model';

export const activityUtils = {
	/**
	 * Log a user login
	 */
	logLogin: (
		userId: string | mongoose.Types.ObjectId,
		metadata: IActivityLogMetadata = {}
	): Promise<boolean> => {
		return ActivityLogger.log({
			userId,
			action: 'login',
			metadata: { ...metadata, guest: false },
		});
	},

	/**
	 * Log a user registration
	 */
	logRegistration: (
		userId: string | mongoose.Types.ObjectId,
		metadata: IActivityLogMetadata = {}
	): Promise<boolean> => {
		return ActivityLogger.log({
			userId,
			action: 'register',
			metadata: { ...metadata, guest: false },
		});
	},

	/**
	 * Log a guest session start
	 */
	logGuestSession: (metadata: IActivityLogMetadata = {}): Promise<boolean> => {
		return ActivityLogger.log({
			action: 'guest_session_start',
			metadata: { ...metadata, guest: true },
		});
	},

	/**
	 * Log an account upgrade
	 */
	logUpgrade: (
		userId: string | mongoose.Types.ObjectId,
		metadata: IActivityLogMetadata = {}
	): Promise<boolean> => {
		return ActivityLogger.log({
			userId,
			action: 'upgrade',
			metadata: { ...metadata, guest: false },
		});
	},

	/**
	 * Log a password reset
	 */
	logPasswordReset: (
		userId: string | mongoose.Types.ObjectId,
		metadata: IActivityLogMetadata = {}
	): Promise<boolean> => {
		return ActivityLogger.log({
			userId,
			action: 'password_reset',
			metadata: { ...metadata, guest: false },
		});
	},

	/**
	 * Generic log function for custom actions
	 */
	logActivity: (
		action: string,
		userId: string | mongoose.Types.ObjectId | null = null,
		metadata: IActivityLogMetadata = {}
	): Promise<boolean> => {
		return ActivityLogger.log({
			userId: userId || undefined,
			action,
			metadata: {
				...metadata,
				guest: !userId,
			},
		});
	},
};
