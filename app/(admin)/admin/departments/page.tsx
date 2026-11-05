import type { Metadata } from "next";
import Image from "next/image";
import { asc, desc } from "drizzle-orm";
import { Building2, UserRound } from "lucide-react";
import { getDb } from "@/lib/db";
import { departments, mediaLibrary } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { publicMediaUrl } from "@/lib/media";
import { FormMessage, Input, Label, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { ImagePicker } from "@/components/admin/image-picker";
import { saveDepartment } from "./actions";

export const metadata: Metadata = { title: "Departments" };
export const dynamic = "force-dynamic";

export default async function AdminDepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requirePermission(PERMISSIONS.contentManage, "/admin/departments");
  const { saved, error } = await searchParams;
  const db = await getDb();
  const [list, media] = await Promise.all([
    db
      .select()
      .from(departments)
      .orderBy(asc(departments.sortOrder), asc(departments.name)),
    db.select().from(mediaLibrary).orderBy(desc(mediaLibrary.createdAt)),
  ]);

  const pickerMedia = media.map((item) => ({
    id: item.id,
    key: item.key,
    filename: item.filename,
    altText: item.altText,
  }));

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
          Content
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold">Departments</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
          Edit department descriptions, photos, activities and the head of unit
          shown on the public department page.
        </p>
      </div>

      {saved ? <FormMessage tone="success">Department saved.</FormMessage> : null}
      {error ? <FormMessage>{error}</FormMessage> : null}

      <div className="space-y-3">
        {list.map((department) => (
          <article key={department.id} className="surface overflow-hidden">
            <div className="grid sm:grid-cols-[180px_1fr]">
              <div className="relative aspect-[16/9] bg-brand-50 sm:aspect-auto sm:min-h-36">
                {department.imageKey ? (
                  <Image
                    src={publicMediaUrl(department.imageKey) ?? ""}
                    alt={department.name}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, 180px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full min-h-28 items-center justify-center text-brand-300">
                    <Building2 className="h-8 w-8" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-5">
                <h2 className="font-serif text-xl font-semibold">
                  {department.name}
                </h2>
                <p className="mt-1 text-sm leading-6 text-charcoal/65">
                  {department.description || "No description yet."}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-charcoal/55">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  {department.headOfUnit || "Head of unit not set"}
                </p>
              </div>
            </div>
            <details className="border-t border-brand-100 p-4 sm:p-5">
              <summary className="min-h-11 cursor-pointer text-sm font-semibold text-brand-800">
                Edit department
              </summary>
              <form action={saveDepartment} className="mt-4 space-y-4">
                <input type="hidden" name="id" value={department.id} />
                <div>
                  <Label htmlFor={`description-${department.id}`}>
                    Description
                  </Label>
                  <Textarea
                    id={`description-${department.id}`}
                    name="description"
                    defaultValue={department.description ?? ""}
                    maxLength={2000}
                  />
                </div>
                <ImagePicker
                  name="imageKey"
                  label="Department photo"
                  defaultValue={department.imageKey}
                  defaultUrl={publicMediaUrl(department.imageKey)}
                  media={pickerMedia}
                />
                <div>
                  <Label htmlFor={`activities-${department.id}`}>
                    Department activities
                  </Label>
                  <Textarea
                    id={`activities-${department.id}`}
                    name="activities"
                    defaultValue={department.activities ?? ""}
                    maxLength={8000}
                  />
                </div>
                <div>
                  <Label htmlFor={`head-${department.id}`}>
                    Head of unit (display)
                  </Label>
                  <Input
                    id={`head-${department.id}`}
                    name="headOfUnit"
                    defaultValue={department.headOfUnit ?? ""}
                    maxLength={200}
                  />
                </div>
                <SubmitButton pendingLabel="Saving department...">
                  Save department
                </SubmitButton>
              </form>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}
