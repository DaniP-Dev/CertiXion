import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { DriveService } from '../drive/drive.service';

@Injectable()
export class OrdenesService {
  constructor(
    private firebaseService: FirebaseService,
    private driveService: DriveService,
  ) {}

  async createOrden(tenantId: string, clienteId: string, descripcion: string) {
    try {
      const db = this.firebaseService.getFirestore();
      
      // 1. Obtener datos del cliente para su Drive Folder
      const clienteRef = db.collection('tenants').doc(tenantId).collection('clientes').doc(clienteId);
      const clienteDoc = await clienteRef.get();
      
      if (!clienteDoc.exists) {
        throw new NotFoundException(`Cliente ${clienteId} no encontrado en Firestore`);
      }
      const clienteData = clienteDoc.data();
      if (!clienteData) {
        throw new NotFoundException(`Data del cliente no encontrada`);
      }
      
      // 2. Generar ID auto-incremental (INS-2026-001)
      const ordenesRef = db.collection('tenants').doc(tenantId).collection('ordenes');
      const snapshot = await ordenesRef.get();
      const count = snapshot.size + 1;
      const customId = `INS-2026-${count.toString().padStart(3, '0')}`;
      
      // 3. Crear estructura en Drive
      const ordenFolderId = await this.driveService.createFolder(tenantId, `Orden de Trabajo - ${customId}`, clienteData.driveFolderId);
      
      // Crear Documentos base usando la API de Google Docs dentro de Drive
      await this.driveService.createDocument(tenantId, `01-OrdenTrabajo-${customId}`, ordenFolderId);
      await this.driveService.createDocument(tenantId, `02-InformeCampo-${customId}`, ordenFolderId);
      await this.driveService.createDocument(tenantId, `03-InformeFinal-${customId}`, ordenFolderId);

      // 4. Guardar orden en Firestore
      const ordenData = {
        id: customId,
        clienteId,
        descripcion,
        driveFolderId: ordenFolderId,
        estado: 'pendiente',
        createdAt: new Date().toISOString(),
      };

      await ordenesRef.doc(customId).set(ordenData);

      return ordenData;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error al crear la orden: ' + error.message);
    }
  }

  async getOrden(tenantId: string, id: string) {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('tenants').doc(tenantId).collection('ordenes').doc(id).get();
    
    if (!doc.exists) {
      throw new NotFoundException(`Orden ${id} no encontrada`);
    }
    return doc.data();
  }

  async getOrdenes(tenantId: string, clienteId?: string) {
    try {
      const db = this.firebaseService.getFirestore();
      let query: any = db.collection('tenants').doc(tenantId).collection('ordenes');
      if (clienteId) {
        query = query.where('clienteId', '==', clienteId);
      }
      const snapshot = await query.orderBy('createdAt', 'desc').get();
      return snapshot.docs.map((doc: any) => doc.data());
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener órdenes: ' + error.message);
    }
  }
}
