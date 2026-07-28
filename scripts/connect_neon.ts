import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to Neon PostgreSQL to wake up compute endpoint...');
  for (let i = 1; i <= 8; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('✓ Neon PostgreSQL database connected successfully!');
      process.exit(0);
    } catch (err: any) {
      console.log(`Attempt ${i}/8: ${err.message?.split('\n')[0]}. Retrying in 2 seconds...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  process.exit(1);
}
main();
