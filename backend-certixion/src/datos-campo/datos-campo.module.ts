import { Module } from '@nestjs/common';
import { DatosCampoController } from './datos-campo.controller';
import { DatosCampoService } from './datos-campo.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { DriveModule } from '../drive/drive.module';

@Module({
  imports: [FirebaseModule, DriveModule],
  controllers: [DatosCampoController],
  providers: [DatosCampoService],
})
export class DatosCampoModule {}
