export const metadata = {
  title: 'Política de Privacidad — Lunara',
  description: 'Política de privacidad de la aplicación Lunara by ShinraCode',
}

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0f0a1e', color: '#e2d9f3', fontFamily: 'system-ui, sans-serif', padding: '40px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: '#fff', marginBottom: 8 }}>🌙 Lunara</h1>
        <h2 style={{ fontSize: 20, color: '#c4b5fd', marginBottom: 32, fontWeight: 400 }}>Política de Privacidad</h2>
        <p style={{ color: '#9ca3af', marginBottom: 32 }}>Última actualización: 29 de junio de 2026</p>

        <Section title="1. Información que recopilamos">
          <p>Lunara recopila la siguiente información para brindarte una experiencia personalizada:</p>
          <ul>
            <li><strong>Datos de salud femenina:</strong> fechas del ciclo menstrual, síntomas, flujo, temperatura basal, mucus cervical.</li>
            <li><strong>Estado de ánimo y bienestar:</strong> estado emocional, niveles de energía, horas de sueño, hidratación.</li>
            <li><strong>Datos de cuenta:</strong> dirección de correo electrónico y contraseña (encriptada).</li>
            <li><strong>Datos de uso:</strong> interacciones con la IA Luna, actividad en la comunidad, logros desbloqueados.</li>
          </ul>
        </Section>

        <Section title="2. Cómo usamos tu información">
          <ul>
            <li>Predecir tu ciclo menstrual y ventana fértil con algoritmos propios.</li>
            <li>Personalizar las respuestas de la IA Luna según tu fase del ciclo.</li>
            <li>Mostrarte estadísticas y tendencias de tu salud hormonal.</li>
            <li>Mejorar la experiencia y funcionalidades de la app.</li>
          </ul>
          <p><strong>No vendemos ni compartimos tus datos de salud con terceros para fines publicitarios.</strong></p>
        </Section>

        <Section title="3. Almacenamiento y seguridad">
          <p>Tus datos se almacenan de forma segura en servidores protegidos. Las contraseñas se encriptan con bcrypt. La comunicación entre la app y nuestros servidores utiliza HTTPS/TLS.</p>
          <p>Los datos de registro de síntomas se guardan localmente en tu dispositivo y se sincronizan con nuestros servidores. Podés usar la app en modo offline y los datos se sincronizarán cuando recuperes conexión.</p>
        </Section>

        <Section title="4. Inteligencia Artificial (Luna)">
          <p>Los mensajes que enviás a Luna (nuestra IA) son procesados por modelos de lenguaje de Google (Gemini). Estos mensajes pueden ser usados para mejorar los modelos de IA según la política de privacidad de Google. No compartimos tu identidad con Google — los mensajes se procesan de forma anónima.</p>
        </Section>

        <Section title="5. Tus derechos">
          <p>Tenés derecho a:</p>
          <ul>
            <li><strong>Acceder</strong> a todos tus datos desde la sección "Mis datos" en la app.</li>
            <li><strong>Eliminar</strong> tu cuenta y todos tus datos desde Perfil → Eliminar cuenta.</li>
            <li><strong>Exportar</strong> tus datos en formato JSON desde Perfil → Mis datos.</li>
            <li><strong>Corregir</strong> cualquier dato incorrecto desde la app.</li>
          </ul>
        </Section>

        <Section title="6. Datos de menores">
          <p>Lunara está diseñada para usuarias mayores de 13 años. No recopilamos intencionalmente datos de menores de 13 años. Si sos menor de 13 años, por favor no uses la app sin el consentimiento de un adulto responsable.</p>
        </Section>

        <Section title="7. Cambios en esta política">
          <p>Te notificaremos sobre cambios significativos en esta política a través de la app. El uso continuado de Lunara después de los cambios implica la aceptación de la nueva política.</p>
        </Section>

        <Section title="8. Contacto">
          <p>Para consultas sobre privacidad, contactanos en: <a href="mailto:yamilrueda88@gmail.com" style={{ color: '#a78bfa' }}>yamilrueda88@gmail.com</a></p>
          <p>Desarrollado por <strong>ShinraCode</strong> — Argentina.</p>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: '#c4b5fd', marginBottom: 12, borderBottom: '1px solid #2d1b69', paddingBottom: 8 }}>{title}</h3>
      <div style={{ lineHeight: 1.7, color: '#d1d5db' }}>{children}</div>
    </section>
  )
}
