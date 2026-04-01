-- Migration: add_other_species_and_new_fields
-- Formalises changes previously applied via `prisma db push`:
--   1. Add OTHER variant to Species enum
--   2. Add speciesOther column to animals table
--   3. Add notes column to animals table
--   4. Add passwordHash column to volunteers table
--   5. Remove CARD variant from PaymentMethod enum (not in current schema)

-- 1. Add OTHER to Species enum
ALTER TYPE "Species" ADD VALUE IF NOT EXISTS 'OTHER';

-- 2 & 3. Add new columns to animals table
ALTER TABLE "animals"
  ADD COLUMN IF NOT EXISTS "speciesOther" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- 4. Add passwordHash to volunteers table
ALTER TABLE "volunteers"
  ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

-- 5. Remove CARD from PaymentMethod enum
--    PostgreSQL does not support DROP VALUE on enums directly.
--    We rename the old type, create a new one without CARD, migrate the column, then drop the old type.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentMethod' AND e.enumlabel = 'CARD'
  ) THEN
    ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";

    CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CHEQUE', 'BANK_TRANSFER');

    ALTER TABLE "adoptions"
      ALTER COLUMN "paymentMethod" TYPE "PaymentMethod"
      USING "paymentMethod"::text::"PaymentMethod";

    DROP TYPE "PaymentMethod_old";
  END IF;
END
$$;
