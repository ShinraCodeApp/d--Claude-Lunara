import { Resend } from 'resend'
import { env } from '@/config/env'

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null
const FROM = 'Lunara <noreply@lunara.app>'

async function send(options: { to: string; subject: string; html: string }) {
  if (!resend) {
    console.log(`[email] RESEND_API_KEY not set — skipping email to ${options.to}: ${options.subject}`)
    return
  }
  await resend.emails.send({ from: FROM, ...options })
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  await send({
    to,
    subject: 'Restablecer contraseña — Lunara',
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d0118;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0118;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a0533;border-radius:20px;border:1px solid #3d1a6b;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2d0145,#1a0533);padding:36px 40px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🌙</div>
            <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0;">Lunara</h1>
            <p style="color:#a78bfa;font-size:13px;margin:4px 0 0;">by ShinraCode</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#fff;font-size:20px;font-weight:600;margin:0 0 16px;">Restablecer tu contraseña</h2>
            <p style="color:#c4b5fd;font-size:15px;line-height:1.6;margin:0 0 24px;">
              Recibimos una solicitud para restablecer la contraseña de tu cuenta en Lunara.
              Hacé clic en el botón de abajo para crear una contraseña nueva.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${resetLink}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:16px 36px;border-radius:12px;font-size:16px;font-weight:600;display:inline-block;">
                Restablecer contraseña
              </a>
            </div>
            <p style="color:#8b5cf6;font-size:13px;line-height:1.6;margin:24px 0 0;">
              Este enlace expira en <strong style="color:#a78bfa;">1 hora</strong>.<br>
              Si no solicitaste este cambio, podés ignorar este correo — tu contraseña seguirá siendo la misma.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #3d1a6b;padding:24px 40px;text-align:center;">
            <p style="color:#6d28d9;font-size:12px;margin:0;">
              Lunara · ShinraCode · Argentina<br>
              <a href="${resetLink}" style="color:#7c3aed;word-break:break-all;">${resetLink}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendWelcomeEmail(to: string, firstName?: string) {
  await send({
    to,
    subject: '¡Bienvenida a Lunara! 🌙',
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d0118;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0118;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a0533;border-radius:20px;border:1px solid #3d1a6b;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#2d0145,#1a0533);padding:36px 40px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🌙</div>
            <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0;">¡Bienvenida a Lunara!</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#fff;font-size:20px;font-weight:600;margin:0 0 16px;">
              Hola${firstName ? ` ${firstName}` : ''} 💜
            </h2>
            <p style="color:#c4b5fd;font-size:15px;line-height:1.6;margin:0 0 20px;">
              Tu cuenta en Lunara está lista. Empezá registrando tu ciclo y descubrí todo lo que tu cuerpo te quiere decir.
            </p>
            <p style="color:#c4b5fd;font-size:15px;line-height:1.6;margin:0 0 8px;">Lo que podés hacer hoy:</p>
            <ul style="color:#a78bfa;font-size:14px;line-height:2;margin:0 0 24px;padding-left:20px;">
              <li>Registrar tu ciclo y síntomas</li>
              <li>Chatear con Luna, tu asistente de IA</li>
              <li>Ver predicciones de tu próximo período</li>
              <li>Ganar logros y puntos de bienestar</li>
            </ul>
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid #3d1a6b;padding:24px 40px;text-align:center;">
            <p style="color:#6d28d9;font-size:12px;margin:0;">Lunara · ShinraCode · Argentina</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}
