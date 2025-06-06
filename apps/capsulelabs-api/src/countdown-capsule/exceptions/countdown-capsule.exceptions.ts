import { HttpException, HttpStatus } from "@nestjs/common"

export class CountdownCapsuleNotFoundException extends HttpException {
  constructor(capsuleId: string) {
    super(`Countdown capsule with ID ${capsuleId} not found`, HttpStatus.NOT_FOUND)
  }
}

export class CountdownAlreadyStartedException extends HttpException {
  constructor() {
    super("Countdown capsule has already been started", HttpStatus.CONFLICT)
  }
}

export class CountdownNotStartedException extends HttpException {
  constructor() {
    super("Countdown capsule has not been started yet", HttpStatus.BAD_REQUEST)
  }
}

export class InvalidDurationException extends HttpException {
  constructor() {
    super("Duration must be between 1 minute and 1 year", HttpStatus.BAD_REQUEST)
  }
}
