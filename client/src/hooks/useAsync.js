import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async loader and tracks `{ data, error, loading }`.
 * Responses from stale calls (deps changed mid-flight) are ignored, which
 * avoids flicker when the user quickly switches dates or filters.
 *
 * @template T
 * @param {() => Promise<T>} loader
 * @param {unknown[]} deps re-run when any of these change
 */
export default function useAsync(loader, deps) {
  const [state, setState] = useState({ data: undefined, error: null, loading: true });
  const callId = useRef(0);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const run = useCallback(loader, deps);

  const reload = useCallback(async () => {
    const id = ++callId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await run();
      if (id === callId.current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (id === callId.current) setState((s) => ({ ...s, error, loading: false }));
    }
  }, [run]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload, setData: (data) => setState((s) => ({ ...s, data })) };
}
