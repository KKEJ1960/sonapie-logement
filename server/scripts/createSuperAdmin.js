import 'dotenv/config'
import pkg from '@prisma/client'
import bcrypt from 'bcryptjs'

const { PrismaClient } = pkg
const prisma = new PrismaClient()

const SUPER_ADMIN = {
  nom: 'Kouassi',
  prenom: 'Jaïrus',
  email: 'kouassikacouemmanuel58@gmail.com',
}

async function main() {
  if (!process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_PASSWORD manquant dans les variables d\'environnement.')
  }

  const existing = await prisma.utilisateur.findUnique({
    where: { email: SUPER_ADMIN.email },
  })

  if (existing) {
    console.log('ℹ️  Le compte Super Admin existe déjà.')
    console.log(`📧 Email : ${existing.email}`)
    return
  }

  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12)

  const superAdmin = await prisma.utilisateur.create({
    data: {
      nom: SUPER_ADMIN.nom,
      prenom: SUPER_ADMIN.prenom,
      email: SUPER_ADMIN.email,
      motDePasse: hashedPassword,
      role: 'SUPER_ADMIN',
      actif: true,
    },
  })

  console.log('✅ Compte Super Admin créé avec succès !')
  console.log(`📧 Email : ${superAdmin.email}`)
}

main()
  .catch((e) => {
    console.error('❌ Erreur création Super Admin :', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
