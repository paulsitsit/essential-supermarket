import client from '../api/client';

export async function downloadServerReport(
  type,
  format,
  filters = {}
) {
  const query = new URLSearchParams({
    ...filters,
    format
  });

  const response = await client.get(
    `/exports/${type}?${query.toString()}`,
    {
      responseType: 'blob'
    }
  );

  const extension =
    format === 'xlsx'
      ? 'xlsx'
      : 'pdf';

  const contentType =
    response.headers?.['content-type'] ||
    'application/octet-stream';

  const blob = new Blob(
    [response.data],
    {
      type: contentType
    }
  );

  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');

  link.href = blobUrl;
  link.download = `${type}-report.${extension}`;

  document.body.appendChild(link);

  link.click();

  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 500);
}