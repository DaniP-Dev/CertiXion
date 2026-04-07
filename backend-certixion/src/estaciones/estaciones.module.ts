import { Module } from '@nestjs/common';
import { EstacionesController } from './estaciones.controller';
import { EstacionesService } from './estaciones.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { DriveModule } from '../drive/drive.module';

@Module({
  imports: [FirebaseModule, DriveModule],
  controllers: [EstacionesController],
  providers: [EstacionesService],
})
export class EstacionesModule {}
