import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌙 Seeding Lunara database...')

  // ─── Symptoms ─────────────────────────────────────────────
  const symptoms = [
    // Pain
    { name: 'Cramps', nameEs: 'Cólicos', category: 'PAIN', icon: '🔴', isDefault: true },
    { name: 'Headache', nameEs: 'Dolor de cabeza', category: 'PAIN', icon: '🤕', isDefault: true },
    { name: 'Back pain', nameEs: 'Dolor de espalda', category: 'PAIN', icon: '💢', isDefault: true },
    { name: 'Breast tenderness', nameEs: 'Sensibilidad en senos', category: 'PAIN', icon: '💗', isDefault: true },
    { name: 'Migraine', nameEs: 'Migraña', category: 'PAIN', icon: '⚡', isDefault: true },

    // Physical
    { name: 'Bloating', nameEs: 'Hinchazón', category: 'PHYSICAL', icon: '🫧', isDefault: true },
    { name: 'Acne', nameEs: 'Acné', category: 'SKIN', icon: '🔴', isDefault: true },
    { name: 'Nausea', nameEs: 'Náuseas', category: 'PHYSICAL', icon: '🤢', isDefault: true },
    { name: 'Fatigue', nameEs: 'Fatiga', category: 'ENERGY', icon: '😴', isDefault: true },
    { name: 'High energy', nameEs: 'Mucha energía', category: 'ENERGY', icon: '⚡', isDefault: true },
    { name: 'Insomnia', nameEs: 'Insomnio', category: 'SLEEP', icon: '🌙', isDefault: true },
    { name: 'Good sleep', nameEs: 'Buen sueño', category: 'SLEEP', icon: '😴', isDefault: true },

    // Digestive
    { name: 'Constipation', nameEs: 'Estreñimiento', category: 'DIGESTIVE', icon: '😖', isDefault: true },
    { name: 'Diarrhea', nameEs: 'Diarrea', category: 'DIGESTIVE', icon: '💩', isDefault: true },
    { name: 'Appetite changes', nameEs: 'Cambios de apetito', category: 'DIGESTIVE', icon: '🍽️', isDefault: true },
    { name: 'Cravings', nameEs: 'Antojos', category: 'DIGESTIVE', icon: '🍫', isDefault: true },

    // Emotional
    { name: 'Mood swings', nameEs: 'Cambios de humor', category: 'EMOTIONAL', icon: '🎭', isDefault: true },
    { name: 'Anxiety', nameEs: 'Ansiedad', category: 'EMOTIONAL', icon: '😰', isDefault: true },
    { name: 'Depression', nameEs: 'Depresión', category: 'EMOTIONAL', icon: '😔', isDefault: true },
    { name: 'Concentration issues', nameEs: 'Problemas de concentración', category: 'EMOTIONAL', icon: '🧠', isDefault: true },

    // Other
    { name: 'Vaginal discharge', nameEs: 'Flujo vaginal', category: 'OTHER', icon: '💧', isDefault: true },
    { name: 'Hot flashes', nameEs: 'Sofocos', category: 'OTHER', icon: '🌡️', isDefault: true },
    { name: 'Dizziness', nameEs: 'Mareos', category: 'PHYSICAL', icon: '💫', isDefault: true },
  ]

  for (const symptom of symptoms) {
    await prisma.symptom.upsert({
      where: { id: symptom.name.toLowerCase().replace(/ /g, '_') },
      update: symptom,
      create: { ...symptom, id: symptom.name.toLowerCase().replace(/ /g, '_') },
    })
  }
  console.log(`✅ ${symptoms.length} symptoms seeded`)

  // ─── Achievements ─────────────────────────────────────────
  const achievements = [
    {
      key: 'first_log',
      nameEs: 'Primera Luna',
      descriptionEs: 'Registraste tu primer período',
      icon: '🌑',
      xpReward: 20,
      crystalReward: 5,
      condition: { type: 'first_log' },
    },
    {
      key: 'streak_7',
      nameEs: 'Semana Lunar',
      descriptionEs: 'Registraste 7 días seguidos',
      icon: '🌙',
      xpReward: 50,
      crystalReward: 15,
      condition: { type: 'streak_7' },
    },
    {
      key: 'streak_30',
      nameEs: 'Luna Llena',
      descriptionEs: 'Registraste 30 días seguidos',
      icon: '🌕',
      xpReward: 150,
      crystalReward: 50,
      condition: { type: 'streak_30' },
    },
    {
      key: 'cycles_3',
      nameEs: 'Ciclos Completos',
      descriptionEs: 'Registraste 3 ciclos completos',
      icon: '🌸',
      xpReward: 75,
      crystalReward: 20,
      condition: { type: 'cycles_complete', threshold: 3 },
    },
    {
      key: 'garden_flower',
      nameEs: 'Mi Jardín Florece',
      descriptionEs: 'Tu Jardín Lunar llegó a la etapa Flor',
      icon: '🌺',
      xpReward: 100,
      crystalReward: 30,
      condition: { type: 'garden_stage', stage: 'FLOWER' },
    },
    {
      key: 'ai_first_chat',
      nameEs: 'Primera Consulta',
      descriptionEs: 'Conversaste con Luna por primera vez',
      icon: '🤖',
      xpReward: 10,
      crystalReward: 5,
      condition: { type: 'first_ai_chat' },
    },
  ]

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { key: achievement.key },
      update: achievement,
      create: achievement,
    })
  }
  console.log(`✅ ${achievements.length} achievements seeded`)

  // ─── Wellness Content ──────────────────────────────────────
  const wellnessContent = [
    {
      type: 'tip',
      category: 'nutrition',
      titleEs: 'Hierro para tu período',
      bodyEs: 'Durante la menstruación tu cuerpo necesita más hierro. Incluye lentejas, espinacas y carnes magras en tu dieta. Combínalos con vitamina C para mejorar la absorción.',
      isPremium: false,
      sortOrder: 1,
    },
    {
      type: 'tip',
      category: 'wellness',
      titleEs: 'Calor para los cólicos',
      bodyEs: 'Aplicar calor local (almohadilla térmica o bolsa de agua caliente) reduce significativamente los cólicos menstruales. El calor relaja los músculos uterinos y mejora la circulación.',
      isPremium: false,
      sortOrder: 2,
    },
    {
      type: 'meditation',
      category: 'relaxation',
      titleEs: 'Respiración lunar',
      bodyEs: 'Inhala contando 4 tiempos, mantén 4 tiempos, exhala 6 tiempos. Repite 5 veces. Esta técnica activa el sistema nervioso parasimpático y reduce la ansiedad premenstrual.',
      duration: 300,
      isPremium: false,
      sortOrder: 3,
    },
    {
      type: 'tip',
      category: 'exercise',
      titleEs: 'Yoga en la fase menstrual',
      bodyEs: 'La postura del niño (Balasana) y las posturas invertidas suaves ayudan a aliviar cólicos. Evita inversiones intensas durante el sangrado abundante.',
      isPremium: false,
      sortOrder: 4,
    },
    {
      type: 'tip',
      category: 'nutrition',
      titleEs: 'Magnesio contra el SPM',
      bodyEs: 'El magnesio reduce síntomas del síndrome premenstrual como irritabilidad, hinchazón y migrañas. Fuentes: almendras, aguacate, chocolate negro (>70% cacao), plátanos.',
      isPremium: true,
      sortOrder: 5,
    },
  ]

  for (const content of wellnessContent) {
    await prisma.wellnessContent.create({ data: content }).catch(() => {}) // Skip if exists
  }
  console.log(`✅ Wellness content seeded`)

  // ─── App Config ───────────────────────────────────────────
  await prisma.appConfig.upsert({
    where: { key: 'app_version' },
    update: { value: { version: '1.0.0', minRequired: '1.0.0' } },
    create: { key: 'app_version', value: { version: '1.0.0', minRequired: '1.0.0' }, description: 'Current app version' },
  })

  await prisma.appConfig.upsert({
    where: { key: 'features' },
    update: { value: { partnerMode: true, pregnancyMode: true, aiChat: true } },
    create: { key: 'features', value: { partnerMode: true, pregnancyMode: true, aiChat: true }, description: 'Feature flags' },
  })

  // ─── Admin user ───────────────────────────────────────────
  const adminPassword = await bcrypt.hash('LunaraAdmin2024!', 12)
  await prisma.user.upsert({
    where: { email: 'admin@lunara.app' },
    update: {},
    create: {
      email: 'admin@lunara.app',
      emailVerified: true,
      passwordHash: adminPassword,
      role: 'SUPER_ADMIN',
      profile: { create: { firstName: 'Admin', lastName: 'ShinraCode', onboardingCompleted: true } },
      subscription: { create: { tier: 'PREMIUM_ANNUAL', status: 'ACTIVE' } },
      notifSettings: { create: {} },
      streaks: { create: {} },
    },
  })
  console.log('✅ Admin user created: admin@lunara.app')

  console.log('\n🌕 Lunara database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
