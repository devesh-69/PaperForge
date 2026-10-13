import { useState, useEffect } from 'react';

export function useStorageEstimate() {
  const [usagePct, setUsagePct] = useState<number>(0);
  const [isStorageLow, setIsStorageLow] = useState<boolean>(false);

  useEffect(() => {
    // Ask the browser not to evict our data under storage pressure (best effort;
    // browsers may decline silently).
    navigator.storage?.persist?.().catch(() => {});

    async function checkStorage() {
      if (navigator.storage && navigator.storage.estimate) {
        try {
          const estimate = await navigator.storage.estimate();
          if (estimate.usage !== undefined && estimate.quota !== undefined && estimate.quota > 0) {
            const pct = (estimate.usage / estimate.quota) * 100;
            setUsagePct(pct);
            // Warn above 80% of quota; clear the warning once space is freed
            setIsStorageLow(pct > 80);
          }
        } catch (e) {
          console.error('Storage estimate error:', e);
        }
      }
    }

    checkStorage();
    // Re-check every 2 minutes
    const interval = setInterval(checkStorage, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { usagePct, isStorageLow };
}
