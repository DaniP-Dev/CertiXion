import { Injectable, UnauthorizedException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { google, drive_v3, docs_v1 } from 'googleapis';

@Injectable()
export class DriveService {
  constructor(private firebaseService: FirebaseService) {}

  /**
   * Obtiene la instancia de la API de Drive inicializada con los tokens del Tenant.
   */
  async getDriveClient(tenantId: string): Promise<drive_v3.Drive> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('tenants').doc(tenantId).get();
    
    if (!doc.exists) {
      throw new UnauthorizedException('Tenant no configurado en la base de datos');
    }

    const data = doc.data();
    if (!data?.googleTokens) {
      throw new UnauthorizedException('El Tenant no tiene tokens de Google Drive configurados');
    }

    const { access_token, refresh_token } = data.googleTokens;

    const oauth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token,
      refresh_token,
    });

    // Escuchar cuando el token se actualice de fondo para guardarlo de nuevo
    oauth2Client.on('tokens', async (tokens) => {
      const updateData: any = {};
      if (tokens.access_token) {
        updateData['googleTokens.access_token'] = tokens.access_token;
      }
      if (tokens.refresh_token) {
        updateData['googleTokens.refresh_token'] = tokens.refresh_token; // Muy raro que se devuelva de nuevo, pero por seguridad
      }
      updateData['updatedAt'] = new Date().toISOString();
      
      await db.collection('tenants').doc(tenantId).update(updateData);
    });

    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Crea una carpeta en Google Drive y retorna su ID
   */
  async createFolder(tenantId: string, folderName: string, parentFolderId?: string): Promise<string> {
    const drive = await this.getDriveClient(tenantId);
    
    const fileMetadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    
    if (parentFolderId) {
      fileMetadata.parents = [parentFolderId];
    }

    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });

    return folder.data.id as string;
  }

  /**
   * Crea un documento (Docs) en una carpeta específica
   */
  async createDocument(tenantId: string, documentName: string, parentFolderId: string): Promise<string> {
    const drive = await this.getDriveClient(tenantId);
    
    const fileMetadata: any = {
      name: documentName,
      mimeType: 'application/vnd.google-apps.document',
      parents: [parentFolderId],
    };

    const doc = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });

    return doc.data.id as string;
  }

  /**
   * Obtiene el cliente de Google Docs
   */
  async getDocsClient(tenantId: string): Promise<docs_v1.Docs> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('tenants').doc(tenantId).get();
    const data = doc.data();
    const { access_token, refresh_token } = data?.googleTokens;
    const oauth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.REDIRECT_URI
    );
    oauth2Client.setCredentials({ access_token, refresh_token });
    return google.docs({ version: 'v1', auth: oauth2Client });
  }

  /**
   * Escribe los datos de la Orden de Trabajo en el Google Doc correspondiente
   */
  async populateOrderDocument(tenantId: string, docId: string, detalles: {
    id: string; clienteId: string; clienteNombre?: string;
    tipoInspeccion?: string; descripcion?: string;
    direccion?: string; contacto?: string; telefono?: string;
    fechaProgramada?: string; inspectorEmail?: string;
    ventanaHoraria?: string; observacionesLogisticas?: string;
  }) {
    const docs = await this.getDocsClient(tenantId);

    const fecha = detalles.fechaProgramada
      ? new Date(detalles.fechaProgramada + 'T00:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'Por definir';

    const content = [
      `ORDEN DE TRABAJO - ${detalles.id}`,
      '',
      '--- IDENTIFICACIÓN DEL CLIENTE ---',
      `Cliente: ${detalles.clienteNombre || detalles.clienteId}  (${detalles.clienteId})`,
      '',
      '--- IDENTIFICACIÓN DE LA INSPECCIÓN ---',
      `Código de Orden: ${detalles.id}`,
      `Tipo de Inspección: ${detalles.tipoInspeccion || 'N/A'}`,
      `Alcance: ${detalles.descripcion || 'N/A'}`,
      '',
      '--- UBICACIÓN Y CONTACTO ---',
      `Dirección del Sitio: ${detalles.direccion || 'N/A'}`,
      `Persona de Contacto: ${detalles.contacto || 'N/A'}`,
      `Teléfono: ${detalles.telefono || 'N/A'}`,
      '',
      '--- PROGRAMACIÓN ---',
      `Fecha Programada: ${fecha}`,
      `Inspector Asignado: ${detalles.inspectorEmail || 'N/A'}`,
      `Ventana Horaria: ${detalles.ventanaHoraria || 'N/A'}`,
      '',
      '--- LOGÍSTICA ---',
      `Observaciones: ${detalles.observacionesLogisticas || 'Ninguna'}`,
      '',
      '--- FIRMAS ---',
      'Inspector: ________________________________   Fecha: ___________',
      '',
      'Director Técnico: ________________________   Fecha: ___________',
    ].join('\n');

    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: content,
            },
          },
        ],
      },
    });
  }
}
