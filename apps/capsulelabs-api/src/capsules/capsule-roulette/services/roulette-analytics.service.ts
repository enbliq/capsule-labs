import { Injectable, Logger } from "@nestjs/common"
import type {
  RouletteCapsuleDrop,
  ClaimEvent,
  UserRouletteStats,
  DropStatistics,
} from "../entities/capsule-roulette.entity"

interface RiskAnalysisResult {
  suspicious: boolean
  score: number // 0-1, higher = more suspicious
  factors: RiskFactor[]
  recommendation: "allow" | "review" | "block"
}

interface RiskFactor {
  type: string
  severity: "low" | "medium" | "high"
  description: string
  score: number
}

interface AnalyticsMetrics {
  totalDrops: number
  totalClaims: number
  averageClaimTime: number
  successRate: number
  topPerformers: UserRouletteStats[]
  peakClaimHours: number[]
  geographicDistribution: Record<string, number>
  deviceDistribution: Record<string, number>
}

@Injectable()
export class RouletteAnalyticsService {
  private readonly logger = new Logger(RouletteAnalyticsService.name)
  private riskProfiles = new Map<string, RiskProfile>()
  private analyticsCache = new Map<string, any>()

  async analyzeClaimRisk(claimEvent: ClaimEvent, drop: RouletteCapsuleDrop): Promise<RiskAnalysisResult> {
    const factors: RiskFactor[] = []
    let totalScore = 0

    // Analyze claim timing
    const timingRisk = this.analyzeClaimTiming(claimEvent, drop)
    if (timingRisk.score > 0) {
      factors.push(timingRisk)
      totalScore += timingRisk.score
    }

    // Analyze user behavior patterns
    const behaviorRisk = await this.analyzeUserBehavior(claimEvent.userId)
    if (behaviorRisk.score > 0) {
      factors.push(behaviorRisk)
      totalScore += behaviorRisk.score
    }

    // Analyze device fingerprint
    if (claimEvent.deviceFingerprint) {
      const deviceRisk = this.analyzeDeviceFingerprint(claimEvent.deviceFingerprint, claimEvent.userId)
      if (deviceRisk.score > 0) {
        factors.push(deviceRisk)
        totalScore += deviceRisk.score
      }
    }

    // Analyze IP patterns (would require IP data)
    const ipRisk = this.analyzeIpPatterns(claimEvent.ipAddress, claimEvent.userId)
    if (ipRisk.score > 0) {
      factors.push(ipRisk)
      totalScore += ipRisk.score
    }

    // Normalize score (0-1)
    const normalizedScore = Math.min(1, totalScore / factors.length)

    // Determine recommendation
    let recommendation: "allow" | "review" | "block" = "allow"
    if (normalizedScore > 0.8) {
      recommendation = "block"
    } else if (normalizedScore > 0.5) {
      recommendation = "review"
    }

    const result: RiskAnalysisResult = {
      suspicious: normalizedScore > 0.5,
      score: normalizedScore,
      factors,
      recommendation,
    }

    // Update user risk profile
    this.updateUserRiskProfile(claimEvent.userId, result)

    return result
  }

  async getUserWinsThisWeek(userId: string): Promise<number> {
    // This would query claim events for the current week
    // For now, returning a mock value
    return Math.floor(Math.random() * 3)
  }

  async getDropStatistics(dropId: string): Promise<DropStatistics | null> {
    // This would calculate comprehensive statistics for a specific drop
    // For now, returning mock data
    return {
      dropId,
      totalAttempts: Math.floor(Math.random() * 1000) + 100,
      uniqueUsers: Math.floor(Math.random() * 500) + 50,
      averageLatency: Math.floor(Math.random() * 5000) + 500,
      fastestClaim: Math.floor(Math.random() * 1000) + 100,
      geographicDistribution: {
        US: 40,
        EU: 30,
        ASIA: 20,
        OTHER: 10,
      },
      deviceDistribution: {
        mobile: 70,
        desktop: 25,
        tablet: 5,
      },
      timeToFirstClaim: Math.floor(Math.random() * 10000) + 1000,
    }
  }

  async getAnalyticsMetrics(startDate?: Date, endDate?: Date): Promise<AnalyticsMetrics> {
    const cacheKey = `metrics_${startDate?.toISOString()}_${endDate?.toISOString()}`
    const cached = this.analyticsCache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < 300000) {
      // 5 minute cache
      return cached.data
    }

    // Calculate metrics (mock data for now)
    const metrics: AnalyticsMetrics = {
      totalDrops: Math.floor(Math.random() * 100) + 50,
      totalClaims: Math.floor(Math.random() * 80) + 30,
      averageClaimTime: Math.floor(Math.random() * 3000) + 1000,
      successRate: Math.random() * 0.3 + 0.7, // 70-100%
      topPerformers: [], // Would be populated with actual user stats
      peakClaimHours: [12, 18, 20, 21], // Peak hours
      geographicDistribution: {
        "North America": 35,
        Europe: 30,
        Asia: 25,
        Other: 10,
      },
      deviceDistribution: {
        Mobile: 65,
        Desktop: 30,
        Tablet: 5,
      },
    }

    // Cache the result
    this.analyticsCache.set(cacheKey, {
      data: metrics,
      timestamp: Date.now(),
    })

