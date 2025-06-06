import { HttpException, HttpStatus } from "@nestjs/common"

export class EmotionCapsuleNotFoundException extends HttpException {
  constructor(capsuleId: string) {
    super(`Emotion capsule with ID ${capsuleId} not found`, HttpStatus.NOT_FOUND)
  }
}

export class InvalidEmotionException extends HttpException {
  constructor(emotion: string) {
    super(`Invalid emotion: ${emotion}`, HttpStatus.BAD_REQUEST)
  }
}

export class InvalidConfidenceException extends HttpException {
  constructor() {
    super("Confidence must be between 0 and 1", HttpStatus.BAD_REQUEST)
  }
}
