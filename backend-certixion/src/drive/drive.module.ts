import { Module, Global } from '@nestjs/common';
import { DriveService } from './drive.service';

@Global()
@Module({
  providers: [DriveService],
  exports: [DriveService],
})
export class DriveModule {}
