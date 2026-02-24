/**
 * Playwright global teardown — runs once after all E2E tests.
 *
 * Deletes the test user created by global-setup.ts. Because of Prisma's
 * cascade rules (User → Base, Session, Account), this removes all bases,
 * tables, rows, and sessions created during the test run in one step.
 */

import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { TEST_USER_EMAIL } from "./global-setup";

async function globalTeardown() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const deleted = await prisma.user.deleteMany({
      where: { email: TEST_USER_EMAIL },
    });
    console.log(
      `[global-teardown] Removed ${deleted.count} test user(s) (${TEST_USER_EMAIL})`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

export default globalTeardown;
