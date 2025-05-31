export interface ProximityCapsule {
  id: string
  title: string
  description: string
  reward: string
  createdBy: string
  createdAt: Date
  expiresAt?: Date

  // Group requirements
  groupConfig: GroupConfig
  proximityConfig: ProximityConfig

  // Unlock tracking
  unlocked: boolean
  unlockedBy?: string[]
  unlockedAt?: Date
  unlockedGroup?: ProximityGroup

  // Status
  isActive: boolean
}

export interface GroupConfig {
  minGroupSize: number
  maxGroupSize?: number
  requireAllAuthenticated: boolean
  allowSameUser?: boolean // Allow same user with multiple devices
  groupFormationTimeout: number // Seconds to form group
  maintainProximityDuration: number // Seconds group must stay together
}

export interface ProximityConfig {
  detectionMethods: ProximityMethod[]
  bluetoothConfig?: BluetoothConfig
  networkConfig?: NetworkConfig
  gpsConfig?: GpsConfig
  signalStrengthThreshold?: number
  distanceThreshold?: number // meters
  confidenceLevel: number // 0-100, required confidence for proximity
}

export interface BluetoothConfig {
  enabled: boolean
  rssiThreshold: number // Signal strength threshold
  scanDuration: number // Seconds
  requiredDeviceTypes?: string[]
}

export interface NetworkConfig {
  enabled: boolean
  requireSameWifi: boolean
  requireSameSubnet: boolean
  allowHotspot: boolean
}

export interface GpsConfig {
  enabled: boolean
  accuracyThreshold: number // meters
  maxDistanceMeters: number
  requireHighAccuracy: boolean
}

export interface ProximityGroup {
  id: string
  capsuleId: string
  members: GroupMember[]
  status: GroupStatus
  createdAt: Date
  formedAt?: Date
  unlockedAt?: Date
  expiresAt: Date
  proximityChecks: NearbyCheck[]
}

export interface GroupMember {
  userId: string
  deviceId: string
  joinedAt: Date
  lastSeen: Date
  isAuthenticated: boolean
  proximityData: ProximityData
}

export interface NearbyCheck {
  id: string
  groupId: string
  userId: string
  deviceId: string
  timestamp: Date
  detectionMethod: ProximityMethod
  proximityData: ProximityData
  isValid: boolean
  confidence: number
}

export interface ProximityData {
  bluetooth?: BluetoothData
  network?: NetworkData
  gps?: GpsData
  combined?: CombinedProximityData
}

export interface BluetoothData {
  deviceId: string
  rssi: number
  txPower?: number
  distance?: number
  nearbyDevices: BluetoothDevice[]
}

export interface BluetoothDevice {
  deviceId: string
  name?: string
  rssi: number
  distance?: number
}

export interface NetworkData {
  ipAddress: string
  subnet: string
  wifiSSID?: string
  wifiBSSID?: string
  isHotspot: boolean
  networkLatency?: number
}

export interface GpsData {
  latitude: number
  longitude: number
  accuracy: number
  altitude?: number
  timestamp: Date
}

export interface CombinedProximityData {
  overallConfidence: number
  detectionMethods: ProximityMethod[]
  estimatedDistance?: number
  reliability: ProximityReliability
}

export enum ProximityMethod {
  BLUETOOTH = "bluetooth",
  WIFI_NETWORK = "wifi_network",
  GPS_LOCATION = "gps_location",
  COMBINED = "combined",
}

export enum GroupStatus {
  FORMING = "forming",
  ACTIVE = "active",
  VALIDATING = "validating",
  UNLOCKED = "unlocked",
  EXPIRED = "expired",
  FAILED = "failed",
}

export enum ProximityReliability {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  VERY_HIGH = "very_high",
}

export interface ProximityValidationResult {
  isValid: boolean
  confidence: number
  detectedMethods: ProximityMethod[]
  estimatedDistance?: number
  reliability: ProximityReliability
  errors?: string[]
  warnings?: string[]
}

export interface GroupFormationResult {
  success: boolean
  group?: ProximityGroup
  message: string
  missingMembers?: number
  proximityIssues?: string[]
}

export enum ProximityErrorCode {
  INSUFFICIENT_GROUP_SIZE = "INSUFFICIENT_GROUP_SIZE",
  PROXIMITY_TOO_FAR = "PROXIMITY_TOO_FAR",
  DETECTION_METHOD_FAILED = "DETECTION_METHOD_FAILED",
  AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED",
  GROUP_FORMATION_TIMEOUT = "GROUP_FORMATION_TIMEOUT",
  SIGNAL_TOO_WEAK = "SIGNAL_TOO_WEAK",
  LOCATION_ACCURACY_LOW = "LOCATION_ACCURACY_LOW",
  NETWORK_MISMATCH = "NETWORK_MISMATCH",
}
