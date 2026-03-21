import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { OrdenesService } from './ordenes.service';

@Controller('ordenes')
export class OrdenesController {
  constructor(private readonly ordenesService: OrdenesService) {}

  @Post()
  async createOrden(
    @Body('tenantId') tenantId: string,
    @Body('clienteId') clienteId: string,
    @Body('descripcion') descripcion: string,
  ) {
    return this.ordenesService.createOrden(tenantId, clienteId, descripcion);
  }

  @Get(':id')
  async getOrden(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.ordenesService.getOrden(tenantId, id);
  }

  @Get()
  async getOrdenes(
    @Query('tenantId') tenantId: string,
    @Query('clienteId') clienteId?: string,
  ) {
    return this.ordenesService.getOrdenes(tenantId, clienteId);
  }
}
