import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class UsuariosService {
  constructor(private firebaseService: FirebaseService) {}

  /**
   * Registra el usuario en la subcolección `usuarios` del tenant.
   * Si el email coincide con el tenantId (dueño de Drive) → admin.
   * Si ya existe → devuelve su rol actual.
   * Si es nuevo → crea con rol 'pendiente'.
   */
  async registerOrGetUser(tenantId: string, email: string, displayName: string, photoURL: string) {
    try {
      const db = this.firebaseService.getFirestore();
      const tenantRef = db.collection('tenants').doc(tenantId);
      const tenantDoc = await tenantRef.get();

      if (!tenantDoc.exists) {
        throw new InternalServerErrorException('Tenant no encontrado');
      }

      const usuarioRef = tenantRef.collection('usuarios').doc(email);
      const usuarioDoc = await usuarioRef.get();

      if (usuarioDoc.exists) {
        // Usuario ya registrado, devolver datos actuales
        return usuarioDoc.data();
      }

      // Definir si el nuevo usuario es el admin (dueño del tenant / cuenta de Drive)
      const rol = email === tenantId ? 'admin' : 'pendiente';

      const nuevoUsuario = {
        email,
        displayName: displayName || '',
        photoURL: photoURL || '',
        rol,
        createdAt: new Date().toISOString(),
      };

      await usuarioRef.set(nuevoUsuario);
      return nuevoUsuario;
    } catch (error) {
      throw new InternalServerErrorException('Error al registrar usuario: ' + error.message);
    }
  }

  async getUsuarios(tenantId: string) {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection('tenants').doc(tenantId).collection('usuarios').orderBy('createdAt', 'asc').get();
    return snapshot.docs.map(doc => doc.data());
  }

  async updateRol(tenantId: string, email: string, rol: string) {
    const db = this.firebaseService.getFirestore();
    await db.collection('tenants').doc(tenantId).collection('usuarios').doc(email).update({ rol });
    return { email, rol, updated: true };
  }
}
