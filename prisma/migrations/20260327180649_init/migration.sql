-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'FOSTER', 'VOLUNTEER', 'TNR_OPERATOR', 'HOME_CHECKER');

-- CreateEnum
CREATE TYPE "Species" AS ENUM ('CAT', 'DOG', 'RABBIT', 'FERRET');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE_INTACT', 'MALE_NEUTERED', 'FEMALE_INTACT', 'FEMALE_NEUTERED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "IntakeSource" AS ENUM ('STRAY', 'SURRENDER', 'TNR', 'ABANDONED', 'ORPHANED', 'RTA', 'POUND');

-- CreateEnum
CREATE TYPE "AnimalStatus" AS ENUM ('IN_CARE', 'FOSTERED', 'ADOPTED', 'RETURNED_TO_OWNER', 'EUTHANISED', 'DIED_IN_CARE', 'TNR_RETURNED');

-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('GOOD', 'OK', 'POOR');

-- CreateEnum
CREATE TYPE "VaccinationStatus" AS ENUM ('NOT_VACCINATED', 'V1_ONLY', 'V1_AND_V2', 'FULLY_VACCINATED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "TestResult" AS ENUM ('POSITIVE', 'NEGATIVE', 'NOT_TESTED');

-- CreateEnum
CREATE TYPE "DisposalMethod" AS ENUM ('REHOMED', 'RECLAIMED', 'EUTHANISED', 'DIED_IN_CARE', 'TNR_RETURNED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "MedicationType" AS ENUM ('DEWORMING', 'FLEA_TREATMENT', 'TICK_TREATMENT', 'VACCINATION', 'ANTIBIOTIC', 'ANTI_INFLAMMATORY', 'EYE_DROPS', 'EAR_DROPS', 'LONG_TERM_MEDICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "DosageUnit" AS ENUM ('ML', 'MG', 'TABLET', 'HALF_TABLET', 'PIPETTE', 'SPOT_ON', 'SPRAY_DOSE', 'OTHER');

-- CreateEnum
CREATE TYPE "MedicationDisposal" AS ENUM ('ADMINISTERED_IN_FULL', 'PARTIAL_RETURNED', 'DISPOSED_OF', 'COURSE_ONGOING');

-- CreateEnum
CREATE TYPE "TNRStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "TNROutcome" AS ENUM ('RETURNED_RELEASED', 'REHOMED', 'EUTHANISED', 'DIED_IN_CARE', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "HomeCheckResult" AS ENUM ('APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'PENDING_FOLLOW_UP');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CHEQUE', 'BANK_TRANSFER', 'CARD');

-- CreateTable
CREATE TABLE "rescues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "charityNum" TEXT,
    "petSupplier" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rescues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteers" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "phone2" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "town" TEXT,
    "county" TEXT,
    "eircode" TEXT,
    "roles" "Role"[] DEFAULT ARRAY['FOSTER']::"Role"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volunteers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animals" (
    "id" TEXT NOT NULL,
    "officialName" TEXT NOT NULL,
    "nickname" TEXT,
    "species" "Species" NOT NULL,
    "breed" TEXT,
    "description" TEXT,
    "gender" "Gender" NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "dobIsEstimate" BOOLEAN NOT NULL DEFAULT true,
    "ageAtIntake" TEXT,
    "microchipNumber" TEXT,
    "microchipDate" TIMESTAMP(3),
    "intakeDate" TIMESTAMP(3) NOT NULL,
    "intakeSource" "IntakeSource" NOT NULL,
    "strayLocation" TEXT,
    "infoSource" TEXT,
    "darRefNumber" TEXT,
    "vetRefNumber" TEXT,
    "status" "AnimalStatus" NOT NULL DEFAULT 'IN_CARE',
    "currentLocation" TEXT,
    "condition" "Condition",
    "vaccinationStatus" "VaccinationStatus",
    "v1Date" TIMESTAMP(3),
    "v2Date" TIMESTAMP(3),
    "vaccineType" TEXT,
    "neuteredDate" TIMESTAMP(3),
    "neuteredVet" TEXT,
    "fivResult" "TestResult",
    "felvResult" "TestResult",
    "kennelCoughDate" TIMESTAMP(3),
    "rabiesDate" TIMESTAMP(3),
    "departureDate" TIMESTAMP(3),
    "disposalMethod" "DisposalMethod",
    "totalDaysInCare" INTEGER,
    "legacyNotes" TEXT,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "animals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_logs" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "administeredById" TEXT NOT NULL,
    "medicationType" "MedicationType" NOT NULL,
    "medicationName" TEXT NOT NULL,
    "medicationNameFreeText" TEXT,
    "dosageAmount" DOUBLE PRECISION NOT NULL,
    "dosageUnit" "DosageUnit" NOT NULL,
    "batchNumber" TEXT,
    "administeredAt" TIMESTAMP(3) NOT NULL,
    "animalWeightKg" DOUBLE PRECISION NOT NULL,
    "medicationDisposal" "MedicationDisposal" NOT NULL,
    "treatmentReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foster_assignments" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "fosterId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "foster_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tnr_records" (
    "id" TEXT NOT NULL,
    "animalId" TEXT,
    "volunteer1Id" TEXT,
    "volunteer2Id" TEXT,
    "locationName" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "contactName" TEXT,
    "contactNumber" TEXT,
    "sex" "Gender" NOT NULL,
    "ageEstimate" TEXT,
    "coatColour" TEXT,
    "earTipped" BOOLEAN NOT NULL DEFAULT false,
    "dateIntoDar" TIMESTAMP(3) NOT NULL,
    "dateOutOfDar" TIMESTAMP(3),
    "dateNeutered" TIMESTAMP(3),
    "elapsedDays" INTEGER,
    "vetHospital" TEXT,
    "apRefNumber" TEXT,
    "vaccinationStatus" "VaccinationStatus",
    "vaccineType" TEXT,
    "fivResult" "TestResult",
    "felvResult" "TestResult",
    "status" "TNRStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "outcome" "TNROutcome",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tnr_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_checks" (
    "id" TEXT NOT NULL,
    "adoptionId" TEXT,
    "inspectorId" TEXT NOT NULL,
    "adoptionId2" TEXT,
    "address" TEXT NOT NULL,
    "town" TEXT,
    "county" TEXT,
    "eircode" TEXT,
    "checkDate" TIMESTAMP(3) NOT NULL,
    "gardenSecure" BOOLEAN,
    "gardenNotes" TEXT,
    "responses" JSONB NOT NULL,
    "overallResult" "HomeCheckResult" NOT NULL,
    "inspectorNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adoptions" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "darVolunteerId" TEXT,
    "adopterName" TEXT NOT NULL,
    "adopterAddress1" TEXT,
    "adopterAddress2" TEXT,
    "adopterTown" TEXT,
    "adopterCounty" TEXT,
    "adopterEircode" TEXT,
    "adopterPhone" TEXT,
    "adopterMobile" TEXT,
    "adopterEmail" TEXT,
    "adoptionDate" TIMESTAMP(3) NOT NULL,
    "adoptionFee" DOUBLE PRECISION,
    "paymentMethod" "PaymentMethod",
    "amountReceived" DOUBLE PRECISION,
    "treatmentSummary" TEXT,
    "agreementSigned" BOOLEAN NOT NULL DEFAULT false,
    "agreementDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adoptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rescues_slug_key" ON "rescues"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "volunteers_email_key" ON "volunteers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "animals_microchipNumber_key" ON "animals"("microchipNumber");

-- CreateIndex
CREATE UNIQUE INDEX "tnr_records_animalId_key" ON "tnr_records"("animalId");

-- CreateIndex
CREATE UNIQUE INDEX "home_checks_adoptionId_key" ON "home_checks"("adoptionId");

-- CreateIndex
CREATE UNIQUE INDEX "adoptions_animalId_key" ON "adoptions"("animalId");

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "volunteers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_logs" ADD CONSTRAINT "treatment_logs_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_logs" ADD CONSTRAINT "treatment_logs_administeredById_fkey" FOREIGN KEY ("administeredById") REFERENCES "volunteers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foster_assignments" ADD CONSTRAINT "foster_assignments_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foster_assignments" ADD CONSTRAINT "foster_assignments_fosterId_fkey" FOREIGN KEY ("fosterId") REFERENCES "volunteers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tnr_records" ADD CONSTRAINT "tnr_records_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tnr_records" ADD CONSTRAINT "tnr_records_volunteer1Id_fkey" FOREIGN KEY ("volunteer1Id") REFERENCES "volunteers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tnr_records" ADD CONSTRAINT "tnr_records_volunteer2Id_fkey" FOREIGN KEY ("volunteer2Id") REFERENCES "volunteers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_checks" ADD CONSTRAINT "home_checks_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "volunteers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_checks" ADD CONSTRAINT "home_checks_adoptionId_fkey" FOREIGN KEY ("adoptionId") REFERENCES "adoptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoptions" ADD CONSTRAINT "adoptions_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
