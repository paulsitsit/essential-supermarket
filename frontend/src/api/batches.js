import client from './client.js';

export async function updateBatch(id, updates) {
  // updates: { expirationDate?: string, notes?: string }
  const response = await client.patch(`/batches/${id}`, updates);
  return response.data;
}

export async function getBatch(id) {
  const response = await client.get(`/batches/${id}`);
  return response.data;
}