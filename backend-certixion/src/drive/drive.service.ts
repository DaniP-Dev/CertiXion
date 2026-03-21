import { Injectable, UnauthorizedException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { google, drive_v3 } from 'googleapis';

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
}
