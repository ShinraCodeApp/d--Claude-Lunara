import Image from 'next/image'

// ─── Hero Section ─────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      {/* Background gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-purple-500/15 border border-purple-500/30 rounded-full px-4 py-2 text-sm text-purple-300 mb-8">
          <span>🌙</span>
          <span>by ShinraCode · Disponible en iOS & Android</span>
        </div>

        <h1 className="font-heading text-5xl sm:text-7xl font-bold leading-tight mb-6">
          Conoce tu ciclo.{' '}
          <span className="gradient-text">Conecta con<br />tu bienestar.</span>
        </h1>

        <p className="text-xl text-purple-200/70 max-w-2xl mx-auto mb-12 leading-relaxed">
          Lunara es la app de salud femenina más completa. Sigue tu ciclo, predice tu ovulación,
          chatea con la IA Luna y cultiva tu Jardín Lunar — todo en un solo lugar.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <a href="#" className="flex items-center gap-3 bg-white text-black rounded-2xl px-6 py-4 hover:bg-gray-100 transition-colors">
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            <div className="text-left">
              <div className="text-xs opacity-60">Disponible en</div>
              <div className="font-bold text-lg">App Store</div>
            </div>
          </a>
          <a href="#" className="flex items-center gap-3 bg-white text-black rounded-2xl px-6 py-4 hover:bg-gray-100 transition-colors">
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current"><path d="M3.18 23.76c.37.21.8.22 1.21 0l12.61-7.17L3.18 1.69c-.4.22-.68.62-.68 1.12v19.83c0 .5.28.9.68 1.12zM19.93 11.04L17.2 9.47 13.42 12l3.78 2.53 2.73-1.57a1.5 1.5 0 000-2.92zM4.38 1.15l11.39 10.86L4.38 1.15zM4.38 22.85l11.39-10.86L4.38 22.85z"/></svg>
            <div className="text-left">
              <div className="text-xs opacity-60">Disponible en</div>
              <div className="font-bold text-lg">Google Play</div>
            </div>
          </a>
        </div>

        {/* App mockup */}
        <div className="relative mx-auto w-72 h-auto">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/30 to-transparent rounded-[40px] blur-2xl" />
          <div className="relative glass-card rounded-[40px] p-6 border border-purple-500/30">
            <div className="text-4xl mb-2">🌙</div>
            <div className="text-left">
              <div className="text-xs text-purple-300 mb-1">Día 14 de tu ciclo</div>
              <div className="text-white font-bold text-lg mb-1">Fase Ovulatoria</div>
              <div className="text-purple-200/70 text-sm">Ventana fértil activa · 95% confianza</div>
              <div className="mt-4 bg-purple-500/20 rounded-full h-2">
                <div className="bg-gradient-to-r from-purple-500 to-pink-400 h-2 rounded-full w-1/2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Features Grid ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '📅',
    title: 'Seguimiento del ciclo',
    desc: 'Registra tu período, síntomas, estado de ánimo y temperatura basal con una interfaz intuitiva.',
    color: 'from-rose-500/20 to-rose-500/5',
    border: 'border-rose-500/20',
  },
  {
    icon: '🤖',
    title: 'IA Luna',
    desc: 'Tu asistente de salud personal. Responde dudas, analiza patrones y da recomendaciones personalizadas.',
    color: 'from-violet-500/20 to-violet-500/5',
    border: 'border-violet-500/20',
  },
  {
    icon: '🌸',
    title: 'Jardín Lunar',
    desc: 'Gamificación única. Gana XP y Cristales Lunares al registrar tu salud. Haz crecer tu jardín.',
    color: 'from-pink-500/20 to-pink-500/5',
    border: 'border-pink-500/20',
  },
  {
    icon: '📊',
    title: 'Informes PDF',
    desc: 'Genera informes mensuales y anuales para compartir con tu ginecóloga. Premium.',
    color: 'from-indigo-500/20 to-indigo-500/5',
    border: 'border-indigo-500/20',
  },
  {
    icon: '🌡️',
    title: 'Predicción avanzada',
    desc: 'Algoritmo de predicción con ponderación exponencial. Fertilidad día a día con puntuación de confianza.',
    color: 'from-emerald-500/20 to-emerald-500/5',
    border: 'border-emerald-500/20',
  },
  {
    icon: '🔒',
    title: 'Privacidad total',
    desc: 'Tus datos médicos encriptados con AES-256-GCM. Cumplimiento RGPD. Tu salud, solo tuya.',
    color: 'from-amber-500/20 to-amber-500/5',
    border: 'border-amber-500/20',
  },
]

