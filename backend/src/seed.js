import 'dotenv/config';
import mongoose from 'mongoose';
import { closeDB, connectDB } from './config/db.js';
import Account from './models/Account.js';
import Category from './models/Category.js';
import Supplier from './models/Supplier.js';
import Warehouse from './models/Warehouse.js';
import Product from './models/Product.js';

const target = process.argv[2];

if (!['local', 'atlas'].includes(target)) {
  console.error('Choose a seed target: npm run seed:local or npm run seed:atlas');
  process.exit(1);
}

await connectDB({ target });

try {
  await Promise.all([
    Category.deleteMany({}),
    Supplier.deleteMany({}),
    Warehouse.deleteMany({}),
    Product.deleteMany({})
  ]);

  const categories = await Category.insertMany([
    { name: 'Grocery', description: 'Daily grocery products' },
    { name: 'Beverages', description: 'Water, juice, and other beverages' },
    { name: 'Personal Care', description: 'Personal hygiene products' },
    { name: 'Household Items', description: 'General household products' },
    { name: 'Frozen Foods', description: 'Frozen supermarket products' },
    { name: 'Cleaning Supplies', description: 'Cleaning and sanitation items' }
  ]);

  const beverages = categories.find(item => item.name === 'Beverages');
  const grocery = categories.find(item => item.name === 'Grocery');

  const supplier = await Supplier.create({
    name: 'Cebu Wholesale Trading',
    contactPerson: 'Maria Santos',
    phone: '09171234567',
    email: 'orders@cebuwholesale.com',
    address: 'Mandaue City, Cebu'
  });

  await Warehouse.create({
    name: 'Main Branch',
    address: 'Cebu City, Central Visayas'
  });

  let admin = await Account.findOne({
    email: 'Suating@essentialsupermarket.com'
  });

  if (!admin) {
    admin = await Account.create({
      fullName: 'System Administrator',
      email: 'Suating@essentialsupermarket.com',
      passwordHash: await Account.hashPassword('Suating103'),
      role: 'admin',
      branch: 'Main Branch'
    });
  }

  await Product.insertMany([
    {
      name: 'Bottled Water 500ml',
      barcode: 'ES-000001',
      sku: 'BW-500',
      qrCode: 'ES-000001',
      category: beverages._id,
      supplier: supplier._id,
      brand: 'Nature Spring',
      unitType: 'case',
      currentStock: 24,
      reorderLevel: 10,
      costPrice: 180,
      createdBy: admin._id
    },
    {
      name: 'Premium Rice 5kg',
      barcode: 'ES-000002',
      sku: 'RICE-5KG',
      qrCode: 'ES-000002',
      category: grocery._id,
      supplier: supplier._id,
      brand: 'Sinandomeng',
      unitType: 'sack',
      currentStock: 8,
      reorderLevel: 10,
      costPrice: 285,
      createdBy: admin._id
    }
  ]);

  console.log(`Seed complete for ${target}.`);
} finally {
  await closeDB();
}