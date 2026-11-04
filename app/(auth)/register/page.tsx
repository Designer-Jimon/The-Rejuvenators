import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { RegisterWizard } from "@/components/auth/register-wizard";

export const metadata: Metadata = { title: "Join the family" };

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect("/member");

  const db = await getDb();
  const list = await db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .where(eq(departments.isActive, true))
    .orderBy(departments.sortOrder);

  return <RegisterWizard departments={list} />;
}
