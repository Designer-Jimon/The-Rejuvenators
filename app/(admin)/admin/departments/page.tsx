import type { Metadata } from "next";
import Image from "next/image";
import { asc, desc } from "drizzle-orm";
import { Building2, Plus, UserRound } from "lucide-react";
import { getDb } from "@/lib/db";
import { departments, mediaLibrary } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { publicMediaUrl } from "@/lib/media";
import { FormMessage, Input, Label, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { ImagePicker } from "@/components/admin/image-picker";
import { IconPicker } from "@/components/admin/icon-picker";
import { DepartmentIcon } from "@/lib/department-icons";
import {
  createDepartment,
  deleteDepartment,
  saveDepartment,
} from "./actions";

export const metadata: Metadata = { title: "Departments" };
export const dynamic = "force-dynamic";

export default async function AdminDepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    created?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  await requirePermission(PERMISSIONS.contentManage, "/admin/departments");
  const { saved, created, deleted, error } = await searchParams;
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
          Create and edit departments, their icon, photo, descriptions and the
          head of unit shown on the public department page.
        </p>
      </div>

      {saved ? <FormMessage tone="success">Department saved.</FormMessage> : null}
      {created ? (
        <FormMessage tone="success">Department created.</FormMessage>
      ) : null}
      {deleted ? (
        <FormMessage tone="success">Department deleted.</FormMessage>
      ) : null}
      {error ? <FormMessage>{error}</FormMessage> : null}

      <details className="surface p-4 sm:p-5">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-brand-800">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create a department
        </summary>
        <form action={createDepartment} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="new-department-name">Department name</Label>
              <Input
                id="new-department-name"
                name="name"
                required
                maxLength={120}
              />
            </div>
            <div>
              <Label htmlFor="new-department-slug">
                Link (optional)
              </Label>
              <Input
                id="new-department-slug"
                name="slug"
                maxLength={120}
                placeholder="Generated from the name"
              />
            </div>
          </div>
          <IconPicker id="new-department-icon" />
          <div>
            <Label htmlFor="new-department-description">Description</Label>
            <Textarea
              id="new-department-description"
              name="description"
              maxLength={2000}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="new-department-sort">Display order</Label>
              <Input
                id="new-department-sort"
                name="sortOrder"
                type="number"
                min={0}
                max={9999}
                defaultValue={list.length + 1}
              />
            </div>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 self-end rounded-2xl border border-brand-200 bg-white px-4 text-sm text-charcoal/75">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked
                className="h-5 w-5 rounded border-brand-300 text-brand-700 focus:ring-brand-700"
              />
              Show on the website
            </label>
          </div>
          <SubmitButton pendingLabel="Creating department...">
            Create department
          </SubmitButton>
        </form>
      </details>

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
                    {department.iconKey ? (
                      <DepartmentIcon
                        name={department.iconKey}
                        className="h-10 w-10"
                      />
                    ) : (
                      <Building2 className="h-8 w-8" aria-hidden="true" />
                    )}
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-serif text-xl font-semibold">
                    {department.name}
                  </h2>
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-800">
                    {department.isActive ? "Live" : "Hidden"}
                  </span>
                </div>
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`name-${department.id}`}>Name</Label>
                    <Input
                      id={`name-${department.id}`}
                      name="name"
                      defaultValue={department.name}
                      required
                      maxLength={120}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`slug-${department.id}`}>Link</Label>
                    <Input
                      id={`slug-${department.id}`}
                      name="slug"
                      defaultValue={department.slug}
                      maxLength={120}
                    />
                  </div>
                </div>
                <IconPicker
                  id={`icon-${department.id}`}
                  defaultValue={department.iconKey}
                />
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`sort-${department.id}`}>Display order</Label>
                    <Input
                      id={`sort-${department.id}`}
                      name="sortOrder"
                      type="number"
                      min={0}
                      max={9999}
                      defaultValue={department.sortOrder}
                    />
                  </div>
                  <label className="flex min-h-12 cursor-pointer items-center gap-3 self-end rounded-2xl border border-brand-200 bg-white px-4 text-sm text-charcoal/75">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={department.isActive}
                      className="h-5 w-5 rounded border-brand-300 text-brand-700 focus:ring-brand-700"
                    />
                    Show on the website
                  </label>
                </div>
                <SubmitButton pendingLabel="Saving department...">
                  Save department
                </SubmitButton>
              </form>
              <form
                action={deleteDepartment}
                className="mt-3 border-t border-brand-100 pt-3"
              >
                <input type="hidden" name="id" value={department.id} />
                <SubmitButton
                  variant="danger"
                  size="sm"
                  pendingLabel="Deleting..."
                >
                  Delete department
                </SubmitButton>
              </form>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}
