import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PlantillasService } from './src/plantillas/plantillas.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const plantillasService = app.get(PlantillasService);
  const tenantId = 'danidevcol@gmail.com';
  
  console.log('🚀 FORZANDO VINCULACIÓN DE PLANTILLA OT...');
  
  const id = 'OT';
  const data = {
    driveFileId: '1oETj197y62lk60Anh2Ls49wgo9MlBu3ARfHySDrJAeM',
    nombre: 'Orden de Inspección',
    tipo: 'Google_Docs' as any
  };

  await plantillasService.savePlantilla(tenantId, id, data);
  
  console.log('✅ Plantilla vinculada exitosamente en Firestore.');
  
  const verif = await plantillasService.getPlantilla(tenantId, 'OT');
  console.log('Verificación:', JSON.stringify(verif, null, 2));
  
  await app.close();
}
bootstrap();
