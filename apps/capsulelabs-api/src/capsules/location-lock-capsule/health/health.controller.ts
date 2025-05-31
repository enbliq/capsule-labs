import { Controller, Get } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger"
import {
  type HealthCheckService,
  HealthCheck,
  type TypeOrmHealthIndicator,
  type MemoryHealthIndicator,
  type DiskHealthIndicator,
} from "@nestjs/terminus"

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Health check",
    description: "Check the health status of the application and its dependencies",
  })
  @ApiResponse({
    status: 200,
    description: "Health check successful",
    schema: {
      example: {
        status: "ok",
        info: {
          database: { status: "up" },
          memory_heap: { status: "up" },
          memory_rss: { status: "up" },
          storage: { status: "up" },
        },
        error: {},
        details: {
          database: { status: "up" },
          memory_heap: { status: "up" },
          memory_rss: { status: "up" },
          storage: { status: "up" },
        },
      },
    },
  })
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck("database"),
      () => this.memory.checkHeap("memory_heap", 150 * 1024 * 1024),
      () => this.memory.checkRSS("memory_rss", 150 * 1024 * 1024),
      () => this.disk.checkStorage("storage", { path: "/", thresholdPercent: 0.9 }),
    ])
  }

  @Get("ready")
  @ApiOperation({
    summary: "Readiness check",
    description: "Check if the application is ready to serve requests",
  })
  @ApiResponse({
    status: 200,
    description: "Application is ready",
  })
  ready() {
    return { status: "ready", timestamp: new Date().toISOString() }
  }

  @Get("live")
  @ApiOperation({
    summary: "Liveness check",
    description: "Check if the application is alive",
  })
  @ApiResponse({
    status: 200,
    description: "Application is alive",
  })
  live() {
    return { status: "alive", timestamp: new Date().toISOString() }
  }
}
