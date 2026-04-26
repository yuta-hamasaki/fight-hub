// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PrismaClientType = any;

const globalForPrisma = globalThis as { prisma?: PrismaClientType };

function createPrismaClient(): PrismaClientType {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = require("@prisma/client");

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export function getPrismaClient(): PrismaClientType {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

export const prisma = getPrismaClient();
