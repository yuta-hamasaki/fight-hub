"use client";
import { useEffect } from "react";
export function ProfileViewTracker({ trainerId }: { trainerId: string }) {
  useEffect(() => {
    void fetch("/api/trainer-views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trainerId }),
    }).catch(() => undefined);
  }, [trainerId]);
  return null;
}
