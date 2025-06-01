import { Injectable, Logger } from "@nestjs/common"
import type { TimeLoopCapsule, StateTransition } from "../entities/time-loop-capsule.entity"
import { CapsuleState, StateTransitionTrigger } from "../entities/time-loop-capsule.entity"

@Injectable()
export class CapsuleStateMachineService {
  private readonly logger = new Logger(CapsuleStateMachineService.name)

  initializeCapsule(capsule: TimeLoopCapsule): void {
    capsule.currentState = CapsuleState.LOCKED
    capsule.stateHistory = []

    this.recordStateTransition(
      capsule,
      CapsuleState.LOCKED,
      CapsuleState.LOCKED,
      StateTransitionTrigger.MANUAL_OVERRIDE,
      "Capsule initialized",
    )
  }

  transitionState(
    capsule: TimeLoopCapsule,
    newState: CapsuleState,
    trigger: StateTransitionTrigger,
    reason: string,
    metadata?: any,
    userId?: string,
  ): boolean {
    const currentState = capsule.currentState

    // Validate state transition
    if (!this.isValidTransition(currentState, newState)) {
      this.logger.warn(`Invalid state transition: ${currentState} -> ${newState} for capsule ${capsule.id}`)
      return false
    }

    // Apply state transition
    capsule.currentState = newState

    // Record transition
    this.recordStateTransition(capsule, currentState, newState, trigger, reason, metadata, userId)

    this.logger.log(`Capsule ${capsule.id} state changed: ${currentState} -> ${newState} (${reason})`)

    return true
  }

  private isValidTransition(fromState: CapsuleState, toState: CapsuleState): boolean {
    const validTransitions: Record<CapsuleState, CapsuleState[]> = {
      [CapsuleState.LOCKED]: [
        CapsuleState.UNLOCKED,
        CapsuleState.GRACE_PERIOD,
        CapsuleState.EXPIRED,
        CapsuleState.INACTIVE,
      ],
      [CapsuleState.UNLOCKED]: [
        CapsuleState.LOCKED,
        CapsuleState.GRACE_PERIOD,
        CapsuleState.PERMANENTLY_UNLOCKED,
        CapsuleState.EXPIRED,
        CapsuleState.INACTIVE,
      ],
      [CapsuleState.GRACE_PERIOD]: [
        CapsuleState.LOCKED,
        CapsuleState.UNLOCKED,
        CapsuleState.EXPIRED,
        CapsuleState.INACTIVE,
      ],
      [CapsuleState.PERMANENTLY_UNLOCKED]: [CapsuleState.EXPIRED, CapsuleState.INACTIVE],
      [CapsuleState.EXPIRED]: [CapsuleState.INACTIVE],
      [CapsuleState.INACTIVE]: [], // Terminal state
    }

    return validTransitions[fromState]?.includes(toState) || false
  }

  private recordStateTransition(
    capsule: TimeLoopCapsule,
    fromState: CapsuleState,
    toState: CapsuleState,
    trigger: StateTransitionTrigger,
    reason: string,
    metadata?: any,
    userId?: string,
  ): void {
    const transition: StateTransition = {
      id: this.generateTransitionId(),
      fromState,
      toState,
      triggeredBy: trigger,
      triggeredAt: new Date(),
      userId,
      reason,
      metadata,
    }

    capsule.stateHistory.push(transition)
  }

  getStateTransitionHistory(capsule: TimeLoopCapsule): StateTransition[] {
    return [...capsule.stateHistory].sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
  }

  canTransitionTo(capsule: TimeLoopCapsule, targetState: CapsuleState): boolean {
    return this.isValidTransition(capsule.currentState, targetState)
  }

  getAvailableTransitions(capsule: TimeLoopCapsule): CapsuleState[] {
    const validTransitions: Record<CapsuleState, CapsuleState[]> = {
      [CapsuleState.LOCKED]: [
        CapsuleState.UNLOCKED,
        CapsuleState.GRACE_PERIOD,
        CapsuleState.EXPIRED,
        CapsuleState.INACTIVE,
      ],
      [CapsuleState.UNLOCKED]: [
        CapsuleState.LOCKED,
        CapsuleState.GRACE_PERIOD,
        CapsuleState.PERMANENTLY_UNLOCKED,
        CapsuleState.EXPIRED,
        CapsuleState.INACTIVE,
      ],
      [CapsuleState.GRACE_PERIOD]: [
        CapsuleState.LOCKED,
        CapsuleState.UNLOCKED,
        CapsuleState.EXPIRED,
        CapsuleState.INACTIVE,
      ],
      [CapsuleState.PERMANENTLY_UNLOCKED]: [CapsuleState.EXPIRED, CapsuleState.INACTIVE],
      [CapsuleState.EXPIRED]: [CapsuleState.INACTIVE],
      [CapsuleState.INACTIVE]: [],
    }

    return validTransitions[capsule.currentState] || []
  }

  private generateTransitionId(): string {
    return `transition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
