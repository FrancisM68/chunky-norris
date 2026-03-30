import 'dotenv/config'
import { getTenantClient } from '../src/lib/tenant'

async function main() {
  const db = getTenantClient('dar')

  const animal = await db.animal.create({
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

  console.log(`Created animal: ${animal.officialName} (${animal.id})`)

  const assignment = await db.fosterAssignment.create({
    data: {
      animalId: animal.id,
      fosterId: 'cmnczsb580000t0f3glx7n9v3',
      startDate: new Date('2026-03-30'),
      isActive: true,
    },
  })

  console.log(`Created FosterAssignment: ${assignment.id}`)
  console.log(`\nAnimal ID:      ${animal.id}`)
  console.log(`Assignment ID:  ${assignment.id}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
