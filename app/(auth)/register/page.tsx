import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { departments, worshipCenters } from "@/lib/db/schema";
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

  const centers = await db
    .select({
      id: worshipCenters.id,
      name: worshipCenters.name,
      city: worshipCenters.city,
      state: worshipCenters.state,
    })
    .from(worshipCenters)
    .where(eq(worshipCenters.isActive, true))
    .orderBy(worshipCenters.sortOrder, worshipCenters.name);

  return <RegisterWizard departments={list} centers={centers} />;
}
