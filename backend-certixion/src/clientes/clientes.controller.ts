import { Controller, Post, Body } from '@nestjs/common';
import { ClientesService } from './clientes.service';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  async createCliente(
    @Body('tenantId') tenantId: string, 
    @Body('nombre') nombre: string
  ) {
    return this.clientesService.createCliente(tenantId, nombre);
  }
}
