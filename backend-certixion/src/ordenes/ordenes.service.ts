import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { DriveService } from '../drive/drive.service';

@Injectable()
export class OrdenesService {
  constructor(
    private firebaseService: FirebaseService,
    private driveService: DriveService,
  ) {}

  async createOrden(tenantId: string, clienteId: string, detalles: {
    descripcion: string;
    tipoInspeccion?: string;
    alcance?: string;
    direccion?: string;
    contacto?: string;
    telefono?: string;
    fechaProgramada?: string;
    inspectorEmail?: string;
    ventanaHoraria?: string;
    observacionesLogisticas?: string;
  }) {
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
      const year = new Date().getFullYear();
      const customId = `INS-${year}-${count.toString().padStart(3, '0')}`;
      
      // 3. Validar que el Alcance seleccionado esté definido para el tenant
      const alcanceId = detalles.tipoInspeccion;
      if (!alcanceId) {
        throw new Error('El Tipo de Inspección es obligatorio.');
      }
      const alcanceDoc = await db.collection('tenants').doc(tenantId).collection('alcances').doc(alcanceId).get();
      if (!alcanceDoc.exists) {
        throw new NotFoundException(`El alcance ${alcanceId} no está definido para este tenant. Por favor regístralo primero.`);
      }

      // 4. Obtener carpeta de destino basada en el alcance (Anidamiento Plano con Nombres Completos)
      let targetFolderId = clienteData.driveFolderId;
      let scopeFolderName = '';

      if (alcanceId === 'INS-EDS') {
        scopeFolderName = 'Inspección de Estación de Servicio';
      } else if (alcanceId === 'INS-HERM-L') {
        scopeFolderName = 'Hermeticidad en Líneas';
      } else if (alcanceId === 'INS-HERM-T') {
        scopeFolderName = 'Hermeticidad en Tanques';
      }

      if (scopeFolderName) {
        targetFolderId = await this.driveService.createFolder(tenantId, scopeFolderName, targetFolderId);
      }

      // 5. Crear estructura de la orden
      const ordenFolderId = await this.driveService.createFolder(tenantId, `Orden de Trabajo - ${customId}`, targetFolderId);
      
      // Crear Documentos base usando la API de Google Docs dentro de Drive
      const ordenDocId = await this.driveService.createDocument(tenantId, `Orden Trabajo - ${customId}`, ordenFolderId);
      await this.driveService.createDocument(tenantId, `Informe Campo - ${customId}`, ordenFolderId);
      await this.driveService.createDocument(tenantId, `Informe Final - ${customId}`, ordenFolderId);

      // 4. Guardar orden en Firestore con todos los detalles
      // Filtrar valores undefined para evitar errores en Firestore
      const detallesLimpios = Object.fromEntries(
        Object.entries(detalles).filter(([_, value]) => value !== undefined && value !== '')
      );
      
      const ordenData = {
        id: customId,
        clienteId,
        clienteNombre: clienteData.nombre,
        driveFolderId: ordenFolderId,
        estado: 'pendiente',
        createdAt: new Date().toISOString(),
        ...detallesLimpios,
      };

      await ordenesRef.doc(customId).set(ordenData);

      // 5. Rellenar el documento de Orden de Trabajo con los datos del formulario
      await this.driveService.populateOrderDocument(tenantId, ordenDocId, ordenData);

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
      
      // Intentar con orderBy primero
      try {
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        return snapshot.docs.map((doc: any) => doc.data());
      } catch (error: any) {
        // Si falla por índice, obtener sin ordenar y ordenar en memoria
        console.warn('getOrdenes sin orderBy (índice no existe):', error.message);
        const snapshot = await query.get();
        const docs = snapshot.docs.map((doc: any) => doc.data());
        // Ordenar en memoria por createdAt descendente
        return docs.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
      }
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener órdenes: ' + error.message);
    }
  }
}
