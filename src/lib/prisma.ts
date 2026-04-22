type PrismaClientType = {
  user: {
    upsert: (...args: unknown[]) => Promise<unknown>;
    update: (...args: unknown[]) => Promise<unknown>;
    findUnique: (...args: unknown[]) => Promise<unknown>;
  };
  trainerProfile: {
    findMany: (...args: unknown[]) => Promise<unknown>;
    findFirst: (...args: unknown[]) => Promise<unknown>;
  };
};

const globalForPrisma = globalThis as { prisma?: PrismaClientType };

function createPrismaClient(): PrismaClientType {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = require("@prisma/client");

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}
