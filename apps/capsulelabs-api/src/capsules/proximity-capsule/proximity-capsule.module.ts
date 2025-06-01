import { Module } from "@nestjs/common"
import { ProximityCapsuleController } from "./controllers/proximity-capsule.controller"
import { ProximityCapsuleService } from "./services/proximity-capsule.service"
import { ProximityValidationService } from "./services/proximity-validation.service"
import { GroupManagementService } from "./services/group-management.service"
import { BluetoothProximityService } from "./services/bluetooth-proximity.service"
import { NetworkProximityService } from "./services/network-proximity.service"
import { GpsProximityService } from "./services/gps-proximity.service"
import { ProximityGateway } from "./gateways/proximity.gateway"

@Module({
  controllers: [ProximityCapsuleController],
  providers: [
    ProximityCapsuleService,
    ProximityValidationService,
    GroupManagementService,
    BluetoothProximityService,
    NetworkProximityService,
    GpsProximityService,
    ProximityGateway,
  ],
  exports: [ProximityCapsuleService, ProximityValidationService],
})
export class ProximityCapsuleModule {}
