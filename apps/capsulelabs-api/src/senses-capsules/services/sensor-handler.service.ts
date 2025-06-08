import { Injectable, Logger, BadRequestException } from "@nestjs/common"
import { TaskType } from "../dto/sense-task.dto"

@Injectable()
export class SensorHandlerService {
  private readonly logger = new Logger(SensorHandlerService.name)

  async handleQRScan(taskData: any, taskMetadata: any): Promise<boolean> {
    this.logger.log("Processing QR scan task")

    const { qrData } = taskData
    if (!qrData) {
      throw new BadRequestException("QR data is required")
    }

    // Validate QR code format or content if needed
    if (taskMetadata.requiredPattern && taskMetadata.requiredPattern !== "any") {
      const pattern = new RegExp(taskMetadata.requiredPattern)
      if (!pattern.test(qrData)) {
        return false
      }
    }

    return true
  }

  async handleSoundRecord(taskData: any, taskMetadata: any): Promise<boolean> {
    this.logger.log("Processing sound recording task")

    const { audioBlob, duration, decibels } = taskData
    if (!audioBlob) {
      throw new BadRequestException("Audio data is required")
    }

    // Validate duration
    if (taskMetadata.duration && duration < taskMetadata.duration) {
      return false
    }

    // Validate minimum decibel level
    if (taskMetadata.minDecibels && decibels < taskMetadata.minDecibels) {
      return false
    }

    return true
  }

  async handlePhotoCapture(taskData: any, taskMetadata: any): Promise<boolean> {
    this.logger.log("Processing photo capture task")

    const { imageBlob, colors, category } = taskData
    if (!imageBlob) {
      throw new BadRequestException("Image data is required")
    }

    // Validate color requirements
    if (taskMetadata.minColors && colors && colors.length < taskMetadata.minColors) {
      return false
    }

    // Validate category for smell/taste tasks
    if (taskMetadata.category && category !== taskMetadata.category) {
      return false
    }

    return true
  }

  async handleVoiceCommand(taskData: any, taskMetadata: any): Promise<boolean> {
    this.logger.log("Processing voice command task")

    const { transcript } = taskData
    if (!transcript) {
      throw new BadRequestException("Voice transcript is required")
    }

    // Check if the spoken phrase matches the required phrase
    if (taskMetadata.phrase) {
      const normalizedTranscript = transcript.toLowerCase().trim()
      const normalizedPhrase = taskMetadata.phrase.toLowerCase().trim()

      return normalizedTranscript.includes(normalizedPhrase)
    }

    return true
  }

  async handleGestureDetect(taskData: any, taskMetadata: any): Promise<boolean> {
    this.logger.log("Processing gesture detection task")

    const { gestureType, direction, coordinates } = taskData
    if (!gestureType) {
      throw new BadRequestException("Gesture type is required")
    }

    // Validate gesture type
    if (taskMetadata.gestureType && gestureType !== taskMetadata.gestureType) {
      return false
    }

    // Validate direction if specified
    if (taskMetadata.direction && taskMetadata.direction !== "any" && direction !== taskMetadata.direction) {
      return false
    }

    return true
  }

  async handleVibrationDetect(taskData: any, taskMetadata: any): Promise<boolean> {
    this.logger.log("Processing vibration detection task")

    const { detectedPattern } = taskData
    if (!detectedPattern) {
      throw new BadRequestException("Vibration pattern data is required")
    }

    // Validate vibration pattern if specified
    if (taskMetadata.pattern) {
      return this.compareVibrationPatterns(detectedPattern, taskMetadata.pattern)
    }

    return true
  }

  async handleColorIdentify(taskData: any, taskMetadata: any): Promise<boolean> {
    this.logger.log("Processing color identification task")

    const { identifiedColor } = taskData
    if (!identifiedColor) {
      throw new BadRequestException("Identified color is required")
    }

    // Check if the identified color is in the target colors
    if (taskMetadata.targetColors && Array.isArray(taskMetadata.targetColors)) {
      return taskMetadata.targetColors.includes(identifiedColor.toLowerCase())
    }

    return true
  }

  async handlePatternMatch(taskData: any, taskMetadata: any): Promise<boolean> {
    this.logger.log("Processing pattern matching task")

    const { matchedPattern, accuracy } = taskData
    if (!matchedPattern) {
      throw new BadRequestException("Pattern match data is required")
    }

    // Validate accuracy threshold
    if (taskMetadata.minAccuracy && accuracy < taskMetadata.minAccuracy) {
      return false
    }

    return true
  }

  async validateTaskCompletion(taskType: TaskType, taskData: any, taskMetadata: any): Promise<boolean> {
    switch (taskType) {
      case TaskType.QR_SCAN:
        return this.handleQRScan(taskData, taskMetadata)
      case TaskType.SOUND_RECORD:
        return this.handleSoundRecord(taskData, taskMetadata)
      case TaskType.PHOTO_CAPTURE:
        return this.handlePhotoCapture(taskData, taskMetadata)
      case TaskType.VOICE_COMMAND:
        return this.handleVoiceCommand(taskData, taskMetadata)
      case TaskType.GESTURE_DETECT:
        return this.handleGestureDetect(taskData, taskMetadata)
      case TaskType.VIBRATION_DETECT:
        return this.handleVibrationDetect(taskData, taskMetadata)
      case TaskType.COLOR_IDENTIFY:
        return this.handleColorIdentify(taskData, taskMetadata)
      case TaskType.PATTERN_MATCH:
        return this.handlePatternMatch(taskData, taskMetadata)
      default:
        throw new BadRequestException(`Unsupported task type: ${taskType}`)
    }
  }

  private compareVibrationPatterns(detected: number[], expected: number[]): boolean {
    if (detected.length !== expected.length) {
      return false
    }

    const tolerance = 50 // 50ms tolerance
    return detected.every((duration, index) => Math.abs(duration - expected[index]) <= tolerance)
  }
}
