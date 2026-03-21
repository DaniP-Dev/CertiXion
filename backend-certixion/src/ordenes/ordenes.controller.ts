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
    @Body('tipoInspeccion') tipoInspeccion: string,
    @Body('alcance') alcance: string,
    @Body('direccion') direccion: string,
    @Body('contacto') contacto: string,
    @Body('telefono') telefono: string,
    @Body('fechaProgramada') fechaProgramada: string,
    @Body('inspectorEmail') inspectorEmail: string,
    @Body('ventanaHoraria') ventanaHoraria: string,
    @Body('observacionesLogisticas') observacionesLogisticas: string,
  ) {
    return this.ordenesService.createOrden(tenantId, clienteId, {
      descripcion, tipoInspeccion, alcance, direccion, contacto,
      telefono, fechaProgramada, inspectorEmail, ventanaHoraria, observacionesLogisticas,
    });
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
