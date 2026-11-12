"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, LockKeyhole, Save } from "lucide-react";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Avatar,
  Badge,
  ProgressRing,
} from "@/components/ui/display";
import {
  FormField,
  FormMessage,
  Input,
  Select,
  Textarea,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { compressImageSafe } from "@/lib/client-image";
import { fetchWithTimeout } from "@/lib/client-fetch";
import {
  COUNTRIES,
  loadLgasForLocation,
  loadStatesForCountry,
} from "@/lib/locations";
import { formatDate } from "@/lib/utils";

export type ProfileEditorData = {
  name: string;
  email: string;
  phone: string;
  gender: string;
  maritalStatus: string;
  country: string;
  state: string;
  lga: string;
  worshipCenterId: string;
  worshipCenterName: string | null;
  dateOfBirth: string;
  address: string;
  occupation: string;
  bio: string;
  showPhone: boolean;
  showEmail: boolean;
  showLastSeen: boolean;
  avatarUrl: string | null;
  coverUrl: string | null;
  memberCode: string | null;
  departmentName: string | null;
  registrationStatus: string | null;
  memberStatus: string | null;
  createdAt: string | null;
  roles: string[];
  attendance: {
    sunday: number;
    midweek: number;
    special: number;
    overall: number;
    totalMarked: number;
    percentage: number;
  };
};

type CenterOption = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
};

