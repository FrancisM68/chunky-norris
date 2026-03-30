import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { getTenantClient } from '../src/lib/tenant'

async function main() {
  const args = process.argv.slice(2)
  const emailFlag = args.indexOf('--email')
  const passwordFlag = args.indexOf('--password')

  if (emailFlag === -1 || passwordFlag === -1) {
    console.error('Usage: npx tsx scripts/set-password.ts --email <email> --password <password>')
    process.exit(1)
  }

  const email = args[emailFlag + 1]
  const plainPassword = args[passwordFlag + 1]

  if (!email || !plainPassword) {
    console.error('Both --email and --password values are required')
    process.exit(1)
  }

  const db = getTenantClient('dar')
  const passwordHash = await bcrypt.hash(plainPassword, 12)

  const volunteer = await db.volunteer.update({
    where: { email },
    data: { passwordHash },
    select: { id: true, firstName: true, lastName: true, email: true },
  })

  console.log(`Password set for ${volunteer.firstName} ${volunteer.lastName} (${volunteer.email})`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
