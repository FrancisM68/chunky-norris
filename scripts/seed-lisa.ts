import 'dotenv/config'
import { getTenantClient } from '../src/lib/tenant'

async function main() {
  const db = getTenantClient('dar')

  const volunteer = await db.volunteer.create({
    data: {
      firstName: 'Lisa',
      lastName: 'Martinez',
      phone: '086 161 4465',
      roles: ['ADMIN'],
    },
  })

  console.log('Created volunteer:')
  console.log(`  ID:    ${volunteer.id}`)
  console.log(`  Name:  ${volunteer.firstName} ${volunteer.lastName}`)
  console.log(`  Roles: ${volunteer.roles.join(', ')}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
