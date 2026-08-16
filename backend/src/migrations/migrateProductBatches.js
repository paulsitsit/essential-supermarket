import 'dotenv/config';

import mongoose from 'mongoose';

import {
  closeDB,
  connectDB,
  getActiveDatabase
} from '../config/db.js';

import Product from '../models/Product.js';
import ProductBatch from '../models/ProductBatch.js';

function createMigrationBatchNumber(product) {
  return `MIGRATED-${product._id.toString().slice(-8).toUpperCase()}`;
}

async function migrate() {
  const target = process.argv[2] || 'atlas';

  if (!['atlas', 'local'].includes(target)) {
    throw new Error(
      'Usage: node src/migrations/migrateProductBatches.js atlas|local'
    );
  }

  await connectDB({ target });

  console.log(
    `Running product batch migration against: ${getActiveDatabase()}`
  );

  const products = await Product.find({
    currentStock: {
      $gt: 0
    }
  }).lean();

  let created = 0;
  let skipped = 0;

  for (const product of products) {
    const existingBatch = await ProductBatch.findOne({
      product: product._id,
      batchNumber: createMigrationBatchNumber(product)
    });

    if (existingBatch) {
      skipped += 1;
      continue;
    }

    const legacyExpirationDate =
      product.expirationDate || null;

    await ProductBatch.create({
      product: product._id,
      barcode: product.barcode,
      expirationDate: legacyExpirationDate,
      quantity: Number(product.currentStock || 0),
      receivedDate:
        product.createdAt || new Date(),
      batchNumber:
        createMigrationBatchNumber(product),
      branch: product.branch || 'Main Branch',
      createdBy: product.createdBy
    });

    created += 1;
  }

  console.log(
    `Migration complete. Created: ${created}, skipped: ${skipped}`
  );

  await mongoose.connection.collection('products').updateMany(
    {},
    {
      $unset: {
        expirationDate: ''
      }
    }
  );

  console.log(
    'Removed legacy expirationDate fields from products collection.'
  );
}

migrate()
  .then(async () => {
    await closeDB();
    process.exit(0);
  })
  .catch(async error => {
    console.error(
      'Batch migration failed:',
      error
    );

    await closeDB();
    process.exit(1);
  });