import { Injectable, InternalServerErrorException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { DriveService } from '../drive/drive.service';
import * as crypto from 'crypto';

@Injectable()
export class EstacionesService {
  constructor(
    private firebaseService: FirebaseService,
    private driveService: DriveService,
  ) {}

  async createEstacion(tenantId: string, datos: {
    clienteId: string;
    nombreEDS: string;
    sicom?: string;
    departamento?: string;
    ciudad?: string;
    direccion?: string;
    contactoLocal?: string;
    telefonoContacto?: string;
  }) {
    try {
      if (!datos.clienteId || !datos.nombreEDS) {
        throw new BadRequestException('El clienteId y el nombre de la EDS son obligatorios');
      }

      const db = this.firebaseService.getFirestore();
      const tenantRef = db.collection('tenants').doc(tenantId);
      
      // Obtener datos del cliente para acceder a su carpeta en Drive
      const clienteDoc = await tenantRef.collection('clientes').doc(datos.clienteId).get();
      if (!clienteDoc.exists) {
        throw new NotFoundException(`El cliente ${datos.clienteId} no existe`);
      }
      const clienteData = clienteDoc.data();
      const clienteDriveId = clienteData?.driveFolderId;

      if (!clienteDriveId) {
        throw new BadRequestException('El cliente no tiene una carpeta de Drive asignada');
      }

      // Estructura de Drive: cliente_00X -> estaciones -> estacion_00X -> documentosGenerales
      const estacionesRootId = await this.driveService.ensureFolderExists(tenantId, 'estaciones', clienteDriveId);
      const estacionFolderId = await this.driveService.createFolder(tenantId, datos.nombreEDS, estacionesRootId);
      const documentosFolderId = await this.driveService.createFolder(tenantId, 'documentosGenerales', estacionFolderId);

      // Auto-generate a short ID for the station (e.g. EDS-1A2B3C)
      const shortId = 'EDS-' + crypto.randomBytes(3).toString('hex').toUpperCase();

      const estacionData = {
        id: shortId,
        clienteId: datos.clienteId,
        nombreEDS: datos.nombreEDS,
        sicom: datos.sicom || '',
        departamento: datos.departamento || '',
        ciudad: datos.ciudad || '',
        direccion: datos.direccion || '',
        contactoLocal: datos.contactoLocal || '',
        telefonoContacto: datos.telefonoContacto || '',
        driveFolderId: estacionFolderId,
        documentosFolderId: documentosFolderId,
        createdAt: new Date().toISOString(),
      };

      await tenantRef.collection('estaciones').doc(shortId).set(estacionData);
      
      return estacionData;
    } catch (error) {
      throw error instanceof BadRequestException || error instanceof NotFoundException
        ? error
        : new InternalServerErrorException('Error al crear la estación: ' + error.message);
    }
  }

  async getEstaciones(tenantId: string, clienteId?: string) {
    try {
      const db = this.firebaseService.getFirestore();
      let query: FirebaseFirestore.Query = db.collection('tenants').doc(tenantId).collection('estaciones');

      if (clienteId) {
        query = query.where('clienteId', '==', clienteId);
      }

      // Firestore requires composite index if ordering with where, so we just order in memory if filtering
      const snapshot = await query.get();
      const estaciones = snapshot.docs.map(doc => doc.data());
      
      // Sort by creation date
      return estaciones.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener estaciones: ' + error.message);
    }
  }
}
