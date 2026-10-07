import { prisma } from '@/config/database'

// Días entre que la usuaria pide borrar la cuenta y el borrado definitivo
// (por si se arrepiente). Lo promete la política de privacidad.
export const ACCOUNT_DELETION_GRACE_DAYS = 30

/**
 * Borra definitivamente las cuentas marcadas para eliminar hace más de 30 días.
 * Las tablas de la usuaria (ciclos, síntomas, chats, etc.) se borran en cascada.
 * Devuelve cuántas cuentas se borraron.
 */
export async function purgeDeletedAccounts(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000)
  const due = await prisma.user.findMany({
    where: { deletedAt: { not: null, lt: cutoff } },
    select: { id: true },
  })
  let purged = 0
  for (const { id } of due) {
    try {
      await prisma.user.delete({ where: { id } })
      purged++
    } catch (err) {
      console.error('[purge] No se pudo borrar la cuenta', id, err)
    }
  }
  return purged
}

/** Corre al arrancar y cada 12 h (Render gratis se duerme: corre al despertar). */
export function schedulePurgeDeletedAccounts() {
  const run = () =>
    purgeDeletedAccounts()
      .then((n) => { if (n > 0) console.log(`[purge] ${n} cuenta(s) borrada(s) definitivamente`) })
      .catch((err) => console.error('[purge] Error:', err))
  setTimeout(run, 30_000).unref()
  setInterval(run, 12 * 60 * 60 * 1000).unref()
}
