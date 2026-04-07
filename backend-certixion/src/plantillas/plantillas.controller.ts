import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PlantillasService, Plantilla } from './plantillas.service';

@Controller('plantillas')
export class PlantillasController {
  constructor(private readonly plantillasService: PlantillasService) {}

  @Get()
  async getPlantillas(@Query('tenantId') tenantId: string) {
    return this.plantillasService.getPlantillas(tenantId);
  }

  @Post(':id')
  async savePlantilla(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() data: Partial<Plantilla>,
  ) {
    return this.plantillasService.savePlantilla(tenantId, id, data);
  }
}
