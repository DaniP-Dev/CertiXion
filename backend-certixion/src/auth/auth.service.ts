import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AuthService {
  constructor(private firebaseService: FirebaseService) {}

  async googleLogin(req) {
    if (!req.user) {
      return 'No user from google';
    }

    const db = this.firebaseService.getFirestore();
    const userRef = db.collection('tenants').doc(req.user.tenantId);
    
    const tokensToSave: any = {
      access_token: req.user.accessToken,
    };
    
    // Google solo envía refresh_token la primera vez o si se fuerza el prompt: 'consent'
    if (req.user.refreshToken) {
      tokensToSave.refresh_token = req.user.refreshToken;
    }

    await userRef.set({
      tenantId: req.user.tenantId,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      picture: req.user.picture,
      googleTokens: tokensToSave,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return {
      message: 'Usuario verificado y tokens guardados en Firestore exitosamente',
      user: req.user,
    };
  }
}
