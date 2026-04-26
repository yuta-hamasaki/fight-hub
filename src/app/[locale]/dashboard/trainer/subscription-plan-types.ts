export type SubscriptionPlanFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const INITIAL_SUBSCRIPTION_PLAN_STATE: SubscriptionPlanFormState = {
  status: "idle",
  message: "",
};
