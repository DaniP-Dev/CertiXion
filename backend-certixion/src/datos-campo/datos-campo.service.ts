import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class DatosCampoService {
  constructor(private firebaseService: FirebaseService) {}

  async saveDatos(tenantId: string, ordenId: string, datos: any) {
    try {
      const db = this.firebaseService.getFirestore();
      
      const ordenRef = db.collection('tenants').doc(tenantId).collection('ordenes').doc(ordenId);
      const ordenDoc = await ordenRef.get();
      
      if (!ordenDoc.exists) {
        throw new NotFoundException(`La orden ${ordenId} no existe para asignar datos de campo`);
      }

      // Guardar formulario en subcolección JSON
      const datosRef = ordenRef.collection('datosCampo').doc();
      const payload = {
        id: datosRef.id,
        datos,
        estado: 'completado',
        createdAt: new Date().toISOString(),
      };
      
      await datosRef.set(payload);
      return payload;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error al guardar datos de campo: ' + error.message);
    }
  }
}
