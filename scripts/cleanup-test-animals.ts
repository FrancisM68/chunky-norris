/**
 * Deletes test animals (Snoopy and WhitePaw) and all their related records.
 * Lisa Martinez volunteer record is preserved.
 *
 * Usage: npx tsx scripts/cleanup-test-animals.ts
 */
import 'dotenv/config'
import { getTenantClient } from '../src/lib/tenant'

const TEST_ANIMAL_NAMES = ['Snoopy', 'WhitePaw']

async function main() {
  const db = getTenantClient('dar')

  const animals = await db.animal.findMany({
    where: { officialName: { in: TEST_ANIMAL_NAMES } },
    select: { id: true, officialName: true },
  })

  if (animals.length === 0) {
    console.log('No test animals found — nothing to delete.')
    return
  }

  const ids = animals.map((a) => a.id)
  console.log(`Found ${animals.length} test animal(s): ${animals.map((a) => a.officialName).join(', ')}`)

  // Delete in dependency order
  const treatments = await db.treatmentLog.deleteMany({ where: { animalId: { in: ids } } })
  console.log(`  Deleted ${treatments.count} treatment log(s)`)

  const assignments = await db.fosterAssignment.deleteMany({ where: { animalId: { in: ids } } })
  console.log(`  Deleted ${assignments.count} foster assignment(s)`)

  // TNR records reference animalId (optional relation)
  const tnr = await db.tNRRecord.deleteMany({ where: { animalId: { in: ids } } })
  console.log(`  Deleted ${tnr.count} TNR record(s)`)

  // HomeChecks are linked via Adoption, so delete adoptions first (cascade not set)
  const adoptions = await db.adoption.findMany({ where: { animalId: { in: ids } }, select: { id: true } })
  if (adoptions.length > 0) {
    const adoptionIds = adoptions.map((a) => a.id)
    const homeChecks = await db.homeCheck.deleteMany({ where: { adoptionId: { in: adoptionIds } } })
    console.log(`  Deleted ${homeChecks.count} home check(s)`)
    const adop = await db.adoption.deleteMany({ where: { id: { in: adoptionIds } } })
    console.log(`  Deleted ${adop.count} adoption(s)`)
  }

  const deleted = await db.animal.deleteMany({ where: { id: { in: ids } } })
  console.log(`  Deleted ${deleted.count} animal(s)`)

  console.log('\nCleanup complete. Lisa Martinez preserved.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
