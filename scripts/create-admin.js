/**
 * scripts/create-admin.js
 * Creates a default admin user if no users exist in the database.
 * Runs at container startup, before the Next.js server.
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

async function main() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.user.count();
    if (count > 0) {
      console.log(`>>> ${count} usuário(s) encontrado(s) — pulando criação do admin.`);
      return;
    }

    const password = process.env.ADMIN_PASSWORD || "admin123";
    const email = process.env.ADMIN_EMAIL || "admin@fazenda.com";
    const name = process.env.ADMIN_NAME || "Administrador";

    const hash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { name, email, password: hash, role: "ADMIN" },
    });

    console.log(`>>> Admin criado: ${email} (TROQUE A SENHA APÓS O PRIMEIRO LOGIN)`);
  } catch (err) {
    console.error(">>> Erro ao verificar/criar admin:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
