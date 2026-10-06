import admin from 'firebase-admin'
import { env } from './env'

// Firebase Admin para notificaciones push. Si faltan las credenciales o están
// mal, el servidor sigue andando: solo se desactivan las notificaciones.
if (!admin.apps.length && env.FIREBASE_PROJECT_ID) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  } catch (err) {
    console.error('[Firebase] Admin init failed — push notifications disabled:', err)
  }
}

export const isFirebaseReady = () => admin.apps.length > 0

export default admin
