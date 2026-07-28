import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding CampusCopier database...');

  // 1. Seed Admins
  const admin1Password = process.env.ADMIN1_PASSWORD || 'BarathwajPassword123!';
  const admin2Password = process.env.ADMIN2_PASSWORD || 'ThamizaruviPassword123!';

  const hash1 = await bcrypt.hash(admin1Password, 10);
  const hash2 = await bcrypt.hash(admin2Password, 10);

  await prisma.admin.upsert({
    where: { username: 'barathwaj' },
    update: { passwordHash: hash1, displayName: 'Barathwaj' },
    create: {
      username: 'barathwaj',
      displayName: 'Barathwaj',
      passwordHash: hash1,
    },
  });

  await prisma.admin.upsert({
    where: { username: 'thamizaruvi' },
    update: { passwordHash: hash2, displayName: 'Thamizaruvi' },
    create: {
      username: 'thamizaruvi',
      displayName: 'Thamizaruvi',
      passwordHash: hash2,
    },
  });

  console.log('Admins Barathwaj and Thamizaruvi seeded.');

  // 2. Seed Initial Service Prices (in Paise)
  const initialServices = [
    {
      serviceKey: 'bw_single',
      name: 'B&W Single Side',
      unit: 'per page',
      pricePaise: 100, // ₹1.00
    },
    {
      serviceKey: 'bw_double',
      name: 'B&W Double Side',
      unit: 'per physical sheet',
      pricePaise: 150, // ₹1.50
    },
    {
      serviceKey: 'bw_4up',
      name: 'B&W 4-Up Duplex',
      unit: 'per physical sheet',
      pricePaise: 200, // ₹2.00
    },
    {
      serviceKey: 'color_single',
      name: 'Color Single Side',
      unit: 'per page',
      pricePaise: 1000, // ₹10.00
    },
    {
      serviceKey: 'soft_binding',
      name: 'Soft Binding',
      unit: 'per print item',
      pricePaise: 3000, // ₹30.00
    },
    {
      serviceKey: 'spiral_binding',
      name: 'Spiral Binding',
      unit: 'per print item',
      pricePaise: 3000, // ₹30.00
    },
  ];

  for (const service of initialServices) {
    await prisma.servicePrice.upsert({
      where: { serviceKey: service.serviceKey },
      update: {
        name: service.name,
        unit: service.unit,
      },
      create: {
        serviceKey: service.serviceKey,
        name: service.name,
        unit: service.unit,
        pricePaise: service.pricePaise,
        isEnabled: true,
      },
    });
  }

  console.log('Initial service prices seeded.');

  // 3. Seed Default Settings
  const settings = [
    { key: 'accepting_orders', value: 'true' },
    { key: 'upi_id', value: process.env.DEFAULT_UPI_ID || 'barathwaj@upi' },
    {
      key: 'pickup_instructions',
      value: 'CampusCopier Desk, Main Student Center (9 AM - 6 PM)',
    },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: { key: setting.key, value: setting.value },
    });
  }

  console.log('Default settings seeded successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
