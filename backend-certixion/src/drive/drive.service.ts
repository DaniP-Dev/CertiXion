import { Injectable, UnauthorizedException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { google, drive_v3, docs_v1 } from 'googleapis';

@Injectable()
export class DriveService {
  constructor(private firebaseService: FirebaseService) {}

  /**
   * Obtiene un cliente OAuth2 autenticado y configura el listener de refresco de tokens.
   */
  private async getAuthenticatedClient(tenantId: string) {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('tenants').doc(tenantId).get();
    
    if (!doc.exists) {
      throw new UnauthorizedException('Tenant no configurado en Firestore');
    }

    const data = doc.data();
    if (!data?.googleTokens) {
      throw new UnauthorizedException('El Tenant no tiene tokens de Google vinculados');
    }

    const { access_token, refresh_token } = data.googleTokens;
    const oauth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID, 
      process.env.CLIENT_SECRET, 
      process.env.REDIRECT_URI
    );
    
    oauth2Client.setCredentials({ access_token, refresh_token });

    // Escuchar cuando el token se actualice de fondo para guardarlo de nuevo en Firestore
    oauth2Client.on('tokens', async (tokens) => {
      console.log('🔄 Renovando tokens de Google para el tenant...');
      const updateData: any = {};
      if (tokens.access_token) {
        updateData['googleTokens.access_token'] = tokens.access_token;
      }
      if (tokens.refresh_token) {
        updateData['googleTokens.refresh_token'] = tokens.refresh_token;
      }
      updateData['updatedAt'] = new Date().toISOString();
      await db.collection('tenants').doc(tenantId).update(updateData);
    });

    return oauth2Client;
  }

  /**
   * Obtiene la instancia de la API de Drive
   */
  async getDriveClient(tenantId: string): Promise<drive_v3.Drive> {
    const auth = await this.getAuthenticatedClient(tenantId);
    return google.drive({ version: 'v3', auth });
  }

  /**
   * Obtiene el cliente de Google Sheets
   */
  async getSheetsClient(tenantId: string) {
    const auth = await this.getAuthenticatedClient(tenantId);
    return google.sheets({ version: 'v4', auth });
  }

  /**
   * Obtiene el cliente de Google Docs
   */
  async getDocsClient(tenantId: string): Promise<docs_v1.Docs> {
    const auth = await this.getAuthenticatedClient(tenantId);
    return google.docs({ version: 'v1', auth });
  }

  /**
   * Crea una carpeta en Google Drive
   */
  async createFolder(tenantId: string, folderName: string, parentFolderId?: string): Promise<string> {
    const drive = await this.getDriveClient(tenantId);
    const fileMetadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : [],
    };
    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });
    return folder.data.id as string;
  }

  /**
   * Busca una carpeta por nombre dentro de un padre específico
   */
  async findFolderByName(tenantId: string, folderName: string, parentFolderId: string): Promise<string | null> {
    const drive = await this.getDriveClient(tenantId);
    const query = `name = '${folderName.replace(/'/g, "\\'")}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const response = await drive.files.list({ q: query, fields: 'files(id)' });
    const files = response.data.files;
    return (files && files.length > 0) ? (files[0].id as string) : null;
  }

  /**
   * Asegura que una carpeta existe, si no la crea.
   * Si folderId es nulo o inválido, busca por nombre antes de crear.
   */
  async ensureFolderExists(tenantId: string, folderName: string, parentFolderId?: string): Promise<string> {
    const drive = await this.getDriveClient(tenantId);
    
    // Si tenemos un parentId, intentamos buscar por nombre allí primero
    if (parentFolderId) {
      const existingId = await this.findFolderByName(tenantId, folderName, parentFolderId);
      if (existingId) return existingId;
    } else {
      // Búsqueda en la raíz de Drive
      const query = `name = '${folderName.replace(/'/g, "\\")}' and 'root' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const response = await drive.files.list({ q: query, fields: 'files(id)' });
      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id as string;
      }
    }

    // Si no existe, crear
    return this.createFolder(tenantId, folderName, parentFolderId);
  }

  /**
   * Asegura la estructura raíz del tenant de forma inteligente e idempotente.
   */
  async ensureRootStructure(tenantId: string) {
    const db = this.firebaseService.getFirestore();
    const tenantRef = db.collection('tenants').doc(tenantId);
    const doc = await tenantRef.get();
    
    if (!doc.exists) throw new Error('Tenant no encontrado al asegurar estructura');
    const data = doc.data();

    // 1. Carpeta CERTIXION (Raíz)
    const certixionId = await this.ensureFolderExists(tenantId, 'CERTIXION');
    
    // 2. Subcarpetas principales
    const clientesId = await this.ensureFolderExists(tenantId, 'Clientes', certixionId);
    const alcancesId = await this.ensureFolderExists(tenantId, 'Alcances', certixionId);
    const settingsId = await this.ensureFolderExists(tenantId, 'Configuracion', certixionId);

    // 3. Subcarpetas de configuración
    const plantillasId = await this.ensureFolderExists(tenantId, 'Plantillas', settingsId);

    // 4. Actualizar Firestore
    const updateData = {
      certixionFolderId: certixionId,
      clientesFolderId: clientesId,
      procedimientosFolderId: alcancesId, // Mantenemos el nombre de campo actual para no romper compatibilidad
      configuracionFolderId: settingsId,
      plantillasFolderId: plantillasId,
      updatedAt: new Date().toISOString(),
    };

    await tenantRef.update(updateData);
    return updateData;
  }

  /**
   * Crea un documento (Docs)
   */
  async createDocument(tenantId: string, documentName: string, parentFolderId: string): Promise<string> {
    const drive = await this.getDriveClient(tenantId);
    const doc = await drive.files.create({
      requestBody: { name: documentName, mimeType: 'application/vnd.google-apps.document', parents: [parentFolderId] },
      fields: 'id',
    });
    return doc.data.id as string;
  }

  /**
   * Crea una hoja de cálculo (Sheets)
   */
  async createSpreadsheet(tenantId: string, name: string, parentFolderId: string): Promise<string> {
    const drive = await this.getDriveClient(tenantId);
    const sheet = await drive.files.create({
      requestBody: { name: name, mimeType: 'application/vnd.google-apps.spreadsheet', parents: [parentFolderId] },
      fields: 'id',
    });
    return sheet.data.id as string;
  }

  /**
   * Copia un archivo de Drive y le asigna un nuevo nombre y destino.
   */
  async copyFile(tenantId: string, fileId: string, newName: string, parentFolderId: string): Promise<string> {
    const drive = await this.getDriveClient(tenantId);
    const response = await drive.files.copy({
      fileId,
      requestBody: {
        name: newName,
        parents: [parentFolderId],
      },
      fields: 'id',
      supportsAllDrives: true,
    });
    return response.data.id as string;
  }

  /**
   * Reemplaza todos los textos en un documento de Google Docs basándose en un mapa de etiquetas.
   */
  async replaceTextInDoc(tenantId: string, documentId: string, replacements: Record<string, string>) {
    const docs = await this.getDocsClient(tenantId);
    
    const requests = Object.entries(replacements).map(([key, value]) => ({
      replaceAllText: {
        containsText: {
          text: key,
          matchCase: false,
        },
        replaceText: value || '',
      },
    }));

    if (requests.length === 0) return;

    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });
  }

  /**
   * Genera un documento a partir de una plantilla aplicando reemplazos de variables.
   */
  async createFromTemplate(
    tenantId: string, 
    templateId: string, 
    newName: string, 
    destinationFolderId: string, 
    replacements: Record<string, string>
  ) {
    console.log(`📂 Copiando plantilla ${templateId} para generar ${newName}...`);
    const newDocId = await this.copyFile(tenantId, templateId, newName, destinationFolderId);
    
    console.log(`📝 Reemplazando variables en el nuevo documento ${newDocId}...`);
    await this.replaceTextInDoc(tenantId, newDocId, replacements);
    
    return newDocId;
  }

  /**
   * Escribe los datos de la Orden de Trabajo (Legacy - manteniendo por compatibilidad si es necesario)
   */
  async populateOrderDocument(tenantId: string, docId: string, detalles: any) {
    console.log(`📝 Poblando Orden de Trabajo Doc ID: ${docId}...`);
    const docs = await this.getDocsClient(tenantId);
    const fecha = detalles.fechaProgramada
      ? new Date(detalles.fechaProgramada + 'T00:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'Por definir';

    const content = [
      `ORDEN DE TRABAJO - ${detalles.id}`,
      '',
      '--- IDENTIFICACIÓN DEL CLIENTE ---',
      `Cliente: ${detalles.clienteNombre || 'N/A'}`,
      '',
      '--- IDENTIFICACIÓN DE LA INSPECCIÓN ---',
      `Tipo de Servicio: ${detalles.tipoInspeccion || 'N/A'}`,
      `Alcance: ${detalles.descripcion || 'N/A'}`,
      '',
      '--- UBICACIÓN Y CONTACTO ---',
      `Nombre EDS: ${detalles.edsNombre || 'N/A'}`,
      `Persona de Contacto: ${detalles.contacto || 'N/A'}`,
      `Teléfono: ${detalles.telefono || 'N/A'}`,
      '',
      '--- PROGRAMACIÓN ---',
      `Fecha Programada: ${fecha}`,
      `Inspector Asignado: ${detalles.inspectorEmail || 'N/A'}`,
      '',
      '--- FIRMAS ---',
      'Inspector: ________________________________   Fecha: ___________',
      '',
      'Director Técnico: ________________________   Fecha: ___________',
    ].join('\n');

    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests: [{ insertText: { location: { index: 1 }, text: content } }] },
    });
    console.log(`✅ Orden de Trabajo Doc ID: ${docId} poblada.`);
  }

  /**
   * Escribe el Informe de Campo en Sheets (Excel)
   */
  async populateFieldReport(tenantId: string, spreadsheetId: string, orden: any, fieldData: any) {
    console.log(`📝 [populateFieldReport] Iniciando para Spreadsheet: ${spreadsheetId}`);
    try {
      const drive = await this.getDriveClient(tenantId);
      console.log('🔍 [populateFieldReport] Verificando mimeType...');
      const file = await drive.files.get({ fileId: spreadsheetId, fields: 'mimeType' });
      console.log(`📄 [populateFieldReport] MimeType detectado: ${file.data.mimeType}`);
      
      if (file.data.mimeType !== 'application/vnd.google-apps.spreadsheet') {
        throw new Error('Formato incompatible (Doc vs Spreadsheet). Use una orden nueva.');
      }

      const sheets = await this.getSheetsClient(tenantId);
      console.log('📊 [populateFieldReport] Generando matriz de valores...');
      let values: any[][] = [];

      if (orden.tipoInspeccion.includes('HERM') || orden.tipoInspeccion.includes('PH')) {
        const { readings, fuelType, capacity, targetPSI, manometroId, resultado } = fieldData;
        const psi5 = parseFloat(readings[1]?.psi) || 0;
        const psi60 = parseFloat(readings[12]?.psi) || 0;
        const drop = (psi5 - psi60).toFixed(2);

        values = [
          ['INFORME DE CAMPO - HERMETICIDAD'],
          [`ORDEN: ${orden.id}`, `FECHA: ${new Date().toLocaleDateString('es-CO')}`],
          [`CLIENTE: ${orden.clienteNombre}`, `EDS: ${orden.edsNombre}`],
          [`ÍTEM: ${orden.itemId || 'General'}`],
          [],
          ['INFORMACIÓN DE LA PRUEBA'],
          ['Combustible', fuelType, 'Capacidad (Gal)', capacity],
          ['PSI Objetivo', targetPSI, 'ID Manómetro', manometroId],
          [],
          ['MEDICIONES 60 MINUTOS'],
          ['Minuto', 'PSI', 'Temperatura (°C)', 'Observaciones'],
          ...readings.map((r: any) => [r.minute, r.psi, r.temp, r.obs || '']),
          [],
          ['ANÁLISIS DE RESULTADO'],
          ['PSI Inicial (5 min)', psi5],
          ['PSI Final (60 min)', psi60],
          ['Diferencia (Caída)', drop],
          ['RESULTADO FINAL', resultado],
        ];
      } else {
        const { secciones, observaciones, resultado } = fieldData;
        values = [
          ['INFORME DE CAMPO - INSPECCIÓN'],
          [`ORDEN: ${orden.id}`, `FECHA: ${new Date().toLocaleDateString('es-CO')}`],
          [`CLIENTE: ${orden.clienteNombre}`, `EDS: ${orden.edsNombre}`],
          [],
          ['RESULTADO FINAL', resultado],
          ['OBSERVACIONES', observaciones || 'Sin observaciones.'],
          [],
          ['LISTA DE CHEQUEO'],
          ['Sección', 'Estado', 'Ítem / Criterio', 'Valor/Observación'],
        ];

        Object.entries(secciones || {}).forEach(([section, items]: [string, any]) => {
          items.forEach((item: any) => {
            values.push([section, item.checked ? 'CONFORME' : 'NO CONFORME', item.label, item.value || '']);
          });
        });
      }

      console.log('📑 [populateFieldReport] Obteniendo información de la hoja...');
      const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetName = spreadsheetInfo.data.sheets?.[0]?.properties?.title || 'Sheet1';
      console.log(`📍 [populateFieldReport] Usando hoja: "${sheetName}"`);

      console.log('📤 [populateFieldReport] Enviando actualización a Google Sheets...');
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values },
      });
      console.log(`✅ [populateFieldReport] Éxito para ID: ${spreadsheetId}`);
    } catch (err: any) {
      console.error(`❌ [populateFieldReport] ERROR CRÍTICO:`, err.response?.data || err.message);
      throw err;
    }
  }

  /**
   * Escribe el Informe Final consolidado.
   * Si el documento proviene de una plantilla con shortcodes, los reemplaza.
   */
  async populateFinalReport(tenantId: string, docId: string, orden: any, fieldData: any) {
    console.log(`📝 Poblando Informe Final Doc ID: ${docId}...`);
    
    const replacements: Record<string, string> = {
      '{{resultado_final}}': fieldData.resultado?.toUpperCase() || 'SIN RESULTADO',
      '{{fecha_final}}': new Date().toLocaleDateString('es-CO'),
      '{{orden_id}}': orden.id,
    };

    if (orden.tipoInspeccion.includes('HERM') || orden.tipoInspeccion.includes('PH')) {
      const { readings, resultado } = fieldData;
      const psi5 = parseFloat(readings[1]?.psi) || 0;
      const psi60 = parseFloat(readings[12]?.psi) || 0;
      const drop = (psi5 - psi60).toFixed(2);
      
      replacements['{{psi_inicial}}'] = psi5.toString();
      replacements['{{psi_final}}'] = psi60.toString();
      replacements['{{psi_caida}}'] = drop;
      replacements['{{resumen_campo}}'] = `Presión Inicial: ${psi5} PSI, Final: ${psi60} PSI. Caída: ${drop} PSI. Resultado: ${resultado}`;
    } else {
      const { secciones, resultado } = fieldData;
      const flatItems = Object.values(secciones || {}).flat() as any[];
      const total = flatItems.length;
      const conforme = flatItems.filter((i: any) => i.checked).length;
      
      replacements['{{total_evaluados}}'] = total.toString();
      replacements['{{conforme_evaluados}}'] = conforme.toString();
      replacements['{{no_conforme_evaluados}}'] = (total - conforme).toString();
      replacements['{{resumen_campo}}'] = `Puntos Evaluados: ${total}, Conformidad: ${conforme}/${total}. Resultado: ${resultado}`;
    }

    // Primero intentamos reemplazar shortcodes en el documento
    await this.replaceTextInDoc(tenantId, docId, replacements);
    console.log(`✅ Informe Final Doc ID: ${docId} poblado via shortcodes.`);
  }

  /**
   * Genera el contenido del Acta de Inspección (Apertura y Cierre) en texto plano
   * si no se proporcionó una plantilla.
   */
  async populateActaDocument(tenantId: string, docId: string, orden: any) {
    console.log(`📝 Generando Acta de Inspección básica en Doc ID: ${docId}...`);
    const docs = await this.getDocsClient(tenantId);
    
    const content = [
      'COMPAÑÍA SERVICREP S.A.S. - ACTA DE INSPECCIÓN',
      '═══════════════════════════════════════════════════════════════',
      '',
      `ORDEN DE TRABAJO: ${orden.id}`,
      `FECHA: ${new Date().toLocaleDateString('es-CO')}`,
      '',
      '1. REUNIÓN DE APERTURA',
      'En la fecha y hora indicadas, se da inicio a la inspección técnica.',
      `- Alcance: ${orden.tipoInspeccion}`,
      `- EDS: ${orden.edsNombre}`,
      '- Objetivos y metodología comunicados al cliente: [ ] SÍ  [ ] NO',
      '- Restricciones o condiciones especiales: _________________________________',
      '',
      '2. PARTICIPANTES (Apertura)',
      'Nombre: __________________________ Cargo: __________________________',
      'Nombre: __________________________ Cargo: __________________________',
      '',
      '3. REUNIÓN DE CIERRE Y HALLAZGOS',
      'Se finalizan las actividades de campo y se comunican los resultados generales.',
      '- Hallazgos Críticos detectados: __________________________________________',
      '- Observaciones / Compromisos: ____________________________________________',
      '- Los resultados han sido discutidos y aclarados con el cliente: [ ] SÍ  [ ] NO',
      '',
      '4. FIRMAS DE CIERRE',
      '',
      '________________________________   ________________________________',
      'Firma Cliente / EDS                Firma Inspector Seleccionado',
      `Nombre:                            Nombre: ${orden.inspectorNombre || 'N/A'}`,
      'Cargo:                             CC / Registro:',
    ].join('\n');

    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests: [{ insertText: { location: { index: 1 }, text: content } }] },
    });
    console.log(`✅ Acta de Inspección básica generada en Doc ID: ${docId}.`);
  }
}
