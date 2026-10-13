import { useEffect, useState } from 'react';
import { loadAssets, type AssetUrls } from '../letterhead/assets';

const EMPTY: AssetUrls = new Map();

/** Loads the images for the given ids (async); returns what is available so far. */
export function useAssetUrls(ids: string[]): AssetUrls {
  const key = [...new Set(ids)].sort().join(',');
  const [urls, setUrls] = useState<AssetUrls>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    if (!key) { setUrls(EMPTY); return; }
    loadAssets(key.split(',')).then((m) => { if (!cancelled) setUrls(m); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [key]);

  return urls;
}
