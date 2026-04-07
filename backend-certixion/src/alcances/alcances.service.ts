import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { DriveService } from '../drive/drive.service';

export interface Alcance {
  id: string; // Ej: INS-EDS
  nombre: string; // Ej: Estaciones de Servicio
  folderId: string; // Carpeta principal del alcance
  subFolders: {
    procedimientos: string; // Procedimientos
    informes: string; // Formatos
    registros: string; // Registros
  };
}

@Injectable()
export class AlcancesService {
  constructor(
    private firebaseService: FirebaseService,
    private driveService: DriveService,
  ) {}

  /**
   * Obtiene la estructura raíz de "Alcances" para el tenant de forma idempotente.
   */
  private async getRootFolderId(tenantId: string): Promise<string> {
    const { procedimientosFolderId } = await this.driveService.ensureRootStructure(tenantId);
    return procedimientosFolderId;
  }

  async getAlcances(tenantId: string): Promise<Alcance[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection('tenants').doc(tenantId).collection('alcances').get();
    return snapshot.docs.map(doc => doc.data() as Alcance);
  }

  async createAlcance(tenantId: string, id: string, nombre: string): Promise<Alcance> {
    try {
      const db = this.firebaseService.getFirestore();
      
      // 0. Verificar si ya existe para evitar duplicados
      const existing = await db.collection('tenants').doc(tenantId).collection('alcances').doc(id).get();
      if (existing.exists) {
        throw new Error(`El alcance ${id} ya está definido.`);
      }

      const rootId = await this.getRootFolderId(tenantId);
      
      // 1. Crear carpeta del alcance
      const folderName = nombre;
      const alcanceFolderId = await this.driveService.createFolder(tenantId, folderName, rootId);

      // 2. Crear subcarpetas
      const procedimientosId = await this.driveService.createFolder(tenantId, 'Procedimientos', alcanceFolderId);
      const informesId = await this.driveService.createFolder(tenantId, 'Formatos', alcanceFolderId);
      const registrosId = await this.driveService.createFolder(tenantId, 'Registros', alcanceFolderId);

      const alcance: Alcance = {
        id,
        nombre,
        folderId: alcanceFolderId,
        subFolders: {
          procedimientos: procedimientosId,
          informes: informesId,
          registros: registrosId,
        },
      };

      await db.collection('tenants').doc(tenantId).collection('alcances').doc(id).set(alcance);
      return alcance;
    } catch (error) {
      throw new InternalServerErrorException('Error al crear alcance: ' + error.message);
    }
  }

  async deleteAlcance(tenantId: string, id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection('tenants').doc(tenantId).collection('alcances').doc(id).delete();
    // Nota: Por ahora no borramos las carpetas en Drive por seguridad/historial
  }
}
