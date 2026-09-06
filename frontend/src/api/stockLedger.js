import client from './client';

export async function getBatchLedger(batchId, params = {}) {
  const response = await client.get(
    `/stock-ledger/batches/${batchId}/ledger`,
    { params }
  );

  return response.data?.data || response.data;
}

export async function getBatchVariance(batchId) {
  const response = await client.get(
    `/stock-ledger/batches/${batchId}/variance`
  );

  return response.data?.data || response.data;
}