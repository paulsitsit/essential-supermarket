import crypto from 'crypto';
import Product from '../models/Product.js';

function randomPart() {
  return crypto
    .randomBytes(3)
    .toString('hex')
    .toUpperCase();
}

export async function generateUniqueSku() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const datePart = new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll('-', '');

    const sku = `ES-${datePart}-${randomPart()}`;

    const exists = await Product.exists({
      sku
    });

    if (!exists) {
      return sku;
    }
  }

  throw new Error(
    'Unable to generate a unique SKU'
  );
}