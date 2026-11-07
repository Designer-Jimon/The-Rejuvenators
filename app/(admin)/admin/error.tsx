"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="surface mx-auto max-w-xl p-6 text-center sm:p-8">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="mt-4 font-serif text-2xl font-bold">
        This admin page could not load
      </h1>
      <p className="mt-2 text-sm leading-6 text-charcoal/60">
        The action may have timed out or a record may be unavailable. Try again,
        or return to the overview.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-charcoal/40">Reference: {error.digest}</p>
      ) : null}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
        <Link href="/admin">
          <Button variant="outline">Back to overview</Button>
        </Link>
      </div>
    </div>
  );
}
