import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { DriveService } from '../drive/drive.service';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';

export interface PuntoHermeticidad {
  punto: string;           
  presionInicio: number;   
  presionFinal: number;    
  tiempoPrueba: number;    
  temperatura: number;     
  resultado: 'Aprueba' | 'No Aprueba';
  observaciones: string;
}

export interface DatosHermeticidad {
  ordenId: string;
  inspector: string;
  fechaInspeccion: string;   
  puntos: PuntoHermeticidad[];
  observacionesGenerales: string;
}

@Injectable()
export class DatosCampoService {
  constructor(
    private firebaseService: FirebaseService,
    private driveService: DriveService,
  ) {}

  async generarInformeCampoHermeticidad(tenantId: string, datos: DatosHermeticidad): Promise<any> {
    try {
      const db = this.firebaseService.getFirestore();
      const ordenRef = db.collection('tenants').doc(tenantId).collection('ordenes').doc(datos.ordenId);
      const ordenDoc = await ordenRef.get();

      if (!ordenDoc.exists) {
        throw new NotFoundException(`La orden ${datos.ordenId} no existe`);
      }

      const ordenData = ordenDoc.data()!;

      // 1. Guardar datos en Firestore
      const datosRef = ordenRef.collection('datosCampo').doc('hermeticidad');
      await datosRef.set({
        tipo: 'hermeticidad',
        ...datos,
        creadoEn: new Date().toISOString(),
      });

      // 2. Generar Excel
      const buffer = await this.buildExcel(datos, ordenData);

      // 3. Subir a Drive
      const drive = await this.driveService.getDriveClient(tenantId);
      const fileName = `02-InformeCampo-${datos.ordenId}.xlsx`;

      // Eliminar versión previa si existe
      const existing = await drive.files.list({
        q: `'${ordenData.driveFolderId}' in parents and name='${fileName}' and trashed=false`,
        fields: 'files(id)',
      });
      for (const f of existing.data.files || []) {
        await drive.files.delete({ fileId: f.id! });
      }

      const readable = Readable.from(buffer);
      const res = await drive.files.create({
        requestBody: {
          name: fileName,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          parents: [ordenData.driveFolderId],
        },
        media: {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          body: readable,
        },
        fields: 'id, webViewLink',
      });

      const driveLink = res.data.webViewLink;

      // 4. Actualizar orden
      await datosRef.update({ driveFileId: res.data.id, driveLink });
      await ordenRef.update({ informeCampoLink: driveLink, estado: 'en proceso' });

      return { driveLink };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error al generar informe: ' + error.message);
    }
  }

  private async buildExcel(datos: DatosHermeticidad, orden: any): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Hermeticidad');

    ws.columns = [
      { width: 30 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 30 }
    ];

    ws.mergeCells('A1:G1');
    const title = ws.getCell('A1');
    title.value = 'INFORME DE INSPECCIÓN DE CAMPO - HERMETICIDAD';
    title.font = { bold: true, size: 14 };
    title.alignment = { horizontal: 'center' };

    ws.addRow(['Orden:', datos.ordenId, '', 'Cliente:', orden.clienteNombre || 'N/A']);
    ws.addRow(['Inspector:', datos.inspector, '', 'Fecha:', datos.fechaInspeccion]);
    ws.addRow([]);

    const header = ws.addRow(['Punto', 'P. Inicial', 'P. Final', 'Tiempo', 'Temp.', 'Resultado', 'Observaciones']);
    header.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    });

    datos.puntos.forEach(p => {
      const row = ws.addRow([p.punto, p.presionInicio, p.presionFinal, p.tiempoPrueba, p.temperatura, p.resultado, p.observaciones]);
      const resCell = row.getCell(6);
      resCell.font = { bold: true, color: { argb: p.resultado === 'Aprueba' ? 'FF006400' : 'FFCC0000' } };
    });

    ws.addRow([]);
    ws.addRow(['Observaciones Generales:']);
    ws.addRow([datos.observacionesGenerales]);

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async saveDatos(tenantId: string, ordenId: string, datos: any) {
    const db = this.firebaseService.getFirestore();
    const ordenRef = db.collection('tenants').doc(tenantId).collection('ordenes').doc(ordenId);
    const datosRef = ordenRef.collection('datosCampo').doc();
    const payload = { id: datosRef.id, datos, estado: 'completado', createdAt: new Date().toISOString() };
    await datosRef.set(payload);
    return payload;
  }
}
