const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const saveToken = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function createStateSaver({ storeKey, getState, storage, onSaved, onFailed, onConflict, onError }) {
  let queue = Promise.resolve();

  const persist = async () => {
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const snapshot = getState();
        if (!snapshot || typeof snapshot !== 'object') throw new Error('STATE_UNAVAILABLE');
        const knownToken = snapshot.x10Meta?.saveToken || '';
        const rawStored = await storage.getItem(storeKey);
        let storedToken = '';
        if (rawStored) {
          try {
            storedToken = JSON.parse(rawStored)?.x10Meta?.saveToken || '';
          } catch {
            storedToken = '';
          }
        }
        if (knownToken && storedToken && knownToken !== storedToken) {
          onConflict?.({ knownToken, storedToken });
          return false;
        }
        const nextToken = saveToken();
        snapshot.x10Meta = { ...(snapshot.x10Meta || {}), saveToken: nextToken, persistedAt: new Date().toISOString() };
        await storage.setItem(storeKey, JSON.stringify(snapshot));
        onSaved?.({ token: nextToken });
        return true;
      } catch (error) {
        lastError = error;
        if (attempt < 2) await wait(180 * (attempt + 1));
      }
    }
    onFailed?.(lastError);
    onError?.(lastError);
    return false;
  };

  return async function saveState() {
    const next = queue.then(persist, persist);
    queue = next.catch(() => false);
    return next;
  };
}
