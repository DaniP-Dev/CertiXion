import { Module } from '@nestjs/common';
import { AlcancesController } from './alcances.controller';
import { AlcancesService } from './alcances.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { DriveModule } from '../drive/drive.module';

@Module({
  imports: [FirebaseModule, DriveModule],
  controllers: [AlcancesController],
  providers: [AlcancesService],
  exports: [AlcancesService],
})
export class AlcancesModule {}
