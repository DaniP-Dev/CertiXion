import { Injectable, InternalServerErrorException, ConflictException, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { DriveService } from '../drive/drive.service';

@Injectable()
export class ClientesService {
  constructor(
    private firebaseService: FirebaseService,
    private driveService: DriveService,
  ) {}

  /**
   * Limpia el NIT removiendo puntos, guiones y espacios
   */
  private cleanNit(nit: string): string {
    return nit.replace(/[\.\-\s]/g, '').toLowerCase();
  }

  async createCliente(tenantId: string, clienteName: string, detalles?: {
    nit?: string; ciudad?: string; departamento?: string; representanteLegal?: string; email?: string; contacto?: string; telefono?: string;
  }) {
    try {
      // Validar que el NIT esté presente
      if (!detalles?.nit) {
        throw new BadRequestException('El NIT es requerido para crear un cliente');
      }

      const cleanedNit = this.cleanNit(detalles.nit);
      
      if (!cleanedNit) {
        throw new BadRequestException('El NIT no es válido (debe contener al menos un carácter alfanumérico)');
      }

      const db = this.firebaseService.getFirestore();
      const tenantRef = db.collection('tenants').doc(tenantId);
      const tenantDoc = await tenantRef.get();
      
      if (!tenantDoc.exists) {
        throw new InternalServerErrorException('Tenant no encontrado en Firestore');
      }

      // Validar que el NIT sea único para este tenant
      const clientesRef = tenantRef.collection('clientes');
      const existingCliente = await clientesRef.doc(cleanedNit).get();
      
      if (existingCliente.exists) {
        throw new ConflictException(`Ya existe un cliente con el NIT ${detalles.nit}`);
      }
      
      // Asegurar estructura raíz (idempotente)
      const { clientesFolderId: rootClientesFolderId } = await this.driveService.ensureRootStructure(tenantId);


      // 3. Crear carpeta principal del cliente en Drive
      const clienteFolderId = await this.driveService.createFolder(tenantId, clienteName, rootClientesFolderId);

      // 4. Crear subcarpeta "documentosGenerales" dentro del cliente para archivos de soporte
      const documentosFolderId = await this.driveService.createFolder(tenantId, 'documentosGenerales', clienteFolderId);

      // 5. Guardar cliente en Firestore con el NIT limpio como ID
      const clienteData = {
        id: cleanedNit,
        nit: detalles.nit,
        nombre: clienteName,
        ciudad: detalles.ciudad || '',
        departamento: detalles.departamento || '',
        representanteLegal: detalles.representanteLegal || '',
        email: detalles.email || '',
        driveFolderId: clienteFolderId,
        documentosFolderId,
        createdAt: new Date().toISOString(),
        contacto: detalles.contacto || '',
        telefono: detalles.telefono || '',
      };

      await clientesRef.doc(cleanedNit).set(clienteData);
      return clienteData;
    } catch (error) {
      throw error instanceof BadRequestException || error instanceof ConflictException 
        ? error
        : new InternalServerErrorException('Error al crear el cliente: ' + error.message);
    }
  }

  async getClientes(tenantId: string) {
    try {
      const db = this.firebaseService.getFirestore();
      const clientesRef = db.collection('tenants').doc(tenantId).collection('clientes');
      const snapshot = await clientesRef.orderBy('createdAt', 'asc').get();
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener clientes: ' + error.message);
    }
  }
}
