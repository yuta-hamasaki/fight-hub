export type TrainerProfileFormValues = {
  displayName: string;
  displayNameJa: string;
  profileImageUrl: string;
  shortBio: string;
  shortBioJa: string;
  longBio: string;
  longBioJa: string;
  categories: string[];
  languages: string[];
  achievements: string[];
  certifications: string[];
  coachingFormats: string[];
  socialWebsite: string;
  socialInstagram: string;
  socialX: string;
  socialYoutube: string;
};

export type TrainerProfileFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: Partial<Record<keyof TrainerProfileFormValues, string>>;
};
