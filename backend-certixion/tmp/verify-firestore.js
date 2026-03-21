const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const tenantId = 'danidevcol@gmail.com';

async function verify() {
  console.log('--- START VERIFICATION ---');
  try {
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      console.log('❌ Tenant not found');
      return;
    }
    const data = tenantDoc.data();
    console.log('📂 Root IDs:', {
      certixion: data.certixionFolderId,
      clientes: data.clientesFolderId,
      alcances: data.procedimientosFolderId
    });

    const alcancesSnap = await db.collection('tenants').doc(tenantId).collection('alcances').get();
    console.log(`📜 Alcances in DB: ${alcancesSnap.size}`);
    alcancesSnap.forEach(doc => {
      const a = doc.data();
      console.log(`- Alcance: ${doc.id} | Folder: ${a.folderId} | Sub:`, a.subFolders);
    });

    console.log('--- END VERIFICATION ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

verify();
