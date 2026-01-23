const { execSync } = require("child_process");
const { existsSync } = require("fs");
const path = require("path");

const prismaCliPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "prisma",
  "build",
  "index.js"
);

if (!existsSync(prismaCliPath)) {
  console.log("Prisma CLI not found; skipping prisma generate.");
  process.exit(0);
}

execSync(`node "${prismaCliPath}" generate`, { stdio: "inherit" });
