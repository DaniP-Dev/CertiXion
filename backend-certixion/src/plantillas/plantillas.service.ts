import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

export interface Plantilla {
  id: string; // Ej: OT, CAMPO, CERTIFICADO
  driveFileId: string;
  nombre: string;
  tipo: 'Google_Docs' | 'Google_Sheets' | 'Google_Slides';
  updatedAt: string;
}

@Injectable()
export class PlantillasService {
  constructor(private firebaseService: FirebaseService) {}

  async getPlantillas(tenantId: string): Promise<Plantilla[]> {
    try {
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection('tenants').doc(tenantId).collection('plantillas').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plantilla));
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener plantillas: ' + error.message);
    }
  }

  async getPlantilla(tenantId: string, id: string): Promise<Plantilla | null> {
    try {
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection('tenants').doc(tenantId).collection('plantillas').doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as Plantilla;
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener plantilla: ' + error.message);
    }
  }

  async savePlantilla(tenantId: string, id: string, data: Partial<Plantilla>) {
    try {
      const db = this.firebaseService.getFirestore();
      const docRef = db.collection('tenants').doc(tenantId).collection('plantillas').doc(id);
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await docRef.set(updateData, { merge: true });
      return { id, ...updateData };
    } catch (error) {
      throw new InternalServerErrorException('Error al guardar plantilla: ' + error.message);
    }
  }
}