export function ProfileEditor({
  initial,
  centers,
}: {
  initial: ProfileEditorData;
  centers: CenterOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState(initial);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [coverUrl, setCoverUrl] = useState(initial.coverUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [lgaOptions, setLgaOptions] = useState<string[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [lgasLoading, setLgasLoading] = useState(false);

  const completeness = useMemo(() => {
    const fields = [
      form.name,
      form.phone,
      form.gender,
      form.dateOfBirth,
      form.address,
      form.occupation,
      form.bio,
      avatarUrl,
    ];
    const filled = fields.filter((value) => Boolean(value && String(value).trim())).length;
    return Math.round((filled / fields.length) * 100);
  }, [form, avatarUrl]);

  const countryOptions = useMemo(
    () => COUNTRIES.map((country) => country.name),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    setStateOptions([]);
    if (!form.country.trim()) {
      setStatesLoading(false);
      return;
    }
    setStatesLoading(true);
    loadStatesForCountry(form.country)
      .then((options) => {
        if (!cancelled) setStateOptions(options);
      })
      .catch(() => {
        if (!cancelled) setStateOptions([]);
      })
      .finally(() => {
        if (!cancelled) setStatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.country]);

  useEffect(() => {
    let cancelled = false;
    setLgaOptions([]);
    if (!form.country.trim() || !form.state.trim()) {
      setLgasLoading(false);
      return;
    }
    setLgasLoading(true);
    loadLgasForLocation(form.country, form.state)
      .then((options) => {
        if (!cancelled) setLgaOptions(options);
      })
      .catch(() => {
        if (!cancelled) setLgaOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLgasLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.country, form.state]);

  function updateCountry(value: string) {
    setForm((current) => ({
      ...current,
      country: value,
      state: "",
      lga: "",
    }));
  }

  function updateState(value: string) {
    setForm((current) => ({ ...current, state: value, lga: "" }));
  }

  function update<K extends keyof ProfileEditorData>(
    key: K,
    value: ProfileEditorData[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function upload(kind: "avatar" | "cover", file: File | null) {
    if (!file) return;
    setError(null);
    setUploading(kind);
    try {
      const compressed = await compressImageSafe(file, {
        maxDimension: kind === "avatar" ? 900 : 1800,
        maxBytes: kind === "avatar" ? 240 * 1024 : 520 * 1024,
      });
      const data = new FormData();
      data.append("kind", kind);
      data.append("file", compressed);
      const response = await fetchWithTimeout("/api/member/media", {
        method: "POST",
        body: data,
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        throw new Error(result.error ?? "Upload failed.");
      }
      if (kind === "avatar") setAvatarUrl(result.url);
      else setCoverUrl(result.url);
      toast({ title: kind === "avatar" ? "Profile photo updated" : "Cover photo updated" });
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const response = await fetchWithTimeout("/api/member/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          gender: form.gender || undefined,
          maritalStatus: form.maritalStatus || "",
          country: form.country,
          state: form.state,
          lga: form.lga,
          worshipCenterId: form.worshipCenterId,
          dateOfBirth: form.dateOfBirth || "",
          address: form.address,
          occupation: form.occupation,
          bio: form.bio,
          showPhone: form.showPhone,
          showEmail: form.showEmail,
          showLastSeen: form.showLastSeen,
        }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not save your profile.");
      }
      toast({ title: "Profile saved" });
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
        <div
          className="relative h-40 bg-brand-gradient sm:h-56"
          style={
            coverUrl
              ? {
                  backgroundImage: `url(${coverUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <div className="absolute right-3 top-3">
            <PhotoPicker
              onChange={(file) => upload("cover", file)}
              onError={setError}
              label="Change cover"
              changeLabel="Change cover"
              disabled={uploading !== null}
              maxDimension={1800}
              maxBytes={520 * 1024}
              triggerClassName="border-transparent bg-black/35 text-xs text-white backdrop-blur hover:bg-black/50"
              trigger={
                <>
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  {uploading === "cover" ? "Uploading..." : "Change cover"}
                </>
              }
            />
          </div>
        </div>
        <div className="relative px-4 pb-5 pt-3 sm:px-6">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-3">
              <div className="relative">
                <Avatar
                  name={form.name}
                  src={avatarUrl}
                  size="xl"
                  className="border-4 border-white shadow-lift"
                />
                <div className="absolute -bottom-1 -right-1">
                  <PhotoPicker
                    onChange={(file) => upload("avatar", file)}
                    onError={setError}
                    label="Change profile photo"
                    changeLabel="Change profile photo"
                    capture="user"
                    disabled={uploading !== null}
                    maxDimension={900}
                    maxBytes={240 * 1024}
                    triggerClassName="w-9 border-transparent bg-brand-700 px-0 text-cream hover:bg-brand-800"
                    trigger={<Camera className="h-4 w-4" aria-hidden="true" />}
                  />
                </div>
              </div>
              <div className="pb-1">
                <h1 className="font-serif text-2xl font-bold leading-tight">
                  {form.name}
                </h1>
                <p className="text-sm text-charcoal/55">
                  {form.memberCode ?? "Member"} · {form.departmentName ?? "General Member"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge
                    tone={form.registrationStatus === "approved" ? "success" : "warning"}
                  >
                    {form.registrationStatus ?? "pending"}
                  </Badge>
                  <Badge tone={form.memberStatus === "active" ? "brand" : "neutral"}>
                    {form.memberStatus ?? "inactive"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-brand-50 px-3 py-2">
              <ProgressRing value={completeness} size={56} stroke={6} />
              <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-brand-800">
                Complete
              </p>
            </div>
          </div>
        </div>
      </div>

      {error ? <FormMessage>{error}</FormMessage> : null}

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="surface p-5 sm:p-6">
          <h2 className="font-serif text-xl font-semibold">Edit profile</h2>
          <p className="mt-1 text-sm text-charcoal/60">
            Update your personal details. Contact visibility is controlled by your
            privacy settings.
          </p>

          <div className="mt-5 space-y-4">
            <FormField label="Full name" htmlFor="profile-name">
              <Input
                id="profile-name"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                autoComplete="name"
              />
            </FormField>
            <FormField label="Email" htmlFor="profile-email" hint="Contact the church office to change your email.">
              <Input id="profile-email" value={form.email} disabled />
            </FormField>
            <FormField label="Phone number" htmlFor="profile-phone">
              <Input
                id="profile-phone"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
                autoComplete="tel"
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Gender" htmlFor="profile-gender">
                <Select
                  id="profile-gender"
                  value={form.gender}
                  onChange={(event) => update("gender", event.target.value)}
                >
                  <option value="">Not set</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </Select>
              </FormField>
              <FormField label="Date of birth" htmlFor="profile-dob">
                <Input
                  id="profile-dob"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(event) => update("dateOfBirth", event.target.value)}
                  autoComplete="bday"
                />
              </FormField>
            </div>
            <FormField label="Marital status" htmlFor="profile-marital">
              <Select
                id="profile-marital"
                value={form.maritalStatus}
                onChange={(event) => update("maritalStatus", event.target.value)}
              >
                <option value="">Not set</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </Select>
            </FormField>
            <FormField label="Worship center" htmlFor="profile-center">
              <Select
                id="profile-center"
                value={form.worshipCenterId}
                onChange={(event) => update("worshipCenterId", event.target.value)}
              >
                <option value="">Not set</option>
                {centers.map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.name}
                    {center.city ? ` — ${center.city}` : ""}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Country" htmlFor="profile-country">
                <Combobox
                  id="profile-country"
                  label="Country"
                  value={form.country}
                  onChange={updateCountry}
                  options={countryOptions}
                  placeholder="Search countries..."
                />
              </FormField>
              <FormField label="State" htmlFor="profile-state">
                {!form.country.trim() ? (
                  <Input
                    id="profile-state"
                    value=""
                    placeholder="Select a country first"
                    disabled
                  />
                ) : statesLoading ? (
                  <Combobox
                    id="profile-state"
                    label="State"
                    value=""
                    onChange={updateState}
                    options={[]}
                    placeholder="Loading states..."
                    disabled
                  />
                ) : stateOptions.length ? (
                  <Combobox
                    id="profile-state"
                    label="State"
                    value={form.state}
                    onChange={updateState}
                    options={stateOptions}
                    placeholder="Search states..."
                  />
                ) : (
                  <Input
                    id="profile-state"
                    value={form.state}
                    onChange={(event) => updateState(event.target.value)}
                    autoComplete="address-level1"
                    placeholder="Enter your state or region"
                  />
                )}
              </FormField>
            </div>
            <FormField label="LGA" htmlFor="profile-lga">
              {!form.country.trim() || !form.state.trim() ? (
                <Input
                  id="profile-lga"
                  value=""
                  placeholder="Select a state first"
                  disabled
                />
              ) : lgasLoading ? (
                <Combobox
                  id="profile-lga"
                  label="Local government"
                  value=""
                  onChange={(value) => update("lga", value)}
                  options={[]}
                  placeholder="Loading LGAs..."
                  disabled
                />
              ) : lgaOptions.length ? (
                <Combobox
                  id="profile-lga"
                  label="Local government"
                  value={form.lga}
                  onChange={(value) => update("lga", value)}
                  options={lgaOptions}
                  placeholder="Search LGAs..."
                />
              ) : (
                <Input
                  id="profile-lga"
                  value={form.lga}
                  onChange={(event) => update("lga", event.target.value)}
                  autoComplete="address-level2"
                  placeholder="Enter your local government or city"
                />
              )}
            </FormField>
            <FormField label="Address" htmlFor="profile-address">
              <Textarea
                id="profile-address"
                value={form.address}
                onChange={(event) => update("address", event.target.value)}
                autoComplete="street-address"
              />
            </FormField>
            <FormField label="Occupation" htmlFor="profile-occupation">
              <Input
                id="profile-occupation"
                value={form.occupation}
                onChange={(event) => update("occupation", event.target.value)}
                autoComplete="organization-title"
              />
            </FormField>
            <FormField label="Bio" htmlFor="profile-bio" hint="Optional introduction for the member directory.">
              <Textarea
                id="profile-bio"
                value={form.bio}
                onChange={(event) => update("bio", event.target.value)}
                maxLength={600}
              />
            </FormField>
          </div>

          <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
            <p className="text-sm font-semibold text-charcoal">Contact privacy</p>
            <div className="mt-3 space-y-3">
              {[
                {
                  key: "showPhone" as const,
                  label: "Show my phone number in the member directory",
                },
                {
                  key: "showEmail" as const,
                  label: "Show my email in the member directory",
                },
                {
                  key: "showLastSeen" as const,
                  label: "Show my last activity to other members",
                },
              ].map((toggle) => (
                <label
                  key={toggle.key}
                  className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-charcoal/75"
                >
                  <input
                    type="checkbox"
                    checked={form[toggle.key]}
                    onChange={(event) => update(toggle.key, event.target.checked)}
                    className="h-5 w-5 rounded border-brand-300 text-brand-700 focus:ring-brand-700"
                  />
                  {toggle.label}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Button onClick={save} loading={saving}>
              <Save className="h-4 w-4" aria-hidden="true" />
              Save changes
            </Button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="surface p-5">
            <h2 className="font-serif text-lg font-semibold">Membership</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                  Member ID
                </dt>
                <dd className="mt-0.5 font-semibold text-charcoal/80">
                  {form.memberCode ?? "Pending"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                  Department
                </dt>
                <dd className="mt-0.5 text-charcoal/75">
                  {form.departmentName ?? "General Member"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                  Worship center
                </dt>
                <dd className="mt-0.5 text-charcoal/75">
                  {centers.find((center) => center.id === form.worshipCenterId)
                    ?.name ??
                    form.worshipCenterName ??
                    "Not set"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                  Registered
                </dt>
                <dd className="mt-0.5 text-charcoal/75">
                  {formatDate(form.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                  Roles
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {form.roles.length ? (
                    form.roles.map((role) => (
                      <Badge key={role} tone="brand">
                        {role.replace(/_/g, " ")}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-charcoal/55">Member</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <p className="flex items-center gap-2 font-semibold">
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              Managed by the church
            </p>
            <p className="mt-1 text-amber-900/75">
              Department, registration status, member status and leadership are
              managed by the membership team. Contact the office for changes.
            </p>
          </div>

          <div className="surface p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-serif text-lg font-semibold">Attendance</h2>
                <p className="mt-1 text-sm text-charcoal/60">
                  Across {initial.attendance.totalMarked} marked gathering
                  {initial.attendance.totalMarked === 1 ? "" : "s"}.
                </p>
              </div>
              <ProgressRing
                value={initial.attendance.percentage}
                size={56}
                stroke={6}
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-emerald-50 p-3">
                <p className="font-serif text-xl font-bold text-emerald-800">
                  {initial.attendance.overall}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800/70">
                  Present
                </p>
              </div>
              <div className="rounded-2xl bg-brand-50 p-3">
                <p className="font-serif text-xl font-bold text-brand-800">
                  {initial.attendance.sunday}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-800/70">
                  Sunday
                </p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3">
                <p className="font-serif text-xl font-bold text-amber-800">
                  {initial.attendance.midweek}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/70">
                  Midweek
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
