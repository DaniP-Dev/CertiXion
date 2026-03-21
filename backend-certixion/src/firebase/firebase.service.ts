import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firestore: admin.firestore.Firestore;

  onModuleInit() {
    // Si no tienes el serviceAccountKey.json, en Cloud Run usará las Application Default Credentials (ADC).
    // Para desarrollo local, puedes usar una variable de entorno FIREBASE_SERVICE_ACCOUNT_PATH
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    
    if (admin.apps.length === 0) {
      if (serviceAccountPath) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountPath),
        });
      } else {
        // En producción (Cloud Run) esto toma las credenciales de la instancia asociada
        admin.initializeApp({
            credential: admin.credential.applicationDefault()
        });
      }
    }

    this.firestore = admin.firestore();
    // Habilitar ignoreUndefinedProperties como medida de seguridad
    this.firestore.settings({ ignoreUndefinedProperties: true });
  }

  getFirestore() {
    return this.firestore;
  }
}
