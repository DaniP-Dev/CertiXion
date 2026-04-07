import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { DriveService } from '../drive/drive.service';

@Injectable()
export class ConfiguracionService {
  constructor(
    private firebaseService: FirebaseService,
    private driveService: DriveService,
  ) {}

  async syncDriveStructure(tenantId: string) {
    try {
      await this.driveService.ensureRootStructure(tenantId);
      return { message: 'Estructura de Drive sincronizada correctamente' };
    } catch (error) {
      throw new InternalServerErrorException('Error al sincronizar Drive: ' + error.message);
    }
  }

  async updateTenantMetadata(tenantId: string, metadata: { nombreEmpresa?: string; logoUrl?: string }) {
    try {
      const db = this.firebaseService.getFirestore();
      await db.collection('tenants').doc(tenantId).update(metadata);
      return { message: 'Configuración de empresa actualizada' };
    } catch (error) {
      throw new InternalServerErrorException('Error al actualizar configuración: ' + error.message);
    }
  }
}
