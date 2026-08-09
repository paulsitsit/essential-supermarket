import client from '../api/client';

export async function downloadServerReport(type, format, filters = {}) {
  const query = new URLSearchParams({ ...filters, format });
  const response = await client.get(`/reports/export/${type}?${query}`, { responseType: 'blob' });
  const extension = format === 'xlsx' ? 'xlsx' : format;
  const blobUrl = URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a'); link.href = blobUrl; link.download = `${type}-report.${extension}`; link.click(); URL.revokeObjectURL(blobUrl);
}