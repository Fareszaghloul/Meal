import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, displayName: true, role: true }
  });
  console.log("Current users in DB:", JSON.stringify(users, null, 2));

  // Find user with email or displayName matching "fares" (case insensitive)
  const faresUser = users.find(
    (u) =>
      u.email.toLowerCase().includes("fares") ||
      u.displayName.toLowerCase().includes("fares")
  );

  if (faresUser) {
    const updated = await prisma.user.update({
      where: { id: faresUser.id },
      data: { role: "admin" }
    });
    console.log(`SUCCESS: Promoted ${updated.email} (${updated.displayName}) to role: admin!`);
  } else {
    console.log("No user matching 'fares' found. List of all users above.");
  }
}

main().finally(() => prisma.$disconnect());
