"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchWithTimeout } from "@/lib/client-fetch";

export function MessageMemberButton({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithTimeout("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const result = (await response.json()) as {
        conversationId?: string;
        error?: string;
      };
      if (!response.ok || !result.conversationId) {
        throw new Error(result.error ?? "Could not start chat.");
      }
      router.push(`/member/chat?c=${result.conversationId}`);
    } catch (startError) {
      setError(
        startError instanceof Error ? startError.message : "Could not start chat.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        loading={loading}
        onClick={() => void start()}
        aria-label={`Message ${name}`}
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        Message
      </Button>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
