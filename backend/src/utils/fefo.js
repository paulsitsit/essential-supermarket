/**
 * Select batches to fulfill a given quantity using FEFO:
 * - Only batches with quantity > 0
 * - Sort by expirationDate ascending (nulls last)
 * - Then by receivedDate ascending as tie-breaker
 *
 * Returns an array of { batch, take } where take <= batch.quantity
 * and sum(take) === requestedQty (or less if not enough stock).
 */
export function selectBatchesFefo(batches, requestedQty) {
  const available = batches
    .filter(b => b.quantity > 0)
    .sort((a, b) => {
      const expA = a.expirationDate ? new Date(a.expirationDate).getTime() : null;
      const expB = b.expirationDate ? new Date(b.expirationDate).getTime() : null;

      // Both have expiry: compare by date
      if (expA && expB) {
        if (expA !== expB) return expA - expB;
      } else if (expA && !expB) {
        return -1; // A has expiry, B doesn't -> A first
      } else if (!expA && expB) {
        return 1;  // B has expiry, A doesn't -> B first
      }

      // Tie-breaker: receivedDate
      const recA = a.receivedDate ? new Date(a.receivedDate).getTime() : 0;
      const recB = b.receivedDate ? new Date(b.receivedDate).getTime() : 0;
      return recA - recB;
    });

  const result = [];
  let remaining = requestedQty;

  for (const batch of available) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    if (take > 0) {
      result.push({ batch, take });
      remaining -= take;
    }
  }

  return result;
}