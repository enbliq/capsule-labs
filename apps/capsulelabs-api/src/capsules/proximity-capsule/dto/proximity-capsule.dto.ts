import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsEnum,
  IsNotEmpty,
  Min,
  Max,
  ValidateNested,
  IsInt,
  IsDateString,
  IsIP,
  IsLatitude,
  IsLongitude,
} from "class-validator"
import { Type } from "class-transformer"
import { ProximityMethod } from "../entities/proximity-capsule.entity"

export class CreateProximityCapsuleDto {
  @IsString()
  @IsNotEmpty()
  title: string

  @IsString()
  @IsNotEmpty()
  description: string

  @IsString()
  @IsNotEmpty()
  reward: string

  @IsString()
  @IsNotEmpty()
  createdBy: string

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @ValidateNested()
  @Type(() => GroupConfigDto)
  groupConfig: GroupConfigDto

  @ValidateNested()
  @Type(() => ProximityConfigDto)
  proximityConfig: ProximityConfigDto
}

export class GroupConfigDto {
  @IsInt()
  @Min(2)
  @Max(50)
  minGroupSize: number

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(50)
  maxGroupSize?: number

  @IsBoolean()
  requireAllAuthenticated: boolean

  @IsOptional()
  @IsBoolean()
  allowSameUser?: boolean

  @IsInt()
  @Min(30)
  @Max(3600)
  groupFormationTimeout: number

  @IsInt()
  @Min(10)
  @Max(1800)
  maintainProximityDuration: number
}

export class ProximityConfigDto {
  @IsArray()
  @IsEnum(ProximityMethod, { each: true })
  detectionMethods: ProximityMethod[]

  @IsOptional()
  @ValidateNested()
  @Type(() => BluetoothConfigDto)
  bluetoothConfig?: BluetoothConfigDto

  @IsOptional()
  @ValidateNested()
  @Type(() => NetworkConfigDto)
  networkConfig?: NetworkConfigDto

  @IsOptional()
  @ValidateNested()
  @Type(() => GpsConfigDto)
  gpsConfig?: GpsConfigDto

  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(0)
  signalStrengthThreshold?: number

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  distanceThreshold?: number

  @IsNumber()
  @Min(50)
  @Max(100)
  confidenceLevel: number
}

export class BluetoothConfigDto {
  @IsBoolean()
  enabled: boolean

  @IsNumber()
  @Min(-100)
  @Max(0)
  rssiThreshold: number

  @IsInt()
  @Min(1)
  @Max(60)
  scanDuration: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredDeviceTypes?: string[]
}

export class NetworkConfigDto {
  @IsBoolean()
  enabled: boolean

  @IsBoolean()
  requireSameWifi: boolean

  @IsBoolean()
  requireSameSubnet: boolean

  @IsBoolean()
  allowHotspot: boolean
}

export class GpsConfigDto {
  @IsBoolean()
  enabled: boolean

  @IsNumber()
  @Min(1)
  @Max(100)
  accuracyThreshold: number

  @IsNumber()
  @Min(1)
  @Max(1000)
  maxDistanceMeters: number

  @IsBoolean()
  requireHighAccuracy: boolean
}

export class JoinGroupDto {
  @IsString()
  @IsNotEmpty()
  capsuleId: string

  @IsString()
  @IsNotEmpty()
  userId: string

  @IsString()
  @IsNotEmpty()
  deviceId: string

  @ValidateNested()
  @Type(() => ProximityDataDto)
  proximityData: ProximityDataDto
}

export class ProximityDataDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => BluetoothDataDto)
  bluetooth?: BluetoothDataDto

  @IsOptional()
  @ValidateNested()
  @Type(() => NetworkDataDto)
  network?: NetworkDataDto

  @IsOptional()
  @ValidateNested()
  @Type(() => GpsDataDto)
  gps?: GpsDataDto
}

export class BluetoothDataDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string

  @IsNumber()
  @Min(-100)
  @Max(0)
  rssi: number

  @IsOptional()
  @IsNumber()
  txPower?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  distance?: number

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BluetoothDeviceDto)
  nearbyDevices: BluetoothDeviceDto[]
}

export class BluetoothDeviceDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string

  @IsOptional()
  @IsString()
  name?: string

  @IsNumber()
  @Min(-100)
  @Max(0)
  rssi: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  distance?: number
}

export class NetworkDataDto {
  @IsIP()
  ipAddress: string

  @IsString()
  @IsNotEmpty()
  subnet: string

  @IsOptional()
  @IsString()
  wifiSSID?: string

  @IsOptional()
  @IsString()
  wifiBSSID?: string

  @IsBoolean()
  isHotspot: boolean

  @IsOptional()
  @IsNumber()
  @Min(0)
  networkLatency?: number
}

export class GpsDataDto {
  @IsLatitude()
  latitude: number

  @IsLongitude()
  longitude: number

  @IsNumber()
  @Min(0)
  @Max(1000)
  accuracy: number

  @IsOptional()
  @IsNumber()
  altitude?: number

  @IsDateString()
  timestamp: string
}

export class ProximityCheckDto {
  @IsString()
  @IsNotEmpty()
  groupId: string

  @IsString()
  @IsNotEmpty()
  userId: string

  @IsString()
  @IsNotEmpty()
  deviceId: string

  @IsEnum(ProximityMethod)
  detectionMethod: ProximityMethod

  @ValidateNested()
  @Type(() => ProximityDataDto)
  proximityData: ProximityDataDto
}

export class UpdateProximityCapsuleDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  reward?: string

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @ValidateNested()
  @Type(() => GroupConfigDto)
  groupConfig?: GroupConfigDto

  @IsOptional()
  @ValidateNested()
  @Type(() => ProximityConfigDto)
  proximityConfig?: ProximityConfigDto
}

export class ProximityQueryDto {
  @IsOptional()
  @IsString()
  createdBy?: string

  @IsOptional()
  @IsBoolean()
  unlocked?: boolean

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsEnum(ProximityMethod)
  detectionMethod?: ProximityMethod

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number
}
