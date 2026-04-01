import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AnimalForm } from "../[id]/AnimalForm";

export default async function NewAnimalPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <AnimalForm animal={null} />;
}
