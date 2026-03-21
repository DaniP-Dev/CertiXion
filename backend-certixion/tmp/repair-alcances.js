const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const tenantId = 'danidevcol@gmail.com';

async function repair() {
  try {
    const tenantRef = db.collection('tenants').doc(tenantId);
    
    console.log('🧹 Limpiando IDs de Alcances trasheados...');
    await tenantRef.update({
      procedimientosFolderId: admin.firestore.FieldValue.delete()
    });

    console.log('📜 Limpiando colección de alcances para re-generar limpio...');
    const snap = await tenantRef.collection('alcances').get();
    const batch = db.batch();
    snap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    console.log('✅ Reparación completada. Ahora puedes re-definir los alcances en el Dashboard.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

repair();
