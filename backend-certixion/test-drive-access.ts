import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DriveService } from './src/drive/drive.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const driveService = app.get(DriveService);
  const tenantId = 'danidevcol@gmail.com';
  const fileId = '1oETj197y62lk60Anh2Ls49wgo9MlBu3ARfHySDrJAeM';

  console.log(`🔍 PROBANDO ACCESO FINAL AL ARCHIVO ${fileId}...`);
  
  try {
    const drive = await driveService.getDriveClient(tenantId);
    const res = await drive.files.get({ fileId, fields: 'id, name, mimeType', supportsAllDrives: true });
    console.log('✅ ÉXITO TOTAL. EL ARCHIVO ES VISIBLE:', JSON.stringify(res.data, null, 2));
  } catch (error) {
    console.log('❌ ERROR FINAL:', error.message);
  }
  
  await app.close();
}
bootstrap();
