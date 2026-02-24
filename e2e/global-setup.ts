/**
 * Playwright global setup — runs once before all E2E tests.
 *
 * Creates a deterministic test user and a 30-day database session directly
 * via Prisma, then saves the session cookie to `playwright/.auth/user.json`
 * so every test can load it with `storageState`.
 *
 * This sidesteps the Google OAuth flow entirely. The test user is isolated
 * from any developer data by using a unique email
 * (playwright-test@e2e.internal) that is cleaned up by global-teardown.ts.
 *
 * Environment requirements:
 *   DATABASE_URL — must point to the database the dev server also uses.
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
// Load .env before anything else so process.env.DATABASE_URL is available.
// Playwright's global setup runs outside of Next.js and doesn't auto-load .env.
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Session cookie name used by NextAuth v5 over plain HTTP (localhost).
const COOKIE_NAME = "authjs.session-token";

export const TEST_USER_EMAIL = "playwright-test@e2e.internal";

function createPrisma() {
  // Use process.env directly — do NOT import ~/env here, because the app's
  // env validator requires AUTH_GOOGLE_SECRET etc. which aren't needed for DB
  // access during test setup.
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "[global-setup] DATABASE_URL is not set. E2E tests require a PostgreSQL database.",
    );
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

async function globalSetup() {
  const prisma = createPrisma();

  try {
    // 1. Upsert the test user so re-runs are idempotent.
    const user = await prisma.user.upsert({
      where: { email: TEST_USER_EMAIL },
      update: {},
      create: {
        email: TEST_USER_EMAIL,
        name: "Playwright Test User",
      },
    });

    // 2. Create a fresh 30-day session.
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        sessionToken: token,
        userId: user.id,
        expires,
      },
    });

    // 3. Write the Playwright storage-state JSON file.
    // Use process.cwd() (the project root) rather than __dirname because
    // Playwright transpiles global-setup to a temp cache directory, making
    // __dirname resolve to the wrong location at runtime.
    const authDir = path.join(process.cwd(), "playwright", ".auth");
    await fs.mkdir(authDir, { recursive: true });

    const storageState = {
      cookies: [
        {
          name: COOKIE_NAME,
          value: token,
          domain: "localhost",
          path: "/",
          expires: Math.floor(expires.getTime() / 1000),
          httpOnly: true,
          secure: false,
          sameSite: "Lax" as const,
        },
      ],
      origins: [],
    };

    await fs.writeFile(
      path.join(authDir, "user.json"),
      JSON.stringify(storageState, null, 2),
    );

    console.log(
      `[global-setup] Test user ready: ${TEST_USER_EMAIL} (id=${user.id})`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

export default globalSetup;
