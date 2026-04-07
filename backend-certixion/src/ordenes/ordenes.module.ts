import { Module } from '@nestjs/common';
import { OrdenesController } from './ordenes.controller';
import { OrdenesService } from './ordenes.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { DriveModule } from '../drive/drive.module';
import { PlantillasModule } from '../plantillas/plantillas.module';

@Module({
  imports: [FirebaseModule, DriveModule, PlantillasModule],
  controllers: [OrdenesController],
  providers: [OrdenesService],
})
export class OrdenesModule {}
