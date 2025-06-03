export interface GPSData {
  latitude: number
  longitude: number
  altitude?: number
  accuracy?: number
  speed?: number
  bearing?: number
  timestamp: Date
}

export interface StepCountData {
  stepCount: number
  cumulativeSteps: number
  cadence?: number
  strideLength?: number
  timestamp: Date
  deviceData?: Record<string, any>
}

export interface DeviceCapabilities {
  hasGPS: boolean
  hasStepCounter: boolean
  hasAccelerometer: boolean
  hasGyroscope: boolean
  batteryOptimized: boolean
}

export interface TrackingSession {
  sessionId: string
  attemptId: string
  userId: string
  startTime: Date
  isActive: boolean
  capabilities: DeviceCapabilities
}

export interface MobileTrackingService {
  startTracking(session: TrackingSession): Promise<void>
  stopTracking(sessionId: string): Promise<void>
  updateGPS(sessionId: string, gpsData: GPSData): Promise<void>
  updateSteps(sessionId: string, stepData: StepCountData): Promise<void>
  getTrackingStatus(sessionId: string): Promise<boolean>
}
