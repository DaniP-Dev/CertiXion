import { Controller, Post, Get, Query, Body } from '@nestjs/common';
import { EstacionesService } from './estaciones.service';

@Controller('estaciones')
export class EstacionesController {
  constructor(private readonly estacionesService: EstacionesService) {}

  @Post()
  async createEstacion(
    @Body('tenantId') tenantId: string,
    @Body() body: any
  ) {
    // Extracting all fields from body except tenantId which is bound separately
    const { tenantId: _, ...datos } = body;
    return this.estacionesService.createEstacion(tenantId, datos);
  }

  @Get()
  async getEstaciones(
    @Query('tenantId') tenantId: string,
    @Query('clienteId') clienteId?: string
  ) {
    return this.estacionesService.getEstaciones(tenantId, clienteId);
  }
}
