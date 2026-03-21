import { Controller, Post, Body } from '@nestjs/common';
import { DatosCampoService } from './datos-campo.service';

@Controller('datos-campo')
export class DatosCampoController {
  constructor(private readonly datosCampoService: DatosCampoService) {}

  @Post()
  async saveDatos(
    @Body('tenantId') tenantId: string,
    @Body('ordenId') ordenId: string,
    @Body('datos') datos: any,
  ) {
    return this.datosCampoService.saveDatos(tenantId, ordenId, datos);
  }
}
