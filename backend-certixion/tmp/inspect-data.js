const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

// Initialize with a dummy project ID if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'demo-certixion'
  });
}

const db = getFirestore();

async function inspectTenant(tenantId) {
  console.log(`--- Inspecting Tenant: ${tenantId} ---`);
  const tenantDoc = await db.collection('tenants').doc(tenantId).get();
  if (!tenantDoc.exists) {
    console.log('Tenant not found');
    return;
  }
  const data = tenantDoc.data();
  console.log('Tenant Root Data:', {
    certixionFolderId: data.certixionFolderId,
    clientesFolderId: data.clientesFolderId,
    alcancesFolderId: data.alcancesFolderId
  });

  console.log('\n--- Recent Orders ---');
  const ordenes = await db.collection('tenants').doc(tenantId).collection('ordenes')
    .orderBy('createdAt', 'desc').limit(5).get();
  
  ordenes.forEach(doc => {
    const o = doc.data();
    console.log(`Order ${o.id}:`, {
      eds: o.edsNombre,
      folderId: o.driveFolderId,
      campoId: o.informeCampoDocId,
      finalId: o.informeFinalDocId
    });
  });

  console.log('\n--- Scopes (Alcances) ---');
  const alcances = await db.collection('tenants').doc(tenantId).collection('alcances').get();
  alcances.forEach(doc => {
    const a = doc.data();
    console.log(`Scope ${a.id} (${a.nombre}):`, {
      folderId: a.driveFolderId
    });
  });
}

// Tomamos el primer tenant que encontremos o uno específico
db.collection('tenants').limit(1).get().then(snap => {
  if (snap.empty) {
    console.log('No tenants found');
    process.exit(0);
  }
  inspectTenant(snap.docs[0].id).then(() => process.exit(0));
});
