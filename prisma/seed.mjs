import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const DUMMY_TRAINER_CLERK_ID = "dummy_trainer_kenji_sato";

async function main() {
  const trainer = await prisma.user.upsert({
    where: { clerkUserId: DUMMY_TRAINER_CLERK_ID },
    update: {
      email: "kenji.sato@example.com",
      role: "TRAINER",
      isActive: true,
    },
    create: {
      clerkUserId: DUMMY_TRAINER_CLERK_ID,
      email: "kenji.sato@example.com",
      role: "TRAINER",
    },
  });

  await prisma.profile.upsert({
    where: { userId: trainer.id },
    update: {
      displayName: "Kenji Sato",
      displayNameJa: "佐藤 健司",
      bio: "Kickboxing coach focused on practical technique, fitness, and confidence for every level.",
      bioJa: "初心者から経験者まで、実践的な技術・体力・自信を育てるキックボクシングコーチです。",
      locale: "ja",
      timezone: "Asia/Tokyo",
    },
    create: {
      userId: trainer.id,
      displayName: "Kenji Sato",
      displayNameJa: "佐藤 健司",
      bio: "Kickboxing coach focused on practical technique, fitness, and confidence for every level.",
      bioJa: "初心者から経験者まで、実践的な技術・体力・自信を育てるキックボクシングコーチです。",
      locale: "ja",
      timezone: "Asia/Tokyo",
    },
  });

  const trainerProfile = await prisma.trainerProfile.upsert({
    where: { userId: trainer.id },
    update: {
      headline: "Build strong fundamentals and fight with confidence",
      headlineJa: "基礎から磨き、自信を持って戦える身体へ",
      shortBio: "Former professional kickboxer with 10 years of coaching experience.",
      shortBioJa: "元プロキックボクサー。指導歴10年。",
      longBio: "I offer safe, goal-oriented coaching built around technique, conditioning, and sustainable progress.",
      longBioJa: "技術、フィジカル、継続できる成長を大切に、一人ひとりの目標に合わせて安全に指導します。",
      languages: ["ja", "en"],
      achievements: ["Former professional kickboxer", "Over 500 coaching sessions"],
      certifications: ["JATI-ATI"],
      coachingFormats: ["online", "in_person"],
      socialLinks: { instagram: "https://www.instagram.com/example" },
      experienceYears: 10,
      hourlyRate: 8000,
      currency: "JPY",
      isPublished: true,
    },
    create: {
      userId: trainer.id,
      headline: "Build strong fundamentals and fight with confidence",
      headlineJa: "基礎から磨き、自信を持って戦える身体へ",
      shortBio: "Former professional kickboxer with 10 years of coaching experience.",
      shortBioJa: "元プロキックボクサー。指導歴10年。",
      longBio: "I offer safe, goal-oriented coaching built around technique, conditioning, and sustainable progress.",
      longBioJa: "技術、フィジカル、継続できる成長を大切に、一人ひとりの目標に合わせて安全に指導します。",
      languages: ["ja", "en"],
      achievements: ["Former professional kickboxer", "Over 500 coaching sessions"],
      certifications: ["JATI-ATI"],
      coachingFormats: ["online", "in_person"],
      socialLinks: { instagram: "https://www.instagram.com/example" },
      experienceYears: 10,
      hourlyRate: 8000,
      currency: "JPY",
      isPublished: true,
    },
  });

  await prisma.trainerCategory.upsert({
    where: {
      trainerProfileId_key: {
        trainerProfileId: trainerProfile.id,
        key: "kickboxing",
      },
    },
    update: { labelEn: "Kickboxing", labelJa: "キックボクシング" },
    create: {
      trainerProfileId: trainerProfile.id,
      key: "kickboxing",
      labelEn: "Kickboxing",
      labelJa: "キックボクシング",
    },
  });

  console.log(`Seeded dummy trainer: ${trainerProfile.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
