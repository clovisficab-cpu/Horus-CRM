// Dados de demonstração para desenvolvimento local. Execute com: npm run db:seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedDemo } from "../src/lib/demo-data";

const prisma = new PrismaClient();

async function main() {
  if ((await prisma.user.count()) > 0) {
    console.log("Banco já possui dados — seed ignorado. Use `npm run db:reset` para recriar.");
    return;
  }
  await seedDemo(prisma, {
    admin: { name: "Administrador Horus", email: "admin@horus.com.br", passwordHash: bcrypt.hashSync("horus123", 10) },
    staffPasswordHash: bcrypt.hashSync("horus123", 10),
    clientPasswordHash: bcrypt.hashSync("cliente123", 10),
  });
  console.log("Seed concluído.");
  console.log("Equipe:  admin@horus.com.br / horus123");
  console.log("Cliente: cliente@horus.com.br / cliente123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
