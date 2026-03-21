import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class ConfiguracionService {
  constructor(private firebaseService: FirebaseService) {}

  async resetDriveMapping(tenantId: string) {
    try {
      const db = this.firebaseService.getFirestore();
      await db.collection('tenants').doc(tenantId).update({
        certixionFolderId: null,
        clientesFolderId: null,
        procedimientosFolderId: null,
      });
      return { message: 'Mapeo de carpetas reiniciado localmente. Se recrearán en la próxima acción.' };
    } catch (error) {
      throw new InternalServerErrorException('Error al reiniciar mapeo: ' + error.message);
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
