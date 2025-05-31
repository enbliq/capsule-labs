import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler, Logger } from "@nestjs/common"
import type { Observable } from "rxjs"
import { tap } from "rxjs/operators"
import type { Request } from "express"

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name)

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>()
    const { method, url, ip } = request
    const userAgent = request.get("User-Agent") || ""
    const startTime = Date.now()

    this.logger.log(`${method} ${url} - ${ip} - ${userAgent}`)

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse()
        const { statusCode } = response
        const responseTime = Date.now() - startTime

        this.logger.log(`${method} ${url} - ${statusCode} - ${responseTime}ms - ${ip}`)
      }),
    )
  }
}
