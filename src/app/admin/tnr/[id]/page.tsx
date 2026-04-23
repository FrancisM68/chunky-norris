import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTenantClient } from "@/lib/tenant";
import { TNRForm, type TNRDetail } from "./TNRForm";

export default async function TNRDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const db = getTenantClient("dar");

  const raw = await db.tNRRecord.findUnique({ where: { id } });
  if (!raw) notFound();

  const record: TNRDetail = {
    id: raw.id,
    locationName: raw.locationName,
    county: raw.county,
    contactName: raw.contactName,
    contactNumber: raw.contactNumber,
    sex: raw.sex as string,
    ageEstimate: raw.ageEstimate,
    coatColour: raw.coatColour,
    earTipped: raw.earTipped,
    dateIntoDar: raw.dateIntoDar.toISOString(),
    dateOutOfDar: raw.dateOutOfDar?.toISOString() ?? null,
    dateNeutered: raw.dateNeutered?.toISOString() ?? null,
    vetHospital: raw.vetHospital,
    apRefNumber: raw.apRefNumber,
    vaccinationStatus: (raw.vaccinationStatus ?? null) as string | null,
    vaccineType: raw.vaccineType,
    fivResult: (raw.fivResult ?? null) as string | null,
    felvResult: (raw.felvResult ?? null) as string | null,
    status: raw.status as string,
    outcome: (raw.outcome ?? null) as string | null,
    notes: raw.notes,
  };

  return <TNRForm record={record} />;
}
