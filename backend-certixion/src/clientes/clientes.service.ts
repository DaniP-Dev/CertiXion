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
      let rootClientesFolderId = tenantData?.clientesFolderId;
      
      // 1. Asegurar que existe la carpeta raíz "CERTIXION" para el tenant
      if (!certixionFolderId) {
        certixionFolderId = await this.driveService.createFolder(tenantId, 'CERTIXION');
        await tenantRef.update({ certixionFolderId });
      }

      // 2. Asegurar que existe el Módulo "Clientes" dentro de "CERTIXION"
      if (!rootClientesFolderId) {
        rootClientesFolderId = await this.driveService.createFolder(tenantId, 'Clientes', certixionFolderId);
        await tenantRef.update({ clientesFolderId: rootClientesFolderId });
      }

      // 3. Crear Estructura en Drive (Dentro de la carpeta del Módulo Clientes)
      const clienteFolderId = await this.driveService.createFolder(tenantId, clienteName, rootClientesFolderId);

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
