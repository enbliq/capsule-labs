import { type ExceptionFilter, Catch, type ArgumentsHost, HttpException, HttpStatus, Logger } from "@nestjs/common"
import type { Request, Response } from "express"

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let status: number
    let message: string | object

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()
      message = typeof exceptionResponse === "string" ? exceptionResponse : exceptionResponse
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR
      message = "Internal server error"

      // Log unexpected errors
      this.logger.error(`Unexpected error: ${exception}`, exception instanceof Error ? exception.stack : undefined)
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    }

    // Log client errors (4xx) as warnings, server errors (5xx) as errors
    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url}`, JSON.stringify(errorResponse))
    } else if (status >= 400) {
      this.logger.warn(`${request.method} ${request.url}`, JSON.stringify(errorResponse))
    }

    response.status(status).json(errorResponse)
  }
}
