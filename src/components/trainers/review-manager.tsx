"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ReviewActionState = { status: "idle" | "success" | "error"; message: string };

type ReviewManagerProps = {
  action: (state: ReviewActionState, formData: FormData) => Promise<ReviewActionState>;
  existingReview?: { id: string; rating: number; title: string; comment: string };
  copy: { title: string; description: string; rating: string; reviewTitle: string; comment: string; create: string; update: string; delete: string };
};

const initialState: ReviewActionState = { status: "idle", message: "" };

export function ReviewManager({ action, existingReview, copy }: ReviewManagerProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
      <div>
        <h3 className="font-semibold">{copy.title}</h3>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
      </div>
      <form action={formAction} className="grid gap-3">
        <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
          <div className="space-y-1">
            <Label htmlFor="review-rating">{copy.rating}</Label>
            <select id="review-rating" name="rating" defaultValue={existingReview?.rating ?? 5} className="h-9 w-full rounded-md border bg-background px-3 text-sm" required>
              {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} ★</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="review-title">{copy.reviewTitle}</Label>
            <Input id="review-title" name="title" defaultValue={existingReview?.title} maxLength={100} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="review-comment">{copy.comment}</Label>
          <Textarea id="review-comment" name="comment" defaultValue={existingReview?.comment} maxLength={1000} required />
        </div>
        {state.message ? <p role="status" className={`text-sm ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{state.message}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" name="intent" value="save" disabled={pending}>{existingReview ? copy.update : copy.create}</Button>
          {existingReview ? (
            <Button type="submit" name="intent" value="delete" variant="outline" disabled={pending} formNoValidate>{copy.delete}</Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
