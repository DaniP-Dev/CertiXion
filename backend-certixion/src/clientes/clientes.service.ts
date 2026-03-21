import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { DriveService } from '../drive/drive.service';

@Injectable()
export class ClientesService {
  constructor(
    private firebaseService: FirebaseService,
    private driveService: DriveService,
  ) {}

  async createCliente(tenantId: string, clienteName: string) {
    try {
      const db = this.firebaseService.getFirestore();
      const tenantRef = db.collection('tenants').doc(tenantId);
      const tenantDoc = await tenantRef.get();
      
      if (!tenantDoc.exists) {
        throw new InternalServerErrorException('Tenant no encontrado en Firestore');
      }
      
      const tenantData = tenantDoc.data();
      let certixionFolderId = tenantData?.certixionFolderId;
      
      // 1. Asegurar que existe la carpeta raíz "CERTIXION" para el tenant
      if (!certixionFolderId) {
        certixionFolderId = await this.driveService.createFolder(tenantId, 'CERTIXION');
        await tenantRef.update({ certixionFolderId });
      }

      // 2. Crear estructura en Drive (Directamente dentro de la carpeta CERTIXION)
      const clienteFolderId = await this.driveService.createFolder(tenantId, clienteName, certixionFolderId);

      // 2. Guardar cliente en Firestore
      // Auto-generación de ID CLI-001
      const clientesRef = tenantRef.collection('clientes');
      const snapshot = await clientesRef.get();
      const count = snapshot.size + 1;
      const customId = `CLI-${count.toString().padStart(3, '0')}`;
      
      const newClienteRef = clientesRef.doc(customId);
      
      const clienteData = {
        id: customId,
        nombre: clienteName,
        driveFolderId: clienteFolderId,
        createdAt: new Date().toISOString(),
      };

      await newClienteRef.set(clienteData);

      return clienteData;
    } catch (error) {
      throw new InternalServerErrorException('Error al crear el cliente: ' + error.message);
    }
  }
}
