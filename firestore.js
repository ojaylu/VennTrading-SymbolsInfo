const serviceAccount = require('./firebaseAccountKey.json');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
    credential: cert(serviceAccount)
});

const firestore = getFirestore();

function setSymbolsList(name, symbols) {
    const binanceDocRef = firestore.doc(`exchanges/${name}`);
    return binanceDocRef.set({
        symbols
    });
}

async function getSymbolsList(name) {
    const binanceDocRef = firestore.doc(`exchanges/${name}`);
    const doc = await binanceDocRef.get();
    if (!doc.exists) {
        throw new Error("no such document");
    } else {
        return doc.data().symbols;
    }
}

function deleteSymbolsList(name) {
    const binanceDocRef = firestore.doc(`exchanges/${name}`);
    binanceDocRef.delete();
}

exports.setSymbolsList = setSymbolsList;
exports.getSymbolsList = getSymbolsList;
exports.deleteSymbolsList = deleteSymbolsList;