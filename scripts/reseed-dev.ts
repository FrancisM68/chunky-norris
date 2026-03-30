/**
 * Full dev database reseed — run after any prisma migrate reset.
 * Creates Lisa Martinez (ADMIN) with email + password, then Snoopy + foster assignment.
 *
 * Usage: npx tsx scripts/reseed-dev.ts --password <password>
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { getTenantClient } from '../src/lib/tenant'

async function main() {
  const args = process.argv.slice(2)
  const passwordFlag = args.indexOf('--password')

  if (passwordFlag === -1 || !args[passwordFlag + 1]) {
    console.error('Usage: npx tsx scripts/reseed-dev.ts --password <password>')
    process.exit(1)
  }

  const plainPassword = args[passwordFlag + 1]
  const db = getTenantClient('dar')

  // ── Clean up any duplicate volunteers ──────────────────────────────────────
  const existing = await db.volunteer.findMany({
    where: { firstName: 'Lisa', lastName: 'Martinez' },
    orderBy: { createdAt: 'asc' },
  })

  if (existing.length > 1) {
    const toDelete = existing.slice(1).map((v) => v.id)
    await db.fosterAssignment.deleteMany({ where: { fosterId: { in: toDelete } } })
    await db.volunteer.deleteMany({ where: { id: { in: toDelete } } })
    console.log(`Deleted ${toDelete.length} duplicate volunteer(s)`)
  }

  // ── Upsert Lisa Martinez ───────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(plainPassword, 12)

  let lisa
  if (existing.length >= 1) {
    lisa = await db.volunteer.update({
      where: { id: existing[0].id },
      data: { email: 'lisa@dar.ie', passwordHash, roles: ['ADMIN'] },
    })
  } else {
    lisa = await db.volunteer.create({
      data: {
        firstName: 'Lisa',
        lastName: 'Martinez',
        email: 'lisa@dar.ie',
        phone: '086 161 4465',
        passwordHash,
        roles: ['ADMIN'],
      },
    })
  }

  console.log(`✓ Volunteer: ${lisa.firstName} ${lisa.lastName} (${lisa.email}) — ID: ${lisa.id}`)

  // ── Upsert Snoopy ──────────────────────────────────────────────────────────
  const existingAnimal = await db.animal.findFirst({
    where: { officialName: 'Snoopy' },
  })

  let snoopy
  if (existingAnimal) {
    snoopy = existingAnimal
    console.log(`✓ Animal: Snoopy already exists — ID: ${snoopy.id}`)
  } else {
    snoopy = await db.animal.create({
      data: {
        officialName: 'Snoopy',
        nickname: 'Snoopy',
        species: 'CAT',
        breed: 'DSH',
        description: 'Orange tabby',
        gender: 'MALE_NEUTERED',
        dobIsEstimate: true,
        ageAtIntake: '~8 months',
        intakeDate: new Date('2026-03-30'),
        intakeSource: 'STRAY',
        status: 'FOSTERED',
      },
    })
    console.log(`✓ Animal: Snoopy created — ID: ${snoopy.id}`)
  }

  // ── Foster assignment ──────────────────────────────────────────────────────
  const existingAssignment = await db.fosterAssignment.findFirst({
    where: { animalId: snoopy.id, fosterId: lisa.id },
  })

  if (!existingAssignment) {
    await db.fosterAssignment.create({
      data: {
        animalId: snoopy.id,
        fosterId: lisa.id,
        startDate: new Date('2026-03-30'),
        isActive: true,
      },
    })
    console.log(`✓ FosterAssignment: Snoopy → Lisa`)
  } else {
    console.log(`✓ FosterAssignment: already exists`)
  }

  console.log('\nDev seed complete.')
  console.log(`Login: lisa@dar.ie / <your password>`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
