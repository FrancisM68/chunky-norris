import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTenantClient } from "@/lib/tenant";
import { AnimalForm, type AnimalDetail } from "./AnimalForm";

export default async function AnimalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const db = getTenantClient("dar");

  const raw = await db.animal.findUnique({ where: { id } });
  if (!raw) notFound();

  // Serialize Date fields to ISO strings for the Client Component boundary
  const animal: AnimalDetail = {
    id: raw.id,
    officialName: raw.officialName,
    nickname: raw.nickname,
    species: raw.species,
    speciesOther: raw.speciesOther,
    breed: raw.breed,
    description: raw.description,
    gender: raw.gender,
    dateOfBirth: raw.dateOfBirth?.toISOString() ?? null,
    dobIsEstimate: raw.dobIsEstimate,
    ageAtIntake: raw.ageAtIntake,
    microchipNumber: raw.microchipNumber,
    microchipDate: raw.microchipDate?.toISOString() ?? null,
    intakeDate: raw.intakeDate.toISOString(),
    intakeSource: raw.intakeSource,
    strayLocation: raw.strayLocation,
    infoSource: raw.infoSource,
    darRefNumber: raw.darRefNumber,
    vetRefNumber: raw.vetRefNumber,
    vaccinationStatus: raw.vaccinationStatus,
    v1Date: raw.v1Date?.toISOString() ?? null,
    v2Date: raw.v2Date?.toISOString() ?? null,
    vaccineType: raw.vaccineType,
    neuteredDate: raw.neuteredDate?.toISOString() ?? null,
    neuteredVet: raw.neuteredVet,
    fivResult: raw.fivResult,
    felvResult: raw.felvResult,
    kennelCoughDate: raw.kennelCoughDate?.toISOString() ?? null,
    rabiesDate: raw.rabiesDate?.toISOString() ?? null,
    condition: raw.condition,
    status: raw.status,
    currentLocation: raw.currentLocation,
    departureDate: raw.departureDate?.toISOString() ?? null,
    disposalMethod: raw.disposalMethod,
    notes: raw.notes,
    legacyNotes: raw.legacyNotes,
  };

  return <AnimalForm animal={animal} />;
}
