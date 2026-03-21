import { Controller, Get, Post, Delete, Body, Param, NotFoundException } from '@nestjs/common';
import { AlcancesService, Alcance } from './alcances.service';

@Controller('alcances')
export class AlcancesController {
  constructor(private readonly alcancesService: AlcancesService) {}

  @Get(':tenantId')
  async getAlcances(@Param('tenantId') tenantId: string): Promise<Alcance[]> {
    return this.alcancesService.getAlcances(tenantId);
  }

  @Post()
  async createAlcance(
    @Body('tenantId') tenantId: string,
    @Body('id') id: string,
    @Body('nombre') nombre: string,
  ): Promise<Alcance> {
    return this.alcancesService.createAlcance(tenantId, id, nombre);
  }

  @Delete(':tenantId/:id')
  async deleteAlcance(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.alcancesService.deleteAlcance(tenantId, id);
    return { message: `Alcance ${id} eliminado correctamente` };
  }
}
