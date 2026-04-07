import { Module } from '@nestjs/common';
import { ConfiguracionController } from './configuracion.controller';
import { ConfiguracionService } from './configuracion.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { DriveModule } from '../drive/drive.module';

@Module({
  imports: [FirebaseModule, DriveModule],
  controllers: [ConfiguracionController],
  providers: [ConfiguracionService],
  exports: [ConfiguracionService],
})
export class ConfiguracionModule {}
