require('dotenv').config({ path: '../.env' });
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');
const { google } = require('googleapis');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const tenantId = 'danidevcol@gmail.com';

async function verifyDrive() {
  console.log('--- START DRIVE VERIFICATION ---');
  try {
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const data = tenantDoc.data();
    const { access_token, refresh_token } = data.googleTokens;

    const oauth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.REDIRECT_URI
    );
    oauth2Client.setCredentials({ access_token, refresh_token });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const idsToCheck = [
      { name: 'CERTIXION Root', id: data.certixionFolderId },
      { name: 'Clientes Root', id: data.clientesFolderId },
      { name: 'Alcances Root', id: data.procedimientosFolderId }
    ];

    for (const item of idsToCheck) {
      if (!item.id) {
        console.log(`❌ ${item.name}: NO ID in Firestore`);
        continue;
      }
      try {
        const res = await drive.files.get({
          fileId: item.id,
          fields: 'id, name, parents, trashed'
        });
        console.log(`✅ ${item.name}: Name="${res.data.name}", Trashed=${res.data.trashed}, Parents=${JSON.stringify(res.data.parents)}`);
      } catch (e) {
        console.log(`❌ ${item.name}: Error fetching from Drive (${e.message})`);
      }
    }

    console.log('--- END DRIVE VERIFICATION ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

verifyDrive();
