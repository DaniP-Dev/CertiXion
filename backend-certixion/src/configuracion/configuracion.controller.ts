import { Controller, Post, Patch, Body, Param } from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';

@Controller('configuracion')
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  @Post('reset-drive/:tenantId')
  async resetDrive(@Param('tenantId') tenantId: string) {
    return this.configuracionService.resetDriveMapping(tenantId);
  }

  @Patch(':tenantId')
  async updateMetadata(
    @Param('tenantId') tenantId: string,
    @Body() metadata: { nombreEmpresa?: string; logoUrl?: string }
  ) {
    return this.configuracionService.updateTenantMetadata(tenantId, metadata);
  }
}
