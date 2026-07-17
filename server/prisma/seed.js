import pkg from '@prisma/client'
import bcrypt from 'bcryptjs'

const { PrismaClient } = pkg
const prisma = new PrismaClient()

async function main() {
  const existingAdmin = await prisma.utilisateur.findUnique({
    where: { email: 'kouassikacouemmanuel58@gmail.com' },
  })

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12)

    await prisma.utilisateur.create({
      data: {
        nom: 'Kouassi',
        prenom: 'Jaïrus',
        email: 'kouassikacouemmanuel58@gmail.com',
        motDePasse: hashedPassword,
        role: 'ADMIN',
        telephone: '',
      },
    })
    console.log('✅ Compte admin créé avec succès !')
    console.log('📧 Email : kouassikacouemmanuel58@gmail.com')
  } else {
    console.log('ℹ️  Le compte admin existe déjà.')
  }
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed :', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
