import { Controller, Post, Get, Query, Body } from '@nestjs/common';
import { ClientesService } from './clientes.service';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  async createCliente(
    @Body('tenantId') tenantId: string,
    @Body('nombre') nombre: string,
    @Body('nit') nit: string,
    @Body('direccion') direccion: string,
    @Body('contacto') contacto: string,
    @Body('telefono') telefono: string,
  ) {
    return this.clientesService.createCliente(tenantId, nombre, { nit, direccion, contacto, telefono });
  }

  @Get()
  async getClientes(@Query('tenantId') tenantId: string) {
    return this.clientesService.getClientes(tenantId);
  }
}
