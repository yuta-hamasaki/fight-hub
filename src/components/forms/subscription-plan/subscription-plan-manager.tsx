"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/lib/constants/locales";
import type { SubscriptionPlanFormState } from "@/app/[locale]/dashboard/trainer/subscription-plan-types";

type Props = {
  locale: Locale;
  copy: {
    title: string;
    description: string;
    save: string;
    createNew: string;
    active: string;
    inactive: string;
    nameEn: string;
    nameJa: string;
    price: string;
    descriptionEn: string;
    descriptionJa: string;
    publish: string;
    planList: string;
  };
  plans: Array<{ id: string; nameEn: string; nameJa: string | null; descriptionEn: string | null; descriptionJa: string | null; priceMonthly: { toString(): string }; isActive: boolean }>;
  initialState: SubscriptionPlanFormState;
  action: (state: SubscriptionPlanFormState, formData: FormData) => Promise<SubscriptionPlanFormState>;
  onToggle: (planId: string, isActive: boolean) => Promise<void>;
};

export function SubscriptionPlanManager({ locale, copy, plans, initialState, action, onToggle }: Props) {
  const [selectedId, setSelectedId] = useState<string>(plans[0]?.id ?? "");
  const [state, formAction, isPending] = useActionState(action, initialState);

  const selectedPlan = plans.find((plan) => plan.id === selectedId) ?? null;

  return (
    <section className="space-y-4 rounded-lg border border-border p-4">
      <div>
        <h3 className="font-medium">{copy.title}</h3>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant={!selectedPlan ? "default" : "outline"} size="sm" onClick={() => setSelectedId("")}>
          {copy.createNew}
        </Button>
        {plans.map((plan) => (
          <Button
            key={plan.id}
            type="button"
            variant={selectedId === plan.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedId(plan.id)}
          >
            {(locale === "ja" ? plan.nameJa : plan.nameEn) || plan.nameEn} · {plan.isActive ? copy.active : copy.inactive}
          </Button>
        ))}
      </div>

      <form action={formAction} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="planId" value={selectedPlan?.id ?? ""} />

        <div className="space-y-2">
          <Label htmlFor="nameEn">{copy.nameEn}</Label>
          <Input id="nameEn" name="nameEn" defaultValue={selectedPlan?.nameEn ?? ""} required maxLength={80} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nameJa">{copy.nameJa}</Label>
          <Input id="nameJa" name="nameJa" defaultValue={selectedPlan?.nameJa ?? ""} maxLength={80} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priceMonthly">{copy.price}</Label>
          <Input
            id="priceMonthly"
            name="priceMonthly"
            type="number"
            min="1"
            step="0.01"
            required
            defaultValue={selectedPlan?.priceMonthly.toString() ?? ""}
          />
        </div>

        <div className="flex items-end gap-2 pb-1">
          <input id="isActive" name="isActive" type="checkbox" defaultChecked={selectedPlan?.isActive ?? true} />
          <Label htmlFor="isActive">{copy.publish}</Label>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="descriptionEn">{copy.descriptionEn}</Label>
          <Textarea id="descriptionEn" name="descriptionEn" maxLength={500} defaultValue={selectedPlan?.descriptionEn ?? ""} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="descriptionJa">{copy.descriptionJa}</Label>
          <Textarea id="descriptionJa" name="descriptionJa" maxLength={500} defaultValue={selectedPlan?.descriptionJa ?? ""} />
        </div>

        {state.message ? (
          <p className={state.status === "success" ? "text-sm text-green-700 md:col-span-2" : "text-sm text-red-600 md:col-span-2"}>
            {state.message}
          </p>
        ) : null}

        <div className="md:col-span-2">
          <Button type="submit" disabled={isPending}>{isPending ? `${copy.save}...` : copy.save}</Button>
        </div>
      </form>

      {plans.length ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{copy.planList}</p>
          <div className="space-y-2">
            {plans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between rounded border border-border p-2 text-sm">
                <span>{(locale === "ja" ? plan.nameJa : plan.nameEn) || plan.nameEn}</span>
                <form action={onToggle.bind(null, plan.id, !plan.isActive)}>
                  <Button type="submit" size="sm" variant="outline">
                    {plan.isActive ? copy.inactive : copy.active}
                  </Button>
                </form>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
