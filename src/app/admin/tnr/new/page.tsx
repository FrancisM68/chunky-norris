import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TNRForm } from "../[id]/TNRForm";

export default async function NewTNRPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <TNRForm record={null} />;
}
