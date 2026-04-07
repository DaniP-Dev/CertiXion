import { Controller, Post, Get, Query, Body } from '@nestjs/common';
import { ClientesService } from './clientes.service';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  async createCliente(
    @Body('tenantId') tenantId: string,
    @Body('nombre') nombre: string,
    @Body() detalles: any, // Tomamos todo lo demas en detalles
  ) {
    // Validar en el servicio. Le pasamos el objeto entero
    return this.clientesService.createCliente(tenantId, nombre, detalles);
  }

  @Get()
  async getClientes(@Query('tenantId') tenantId: string) {
    return this.clientesService.getClientes(tenantId);
  }
}
