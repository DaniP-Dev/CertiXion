import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { DriveService } from '../drive/drive.service';
import { PlantillasService } from '../plantillas/plantillas.service';

@Injectable()
export class OrdenesService {
  constructor(
    private firebaseService: FirebaseService,
    private driveService: DriveService,
    private plantillasService: PlantillasService,
  ) {}

  /**
   * Obtiene el siguiente número de consecutivo para un tipo de inspección específico
   * y lo incrementa de forma atómica en Firestore.
   */
  private async getNextConsecutivo(tenantId: string, tipoId: string): Promise<{ prefix: string; current: string }> {
    const db = this.firebaseService.getFirestore();
    const configRef = db.collection('tenants').doc(tenantId).collection('config').doc('folios');
    
    // Configuración por defecto según los requerimientos iniciales
    const DEFAULTS: Record<string, { prefix: string; padding: number }> = {
      'INS-EDS': { prefix: 'SRV-INSP-', padding: 3 },
      'INS-HERM-L': { prefix: 'SRV-PHL-', padding: 3 },
      'INS-HERM-T': { prefix: 'SRV-PHT-', padding: 3 },
    };

    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(configRef);
      const data = doc.exists ? doc.data() : { series: {} };
      
      const series = data?.series || {};
      const config = series[tipoId] || DEFAULTS[tipoId] || { prefix: 'SRV-GEN-', padding: 3 };
      const currentNext = config.next || 1;
      
      const paddedNumber = currentNext.toString().padStart(config.padding || 3, '0');
      const prefix = config.prefix;

      // Actualizar el siguiente número
      transaction.set(configRef, {
        series: {
          ...series,
          [tipoId]: {
            ...config,
            next: currentNext + 1
          }
        }
      }, { merge: true });

      return { prefix, current: paddedNumber };
    });

    return result;
  }

  async createOrden(tenantId: string, clienteId: string, detalles: {
    estacionId: string;
    itemId?: string;
    descripcion: string;
    tipoInspeccion: string;
    fechaProgramada?: string;
    inspectorEmail?: string;
    inspectorCelular?: string;
    inspectorCompetencia?: string;
    inspectorAutorizacion?: string;
    ventanaHoraria?: string;
    observacionesLogisticas?: string;
    fechaSugerida?: string;
    horarioEspecial?: string;
    condiciones?: string;
    solicitanteNombre?: string;
    solicitanteCargo?: string;
    resultadoValidacion?: string;
  }) {
    try {
      const db = this.firebaseService.getFirestore();
      
      // 1. Obtener datos del cliente
      const clienteRef = db.collection('tenants').doc(tenantId).collection('clientes').doc(clienteId);
      const clienteDoc = await clienteRef.get();
      
      if (!clienteDoc.exists) throw new NotFoundException(`Cliente ${clienteId} no encontrado`);
      const clienteData = clienteDoc.data();
      if (!clienteData) throw new InternalServerErrorException('Data del cliente no encontrada');

      // 1.5. Obtener datos de la Estacion (EDS)
      if (!detalles.estacionId) throw new BadRequestException('El estacionId es obligatorio');
      const estacionRef = db.collection('tenants').doc(tenantId).collection('estaciones').doc(detalles.estacionId);
      const estacionDoc = await estacionRef.get();
      if (!estacionDoc.exists) throw new NotFoundException(`Estación ${detalles.estacionId} no encontrada`);
      const estacionData = estacionDoc.data();

      const tenantDoc = await db.collection('tenants').doc(tenantId).get();
      const tenantData = tenantDoc.data();
      const recepcionNombre = tenantData ? `${tenantData.firstName || ""} ${tenantData.lastName || ""}`.trim() || tenantId : tenantId;

      // 2. Validar Alcance
      const alcanceId = detalles.tipoInspeccion;
      const alcanceDoc = await db.collection('tenants').doc(tenantId).collection('alcances').doc(alcanceId).get();
      if (!alcanceDoc.exists) throw new NotFoundException(`El alcance ${alcanceId} no está definido.`);
      const alcanceData = alcanceDoc.data();
      if (!alcanceData) throw new InternalServerErrorException('Data del alcance no encontrada');
      
      const typeFolderName = alcanceData.nombre;
      const estacionFolderId = estacionData?.driveFolderId;
      if (!estacionFolderId) throw new InternalServerErrorException('La estación no tiene una carpeta de Drive asignada');
      
      const scopeFolderId = await this.driveService.ensureFolderExists(tenantId, typeFolderName, estacionFolderId);

      // 3. Generar Consecutivo
      const { prefix, current } = await this.getNextConsecutivo(tenantId, alcanceId);
      const customId = `${prefix}${current}`;
      const folderName = `${customId}`;
      const ordenFolderId = await this.driveService.createFolder(tenantId, folderName, scopeFolderId);
      
      const docNameBase = `${customId}${detalles.itemId ? ` (${detalles.itemId})` : ''}`;

      // 4. Identificar plantillas
      let plantillaCampoId = 'PLANTILLA_INFOCAMPO_IEDS';
      let plantillaFinalId = 'PLANTILLA_INFOFINAL_IEDS';
      if (alcanceId.includes('HERM') || alcanceId.includes('PH')) {
        plantillaCampoId = 'PLANTILLA_INFOCAMPO_HMTCD';
        plantillaFinalId = 'PLANTILLA_INFOFINAL_HMTCD';
      }

      // 5. Obtener info del inspector
      let inspectorNombre = 'No asignado';
      if (detalles.inspectorEmail) {
        try {
          const inspectorDoc = await db.collection('tenants').doc(tenantId).collection('usuarios').doc(detalles.inspectorEmail).get();
          if (inspectorDoc.exists) {
            inspectorNombre = inspectorDoc.data()?.displayName || detalles.inspectorEmail;
          } else {
            inspectorNombre = detalles.inspectorEmail;
          }
        } catch (e) {
          inspectorNombre = detalles.inspectorEmail;
        }
      }

      // 6. Mapeo DEPURADO de reemplazos para cumplir con la plantilla del usuario
      const replacements: Record<string, string> = {
        '{{cliente_razon_social}}': clienteData.nombre,
        '{{cliente_nit}}': clienteData.nit || 'N/A',
        '{{cliente_sicom}}': estacionData?.sicom || 'No aplica',
        '{{cliente_ciudad}}': estacionData?.nombreEDS || 'No aplica', // El usuario lo pidió así en su esquema
        '{{cliente direcciónEDS}}': estacionData?.direccion || 'No aplica',
        '{{eds_ciudad_departamento}}': estacionData ? `${estacionData.ciudad || ''} / ${estacionData.departamento || ''}` : 'No aplica',
        '{{cliente_representante_legal}}': clienteData.representanteLegal || 'No aplica',
        '{{cliente_correo}}': clienteData.email || 'No aplica',
        '{{servicio_tipo}}': alcanceData.nombre,
        '{{fecha_programada}}': detalles.fechaProgramada || 'Por definir',
        '{{fecha_inspeccion}}': detalles.fechaProgramada || new Date().toLocaleDateString('es-CO'),
        '{{inspector_nombre}}': inspectorNombre,
        '{{inspector_celular}}': detalles.inspectorCelular || 'N/A',
        '{{inspector_correo}}': detalles.inspectorEmail || 'N/A',
        '{{inspector_competencia}}': detalles.inspectorCompetencia || 'Técnica - ISO 17020',
        '{{inspector_autorizacion}}': detalles.inspectorAutorizacion || 'Vigente',
        '{{act_apertura}}': 'X',
        '{{act_ats}}': 'X',
        '{{act_verificacion}}': 'X',
        '{{act_entrevista}}': 'X',
        '{{act_ejecucion}}': 'X',
        '{{act_conclusion}}': 'X',
        '{{act_cierre}}': 'X',
        '{{observaciones_adicionales}}': detalles.descripcion || 'Ninguna',
        '{{resultado_validacion}}': detalles.resultadoValidacion || 'La orden se acepta sin observaciones',
        '{{orden_id}}': customId,
        '{{item_id}}': detalles.itemId || 'N/A',
        '{{solicitante_nombre}}': detalles.solicitanteNombre || 'N/A',
        '{{solicitante_fecha}}': new Date().toLocaleDateString('es-CO'),
      };

      // 7. Crear los 4 documentos
      // A. Orden de Inspección
      const pOrden = await this.plantillasService.getPlantilla(tenantId, 'PLANTILLA_ORDEN_INSPECCION');
      const ordenDocId = pOrden?.driveFileId 
        ? await this.driveService.createFromTemplate(tenantId, pOrden.driveFileId, `Orden Inspección - ${docNameBase}`, ordenFolderId, replacements)
        : await this.driveService.createDocument(tenantId, `Orden Inspección - ${docNameBase}`, ordenFolderId);

      // B. Acta de Inspección (Si no hay plantilla, usaremos populate genericamente luego)
      const pActa = await this.plantillasService.getPlantilla(tenantId, 'PLANTILLA_ACTA_INSPECCION');
      const actaDocId = pActa?.driveFileId
        ? await this.driveService.createFromTemplate(tenantId, pActa.driveFileId, `Acta Inspección - ${docNameBase}`, ordenFolderId, replacements)
        : await this.driveService.createDocument(tenantId, `Acta Inspección - ${docNameBase}`, ordenFolderId);

      // C. Informe de Campo (Es un Spreadsheet, NO usar Docs API para reemplazar texto)
      const pCampo = await this.plantillasService.getPlantilla(tenantId, plantillaCampoId);
      const informeCampoDocId = pCampo?.driveFileId
        ? await this.driveService.copyFile(tenantId, pCampo.driveFileId, `Informe Campo - ${docNameBase}`, ordenFolderId)
        : await this.driveService.createSpreadsheet(tenantId, `Informe Campo - ${docNameBase}`, ordenFolderId);

      // D. Informe Final
      const pFinal = await this.plantillasService.getPlantilla(tenantId, plantillaFinalId);
      const informeFinalDocId = pFinal?.driveFileId
        ? await this.driveService.createFromTemplate(tenantId, pFinal.driveFileId, `Informe Final - ${docNameBase}`, ordenFolderId, replacements)
        : await this.driveService.createDocument(tenantId, `Informe Final - ${docNameBase}`, ordenFolderId);

      // Si no hubo plantillas, poblar con texto básico para que no queden vacíos
      if (!pOrden?.driveFileId) await this.driveService.populateOrderDocument(tenantId, ordenDocId, { ...detalles, id: customId, clienteNombre: clienteData.nombre, inspectorNombre });
      if (!pActa?.driveFileId) await this.driveService.populateActaDocument(tenantId, actaDocId, { ...detalles, id: customId, inspectorNombre });
      
      // El informe final también se puede pre-poblar si no hay plantilla, 
      // pero usualmente se espera a tener datos de campo. 
      // Si quieres que tenga algo desde ya:
      if (!pFinal?.driveFileId) {
        await this.driveService.populateFinalReport(tenantId, informeFinalDocId, { id: customId, clienteNombre: clienteData.nombre, edsNombre: estacionData?.nombreEDS, tipoInspeccion: alcanceData.nombre }, { resultado: 'Pendiente' });
      }

      // 5. Guardar orden en Firestore
      const ordenesRef = db.collection('tenants').doc(tenantId).collection('ordenes');
      const ordenData = {
        id: customId,
        clienteId,
        clienteNombre: clienteData.nombre,
        estacionId: detalles.estacionId,
        alcanceId,
        tipoInspeccion: alcanceData.nombre,
        edsNombre: estacionData?.nombreEDS || '',
        itemId: detalles.itemId || '',
        descripcion: detalles.descripcion || '',
        direccion: estacionData?.direccion || '',
        contacto: estacionData?.contactoLocal || '',
        telefono: estacionData?.telefonoContacto || '',
        fechaProgramada: detalles.fechaProgramada || null,
        inspectorEmail: detalles.inspectorEmail || null,
        inspectorNombre,
        estado: 'pendiente',
        driveFolderId: ordenFolderId,
        ordenDocId,
        actaDocId,
        informeCampoDocId,
        informeFinalDocId,
        createdAt: new Date().toISOString(),
      };
      
      await ordenesRef.doc(customId).set(ordenData);
      return ordenData;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error al crear la orden: ' + error.message);
    }
  }

  /**
   * Guarda los datos recolectados en campo y actualiza el documento de Drive.
   */
  async saveFieldData(tenantId: string, id: string, fieldData: any, estado?: string) {
    try {
      const db = this.firebaseService.getFirestore();
      const ordenRef = db.collection('tenants').doc(tenantId).collection('ordenes').doc(id);
      const ordenDoc = await ordenRef.get();
      
      if (!ordenDoc.exists) throw new NotFoundException(`Orden ${id} no encontrada`);
      const ordenData = ordenDoc.data();
      if (!ordenData) throw new InternalServerErrorException('Error al obtener datos de la orden');

      // 1. Guardar en Firestore
      const updateData: any = { fieldData };
      if (estado) updateData.estado = estado;
      console.log(`💾 Guardando datos de campo en Firestore para orden: ${id}...`);
      await ordenRef.update(updateData);

      // Poblar reporte de campo en Drive (siempre se actualiza el de campo)
      const updatedOrdenData = { ...ordenDoc.data(), ...updateData };
      console.log(`📊 Actualizando reporte de campo (Excel) ID: ${updatedOrdenData.informeCampoDocId}...`);
      await this.driveService.populateFieldReport(tenantId, updatedOrdenData.informeCampoDocId, updatedOrdenData, fieldData);

      // Si se está finalizando, poblar también el INFORME FINAL
      if (estado === 'finalizada' && updatedOrdenData.informeFinalDocId) {
        console.log(`📄 Generando informe final consolidado ID: ${updatedOrdenData.informeFinalDocId}...`);
        await this.driveService.populateFinalReport(tenantId, updatedOrdenData.informeFinalDocId, updatedOrdenData, fieldData);
      }

      console.log('✅ Datos de campo guardados exitosamente.');
      return updatedOrdenData;
    } catch (error) {
      throw new InternalServerErrorException('Error al guardar datos de campo: ' + error.message);
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
