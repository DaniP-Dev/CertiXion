import { Module } from '@nestjs/common';
import { DatosCampoController } from './datos-campo.controller';
import { DatosCampoService } from './datos-campo.service';

@Module({
  controllers: [DatosCampoController],
  providers: [DatosCampoService],
})
export class DatosCampoModule {}
