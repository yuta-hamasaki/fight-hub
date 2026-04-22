"use server";

import { revalidatePath } from "next/cache";

import type { Locale } from "@/lib/constants/locales";
import { getPrismaClient } from "@/lib/prisma";
import { requireDbUser } from "@/lib/auth/session";
import type {
  TrainerProfileFormState,
  TrainerProfileFormValues,
} from "@/components/forms/trainer-profile/types";

const MAX_ITEMS = 10;

function toStringValue(formData: FormData, key: keyof TrainerProfileFormValues) {
  return String(formData.get(key) ?? "").trim();
}

function parseList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_ITEMS);
}

function isValidUrl(value: string) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validate(values: TrainerProfileFormValues): TrainerProfileFormState {
  const fieldErrors: TrainerProfileFormState["fieldErrors"] = {};

  if (values.displayName.length < 2 || values.displayName.length > 60) {
    fieldErrors.displayName = "Display name must be between 2 and 60 characters.";
  }

  if (values.displayNameJa.length > 60) {
    fieldErrors.displayNameJa = "Japanese display name must be 60 characters or fewer.";
  }

  if (values.profileImageUrl && !isValidUrl(values.profileImageUrl)) {
    fieldErrors.profileImageUrl = "Profile image URL must start with http:// or https://.";
  }

  if (values.shortBio.length > 160 || values.shortBioJa.length > 160) {
    fieldErrors.shortBio = "Short bio must be 160 characters or fewer for each language.";
  }

  if (values.longBio.length > 3000 || values.longBioJa.length > 3000) {
    fieldErrors.longBio = "Long bio must be 3000 characters or fewer for each language.";
  }

  if (values.categories.length === 0) {
    fieldErrors.categories = "Please add at least one category.";
  }

  if (values.categories.length > MAX_ITEMS) {
    fieldErrors.categories = `You can add up to ${MAX_ITEMS} categories.`;
  }

  if (values.languages.length === 0 || values.languages.length > MAX_ITEMS) {
    fieldErrors.languages = `Add between 1 and ${MAX_ITEMS} languages.`;
  }

  if (values.achievements.length > MAX_ITEMS) {
    fieldErrors.achievements = `You can add up to ${MAX_ITEMS} achievements.`;
  }

  if (values.certifications.length > MAX_ITEMS) {
    fieldErrors.certifications = `You can add up to ${MAX_ITEMS} certifications.`;
  }

  if (values.coachingFormats.length === 0 || values.coachingFormats.length > MAX_ITEMS) {
    fieldErrors.coachingFormats = `Add between 1 and ${MAX_ITEMS} coaching formats.`;
  }

  if (!isValidUrl(values.socialWebsite)) {
    fieldErrors.socialWebsite = "Website URL must start with http:// or https://.";
  }

  if (!isValidUrl(values.socialInstagram)) {
    fieldErrors.socialInstagram = "Instagram URL must start with http:// or https://.";
  }

  if (!isValidUrl(values.socialX)) {
    fieldErrors.socialX = "X URL must start with http:// or https://.";
  }

  if (!isValidUrl(values.socialYoutube)) {
    fieldErrors.socialYoutube = "YouTube URL must start with http:// or https://.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted fields and save again.",
      fieldErrors,
    };
  }

  return {
    status: "success",
    message: "",
    fieldErrors: {},
  };
}

export const INITIAL_TRAINER_PROFILE_STATE: TrainerProfileFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};

export async function saveTrainerProfile(
  locale: Locale,
  _prevState: TrainerProfileFormState,
  formData: FormData,
): Promise<TrainerProfileFormState> {
  const user = await requireDbUser(locale);
  const prisma = getPrismaClient();

  if (user.role !== "TRAINER") {
    return {
      status: "error",
      message: "Only trainers can edit trainer profiles.",
      fieldErrors: {},
    };
  }

  const values: TrainerProfileFormValues = {
    displayName: toStringValue(formData, "displayName"),
    displayNameJa: toStringValue(formData, "displayNameJa"),
    profileImageUrl: toStringValue(formData, "profileImageUrl"),
    shortBio: toStringValue(formData, "shortBio"),
    shortBioJa: toStringValue(formData, "shortBioJa"),
    longBio: toStringValue(formData, "longBio"),
    longBioJa: toStringValue(formData, "longBioJa"),
    categories: parseList(toStringValue(formData, "categories")),
    languages: parseList(toStringValue(formData, "languages")),
    achievements: parseList(toStringValue(formData, "achievements")),
    certifications: parseList(toStringValue(formData, "certifications")),
    coachingFormats: parseList(toStringValue(formData, "coachingFormats")),
    socialWebsite: toStringValue(formData, "socialWebsite"),
    socialInstagram: toStringValue(formData, "socialInstagram"),
    socialX: toStringValue(formData, "socialX"),
    socialYoutube: toStringValue(formData, "socialYoutube"),
  };

  const validation = validate(values);
  if (validation.status === "error") {
    return validation;
  }

  await prisma.$transaction(async (tx) => {
    await tx.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        displayName: values.displayName,
        displayNameJa: values.displayNameJa || null,
        bio: values.shortBio || null,
        bioJa: values.shortBioJa || null,
      },
      update: {
        displayName: values.displayName,
        displayNameJa: values.displayNameJa || null,
        bio: values.shortBio || null,
        bioJa: values.shortBioJa || null,
      },
    });

    const trainerProfile = await tx.trainerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        profileImageUrl: values.profileImageUrl || null,
        shortBio: values.shortBio || null,
        shortBioJa: values.shortBioJa || null,
        longBio: values.longBio || null,
        longBioJa: values.longBioJa || null,
        languages: values.languages,
        achievements: values.achievements,
        certifications: values.certifications,
        coachingFormats: values.coachingFormats,
        socialLinks: {
          website: values.socialWebsite,
          instagram: values.socialInstagram,
          x: values.socialX,
          youtube: values.socialYoutube,
        },
      },
      update: {
        profileImageUrl: values.profileImageUrl || null,
        shortBio: values.shortBio || null,
        shortBioJa: values.shortBioJa || null,
        longBio: values.longBio || null,
        longBioJa: values.longBioJa || null,
        languages: values.languages,
        achievements: values.achievements,
        certifications: values.certifications,
        coachingFormats: values.coachingFormats,
        socialLinks: {
          website: values.socialWebsite,
          instagram: values.socialInstagram,
          x: values.socialX,
          youtube: values.socialYoutube,
        },
      },
      select: { id: true },
    });

    await tx.trainerCategory.deleteMany({ where: { trainerProfileId: trainerProfile.id } });
    if (values.categories.length > 0) {
      await tx.trainerCategory.createMany({
        data: values.categories.map((category) => ({
          trainerProfileId: trainerProfile.id,
          key: category.toLowerCase().replace(/\s+/g, "-"),
          labelEn: category,
          labelJa: category,
        })),
      });
    }
  });

  revalidatePath(`/${locale}/dashboard/trainer`);

  return {
    status: "success",
    message: "Trainer profile saved.",
    fieldErrors: {},
  };
}
