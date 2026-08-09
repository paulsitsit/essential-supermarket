import Sequence from '../models/Sequence.js';

export async function generateInternalBarcode() {
  const sequence = await Sequence.findOneAndUpdate(
    { key: 'product_barcode' },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return `ES-${String(sequence.value).padStart(6, '0')}`;
}