export const USER_ROLES = {
  CLIENT: "CLIENT",
  TRAINER: "TRAINER",
} as const;

export type AppUserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