function Features() {
  return (
    <section id="features" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-heading text-4xl sm:text-5xl font-bold mb-4">
            Todo lo que necesitas,{' '}
            <span className="gradient-text">en un solo lugar</span>
          </h2>
          <p className="text-purple-200/60 text-lg max-w-2xl mx-auto">
            Diseñado por mujeres, para mujeres. Lunara combina ciencia, tecnología y cuidado personal.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className={`glass-card rounded-3xl p-6 bg-gradient-to-br ${f.color} border ${f.border} hover:scale-[1.02] transition-transform`}>
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-xl mb-2 text-white">{f.title}</h3>
              <p className="text-purple-200/60 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function Pricing() {
  return (
    <section id="pricing" className="py-24 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-heading text-4xl sm:text-5xl font-bold mb-4">
          Empieza <span className="gradient-text">gratis</span>
        </h2>
        <p className="text-purple-200/60 text-lg mb-16">
          El plan gratuito incluye todo lo esencial. Premium desbloquea el poder completo de Lunara.
        </p>

        <div className="grid sm:grid-cols-2 gap-6 text-left">
          {/* Free */}
          <div className="glass-card rounded-3xl p-8 border border-white/10">
            <div className="text-3xl mb-2">🌱</div>
            <h3 className="text-2xl font-bold mb-1">Gratuita</h3>
            <div className="text-4xl font-bold mb-6">$0</div>
            {['Seguimiento del ciclo', 'Calendario menstrual', 'Predicción de período', 'Registro de síntomas', 'Notificaciones básicas', 'Jardín Lunar'].map((f) => (
              <div key={f} className="flex items-center gap-3 py-2 border-b border-white/5 text-sm text-purple-200/70">
                <span className="text-green-400">✓</span> {f}
              </div>
            ))}
          </div>

          {/* Premium */}
          <div className="relative rounded-3xl p-8 border border-amber-500/40 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(168,85,247,0.15))' }}>
            <div className="absolute top-4 right-4 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full">RECOMENDADO</div>
            <div className="text-3xl mb-2">👑</div>
            <h3 className="text-2xl font-bold mb-1">Premium</h3>
            <div className="text-4xl font-bold mb-1">$34.99<span className="text-lg font-normal text-purple-300">/año</span></div>
            <div className="text-sm text-purple-300/60 mb-6">o $4.99/mes · 7 días gratis</div>
            {['Todo lo del plan gratuito', 'Chat IA Luna ilimitado', 'Informes PDF mensuales y anuales', 'Análisis avanzado de patrones', 'Sincronización en la nube', 'Sin publicidad', 'Cristales x2', 'Modo embarazo y modo pareja'].map((f) => (
              <div key={f} className="flex items-center gap-3 py-2 border-b border-white/5 text-sm text-purple-200/70">
                <span className="text-amber-400">✓</span> {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Garden Section ───────────────────────────────────────────────────────────
function GardenSection() {
  const stages = [
    { emoji: '🌱', name: 'Semilla', xp: '0 XP' },
    { emoji: '🌿', name: 'Brote', xp: '100 XP' },
    { emoji: '🌸', name: 'Flor', xp: '300 XP' },
    { emoji: '🌕', name: 'Jardín Lunar', xp: '600 XP' },
  ]

  return (
    <section id="garden" className="py-24 px-4 bg-gradient-to-b from-transparent to-purple-950/20">
      <div className="max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-rose-500/15 border border-rose-500/30 rounded-full px-4 py-2 text-sm text-rose-300 mb-8">
          <span>💎</span>
          <span>Función exclusiva</span>
        </div>
        <h2 className="font-heading text-4xl sm:text-5xl font-bold mb-4">
          Jardín Lunar
        </h2>
        <p className="text-purple-200/60 text-lg max-w-2xl mx-auto mb-16">
          Cuida tu salud y ve crecer tu jardín. Gana XP y Cristales Lunares por cada registro.
          Una forma única de mantener el hábito del autocuidado.
        </p>

        <div className="flex justify-center gap-4 flex-wrap">
          {stages.map((s, i) => (
            <div key={s.name} className="glass-card rounded-3xl p-6 text-center min-w-[140px] border border-purple-500/20 hover:border-purple-400/40 transition-colors">
              <div className="text-5xl mb-3">{s.emoji}</div>
              <div className="font-bold text-white mb-1">{s.name}</div>
              <div className="text-xs text-purple-300/60">{s.xp}</div>
              {i < stages.length - 1 && (
                <div className="text-purple-500/40 text-sm mt-2">↓</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <div className="glass-card rounded-3xl p-12 border border-purple-500/30 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl" />
          <div className="relative">
            <div className="text-5xl mb-4">🌙</div>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              Empieza tu viaje lunar hoy
            </h2>
            <p className="text-purple-200/60 mb-8">
              Más de 10,000 mujeres ya confían en Lunara. Descarga gratis y comienza con 7 días de Premium.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#" className="bg-gradient-to-r from-purple-600 to-violet-500 text-white font-bold px-8 py-4 rounded-2xl hover:opacity-90 transition-opacity">
                Descargar para iOS 🍎
              </a>
              <a href="#" className="bg-gradient-to-r from-purple-600 to-violet-500 text-white font-bold px-8 py-4 rounded-2xl hover:opacity-90 transition-opacity">
                Descargar para Android 🤖
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 px-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌙</span>
          <span className="font-bold text-white">Lunara</span>
          <span className="text-purple-300/40 text-sm">by ShinraCode</span>
        </div>
        <div className="flex gap-6 text-sm text-purple-200/40">
          <a href="#" className="hover:text-purple-300 transition-colors">Privacidad</a>
          <a href="#" className="hover:text-purple-300 transition-colors">Términos</a>
          <a href="#" className="hover:text-purple-300 transition-colors">Soporte</a>
          <a href="/admin" className="hover:text-purple-300 transition-colors">Admin</a>
        </div>
        <div className="text-sm text-purple-200/30">
          © 2025 ShinraCode. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 glass-card border-b border-white/5">
      <div className="flex items-center gap-2">
        <span className="text-xl">🌙</span>
        <span className="font-bold text-white">Lunara</span>
      </div>
      <div className="hidden sm:flex gap-6 text-sm text-purple-200/60">
        <a href="#features" className="hover:text-white transition-colors">Funciones</a>
        <a href="#garden" className="hover:text-white transition-colors">Jardín Lunar</a>
        <a href="#pricing" className="hover:text-white transition-colors">Precios</a>
      </div>
      <a href="#" className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
        Descargar gratis
      </a>
    </nav>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <main className="pt-16">
      <Navbar />
      <Hero />
      <Features />
      <GardenSection />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  )
}
