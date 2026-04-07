import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PlantillasService } from './src/plantillas/plantillas.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const plantillasService = app.get(PlantillasService);
  const tenantId = 'danidevcol@gmail.com';
  
  console.log('🚀 REGISTRANDO NUEVAS PLANTILLAS...');
  
  const plantillas = [
    {
      id: 'PLANTILLA_ORDEN_INSPECCION',
      driveFileId: '1p0DzuIluwnbOVBZ9vEFAUwjBbNn07Zm5XwMSKzG4EmI',
      nombre: 'Orden de Inspección',
      tipo: 'Google_Docs' as any
    },
    {
      id: 'PLANTILLA_INFOFINAL_IEDS',
      driveFileId: '1RFVbrHQH5-QnKdErm5GGtt4SZR8fdTZkb0jtM3QjFn8',
      nombre: 'Informe Final IEDS',
      tipo: 'Google_Docs' as any
    },
    {
      id: 'PLANTILLA_INFOFINAL_HMTCD',
      driveFileId: '1WIPcN7y1pO0xyHMtX-BwJFGbwNPzvbocMvSmCt8jOlA',
      nombre: 'Informe Final HMTCD',
      tipo: 'Google_Docs' as any
    },
    {
      id: 'PLANTILLA_ACTA_INSPECCION',
      driveFileId: '1hmkbpVLaLoTwJJS-K1j8guzakyUkGmdcomLcpxxSV2U',
      nombre: 'Acta de Inspección',
      tipo: 'Google_Docs' as any
    },
    {
      id: 'PLANTILLA_INFOCAMPO_IEDS',
      driveFileId: '1hHE93CPfKYJY1yxXOlfItdNxEYkzear78l22XUGr0Ag',
      nombre: 'Informe de Campo IEDS',
      tipo: 'Google_Sheets' as any
    },
    {
      id: 'PLANTILLA_INFOCAMPO_HMTCD',
      driveFileId: '1BRVDFSH1vuFtA2qrdxzft0V5vQ5nCyQ3228b-27qaO8',
      nombre: 'Informe de Campo HMTCD',
      tipo: 'Google_Sheets' as any
    }
  ];

  for (const p of plantillas) {
    console.log(`Poblando ${p.id}...`);
    await plantillasService.savePlantilla(tenantId, p.id, {
      driveFileId: p.driveFileId,
      nombre: p.nombre,
      tipo: p.tipo
    });
  }
  
  console.log('✅ Todas las plantillas vinculadas exitosamente en Firestore.');
  
  await app.close();
}
bootstrap();
