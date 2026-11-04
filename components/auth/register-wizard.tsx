"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/client-image";

type DepartmentOption = { id: string; name: string };

type FormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  gender: string;
  dateOfBirth: string;
  address: string;
  occupation: string;
  departmentId: string;
  bio: string;
};

const initialForm: FormState = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  gender: "",
  dateOfBirth: "",
  address: "",
  occupation: "",
  departmentId: "",
  bio: "",
};

const steps = [
  { title: "Your details", description: "Tell us who you are." },
  { title: "About you", description: "A little more about your journey." },
  { title: "Service", description: "Where would you like to serve?" },
];

export function RegisterWizard({ departments }: { departments: DepartmentOption[] }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function next() {
    setError(null);
    if (step === 0) {
      if (form.name.trim().length < 2) return setError("Enter your full name.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        return setError("Enter a valid email address.");
      }
      if (form.phone.trim().length < 7) return setError("Enter a valid phone number.");
      if (form.password.length < 8) return setError("Use at least 8 characters for your password.");
      if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
        return setError("Include a letter and a number in your password.");
      }
      if (form.password !== form.confirmPassword) {
        return setError("Passwords do not match.");
      }
    }
    if (step === 1) {
      if (!form.gender) return setError("Select an option for gender.");
      if (!form.dateOfBirth) return setError("Enter your date of birth.");
      if (form.address.trim().length < 4) return setError("Enter your address.");
    }
    setStep((current) => Math.min(steps.length - 1, current + 1));
  }

  async function onPhoto(file: File | null) {
    setError(null);
    if (!file) {
      setAvatar(null);
      setPreview(null);
      return;
    }
    try {
      const compressed = await compressImage(file, { maxDimension: 1200, maxBytes: 280 * 1024 });
      setAvatar(compressed);
      setPreview(URL.createObjectURL(compressed));
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : "Could not use that photo.");
    }
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      if (avatar) data.append("avatar", avatar);

      const response = await fetch("/api/auth/register", {
        method: "POST",
        body: data,
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Registration failed. Please try again.");
      }
      setDone(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="surface p-6 text-center sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-5 font-serif text-2xl font-bold">Registration received</h1>
        <p className="mt-3 text-sm leading-7 text-charcoal/70">
          Thank you for joining the family. Your registration is pending review by
          the membership team. You can sign in now to check your status.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/login?registered=1">
            <Button className="w-full">Sign in to your account</Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full">
              Back to the website
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="surface p-5 sm:p-7">
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-charcoal/45">
          <span>
            Step {step + 1} of {steps.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-100">
          <div
            className="h-full rounded-full bg-brand-gradient transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <h1 className="mt-4 font-serif text-2xl font-bold">{steps[step].title}</h1>
        <p className="mt-1 text-sm text-charcoal/60">{steps[step].description}</p>
      </div>

      {error ? <div className="mb-4"><FormMessage>{error}</FormMessage></div> : null}

      {step === 0 ? (
        <div className="space-y-4">
          <FormField label="Full name" htmlFor="name">
            <Input
              id="name"
              name="name"
              autoComplete="name"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              required
            />
          </FormField>
          <FormField label="Email" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              required
            />
          </FormField>
          <FormField label="Phone number" htmlFor="phone">
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
              required
            />
          </FormField>
          <FormField label="Password" htmlFor="password" hint="At least 8 characters with a letter and number.">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
              required
            />
          </FormField>
          <FormField label="Confirm password" htmlFor="confirmPassword">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(event) => update("confirmPassword", event.target.value)}
              required
            />
          </FormField>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <FormField label="Gender" htmlFor="gender">
            <Select
              id="gender"
              name="gender"
              value={form.gender}
              onChange={(event) => update("gender", event.target.value)}
              required
            >
              <option value="">Select an option</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </Select>
          </FormField>
          <FormField label="Date of birth" htmlFor="dateOfBirth">
            <Input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              autoComplete="bday"
              value={form.dateOfBirth}
              onChange={(event) => update("dateOfBirth", event.target.value)}
              required
            />
          </FormField>
          <FormField label="Address" htmlFor="address">
            <Textarea
              id="address"
              name="address"
              autoComplete="street-address"
              value={form.address}
              onChange={(event) => update("address", event.target.value)}
              required
            />
          </FormField>
          <FormField label="Occupation" htmlFor="occupation" hint="Optional">
            <Input
              id="occupation"
              name="occupation"
              autoComplete="organization-title"
              value={form.occupation}
              onChange={(event) => update("occupation", event.target.value)}
            />
          </FormField>

          <div>
            <span className="field-label">Profile photo</span>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-brand-200 bg-brand-50">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Selected profile" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-7 w-7 text-brand-400" aria-hidden="true" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50">
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  Choose photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="sr-only"
                    onChange={(event) => onPhoto(event.target.files?.[0] ?? null)}
                  />
                </label>
                {preview ? (
                  <button
                    type="button"
                    onClick={() => onPhoto(null)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-700"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    Remove photo
                  </button>
                ) : (
                  <span className="text-xs text-charcoal/50">Camera or gallery. Compressed automatically.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <FormField
            label="Department preference"
            htmlFor="departmentId"
            hint="This is a request. The membership team will confirm your placement."
          >
            <Select
              id="departmentId"
              name="departmentId"
              value={form.departmentId}
              onChange={(event) => update("departmentId", event.target.value)}
            >
              <option value="">Not yet decided / General Member</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Short introduction" htmlFor="bio" hint="Optional. Tell us a little about yourself.">
            <Textarea
              id="bio"
              name="bio"
              value={form.bio}
              onChange={(event) => update("bio", event.target.value)}
              maxLength={600}
            />
          </FormField>
          <div className="rounded-2xl bg-brand-50 p-4 text-sm leading-6 text-brand-900">
            <p className="font-semibold">Almost done</p>
            <p className="mt-1 text-brand-900/75">
              By registering you agree to be contacted by the membership team about
              your application.
            </p>
          </div>
        </div>
      ) : null}

      <div className={cn("mt-6 flex gap-2", step > 0 ? "justify-between" : "justify-end")}>
        {step > 0 ? (
          <Button
            variant="outline"
            onClick={() => {
              setError(null);
              setStep((current) => Math.max(0, current - 1));
            }}
            disabled={submitting}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </Button>
        ) : null}
        {step < steps.length - 1 ? (
          <Button onClick={next}>
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button onClick={submit} loading={submitting}>
            Create my account
          </Button>
        )}
      </div>

      <p className="mt-5 text-center text-sm text-charcoal/60">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-800 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