    return metrics
  }

  async detectAnomalousPatterns(): Promise<{
    suspiciousUsers: string[]
    unusualClaimPatterns: any[]
    systemAnomalies: any[]
  }> {
    // This would analyze patterns across all users and drops
    return {
      suspiciousUsers: [],
      unusualClaimPatterns: [],
      systemAnomalies: [],
    }
  }

  async generateUserInsights(userId: string): Promise<{
    claimingPatterns: any
    performanceMetrics: any
    recommendations: string[]
  }> {
    // Generate personalized insights for a user
    return {
      claimingPatterns: {
        favoriteTime: "14:30",
        averageLatency: 2500,
        successRate: 0.75,
      },
      performanceMetrics: {
        rank: Math.floor(Math.random() * 1000) + 1,
        percentile: Math.floor(Math.random() * 100),
        improvement: "+15%",
      },
      recommendations: [
        "Try claiming during off-peak hours for better chances",
        "Enable push notifications to get instant alerts",
        "Practice quick reflexes with reaction games",
      ],
    }
  }

  private analyzeClaimTiming(claimEvent: ClaimEvent, drop: RouletteCapsuleDrop): RiskFactor {
    const claimLatency = claimEvent.claimLatency

    // Suspiciously fast claims (< 100ms) might indicate automation
    if (claimLatency < 100) {
      return {
        type: "timing",
        severity: "high",
        description: "Extremely fast claim time suggests possible automation",
        score: 0.8,
      }
    }

    // Very fast but humanly possible claims (100-500ms)
    if (claimLatency < 500) {
      return {
        type: "timing",
        severity: "medium",
        description: "Very fast claim time",
        score: 0.3,
      }
    }

    return {
      type: "timing",
      severity: "low",
      description: "Normal claim timing",
      score: 0,
    }
  }

  private async analyzeUserBehavior(userId: string): Promise<RiskFactor> {
    const profile = this.riskProfiles.get(userId)

    if (!profile) {
      return {
        type: "behavior",
        severity: "low",
        description: "New user, no behavior history",
        score: 0.1,
      }
    }

    // Check for suspicious patterns
    if (profile.recentClaimAttempts > 10) {
      return {
        type: "behavior",
        severity: "medium",
        description: "High frequency of recent claim attempts",
        score: 0.4,
      }
    }

    if (profile.averageClaimLatency < 200) {
      return {
        type: "behavior",
        severity: "high",
        description: "Consistently very fast claim times",
        score: 0.7,
      }
    }

    return {
      type: "behavior",
      severity: "low",
      description: "Normal user behavior",
      score: 0,
    }
  }

  private analyzeDeviceFingerprint(fingerprint: string, userId: string): RiskFactor {
    // Check if this device fingerprint has been used by multiple users
    const usersWithSameFingerprint = this.getUsersWithFingerprint(fingerprint)

    if (usersWithSameFingerprint.length > 3) {
      return {
        type: "device",
        severity: "high",
        description: "Device fingerprint shared across multiple accounts",
        score: 0.9,
      }
    }

    if (usersWithSameFingerprint.length > 1) {
      return {
        type: "device",
        severity: "medium",
        description: "Device fingerprint used by multiple accounts",
        score: 0.5,
      }
    }

    return {
      type: "device",
      severity: "low",
      description: "Unique device fingerprint",
      score: 0,
    }
  }

  private analyzeIpPatterns(ipAddress?: string, userId?: string): RiskFactor {
    if (!ipAddress) {
      return {
        type: "network",
        severity: "low",
        description: "No IP address data",
        score: 0.1,
      }
    }

    // Check for VPN/proxy indicators (simplified)
    if (this.isKnownVpnIp(ipAddress)) {
      return {
        type: "network",
        severity: "medium",
        description: "Connection through VPN or proxy",
        score: 0.3,
      }
    }

    return {
      type: "network",
      severity: "low",
      description: "Normal IP address",
      score: 0,
    }
  }

  private updateUserRiskProfile(userId: string, riskResult: RiskAnalysisResult): void {
    let profile = this.riskProfiles.get(userId)

    if (!profile) {
      profile = {
        userId,
        totalClaimAttempts: 0,
        recentClaimAttempts: 0,
        averageClaimLatency: 0,
        riskScore: 0,
        lastActivity: new Date(),
        deviceFingerprints: [],
        ipAddresses: [],
      }
    }

    profile.totalClaimAttempts++
    profile.recentClaimAttempts++
    profile.riskScore = (profile.riskScore + riskResult.score) / 2 // Moving average
    profile.lastActivity = new Date()

    this.riskProfiles.set(userId, profile)
  }

  private getUsersWithFingerprint(fingerprint: string): string[] {
    const users: string[] = []
    for (const [userId, profile] of this.riskProfiles.entries()) {
      if (profile.deviceFingerprints.includes(fingerprint)) {
        users.push(userId)
      }
    }
    return users
  }

  private isKnownVpnIp(ipAddress: string): boolean {
    // This would check against a database of known VPN/proxy IPs
    // For now, just a simple check
    const vpnIndicators = ["10.", "192.168.", "172.16."]
    return vpnIndicators.some((indicator) => ipAddress.startsWith(indicator))
  }
}

interface RiskProfile {
  userId: string
  totalClaimAttempts: number
  recentClaimAttempts: number
  averageClaimLatency: number
  riskScore: number
  lastActivity: Date
  deviceFingerprints: string[]
  ipAddresses: string[]
}
