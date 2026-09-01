export function getErrorMessage(
  error,
  fallback = 'Something went wrong. Please try again.'
) {
  const responseData = error?.response?.data;

  // Backend may respond with plain text.
  if (
    typeof responseData === 'string' &&
    responseData.trim()
  ) {
    return responseData.trim();
  }

  // Your return/quarantine controllers use { error: '...' }.
  if (
    typeof responseData?.error === 'string' &&
    responseData.error.trim()
  ) {
    return responseData.error.trim();
  }

  // Other existing controllers may use { message: '...' }.
  if (
    typeof responseData?.message === 'string' &&
    responseData.message.trim()
  ) {
    return responseData.message.trim();
  }

  // Supports validation responses like:
  // { errors: [{ message: '...' }] }
  if (
    Array.isArray(responseData?.errors) &&
    responseData.errors.length
  ) {
    const messages = responseData.errors
      .map(item => {
        if (typeof item === 'string') return item;
        return item?.message || item?.msg || '';
      })
      .filter(Boolean);

    if (messages.length) {
      return messages.join(', ');
    }
  }

  // Use Axios/client message only if no backend response exists.
  if (
    typeof error?.message === 'string' &&
    error.message.trim() &&
    !error.message.toLowerCase().includes('network error')
  ) {
    return error.message.trim();
  }

  return fallback;
}