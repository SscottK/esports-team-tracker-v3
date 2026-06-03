import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ServerWakeOverlay from '../components/ServerWakeOverlay';
import {
  WAKE_MAX_ATTEMPTS,
  WAKE_POLL_MS,
  isServerUnavailableError,
  pingHealth,
  registerServerWakeHandler,
  sleep,
} from '../api/serverWake';

const ServerWakeContext = createContext(null);

const INITIAL_STATE = {
  active: false,
  progress: 0,
  message: 'Powering up the server',
  detail: 'The API may sleep when idle on Render starter. This usually takes under a minute.',
  failed: false,
};

function estimateProgress(attempt, maxAttempts) {
  if (attempt <= 0) {
    return 8;
  }
  const ratio = attempt / maxAttempts;
  return Math.min(92, 8 + ratio * 84);
}

export function ServerWakeProvider({ children }) {
  const [wakeState, setWakeState] = useState(INITIAL_STATE);
  const wakePromiseRef = useRef(null);

  const finishWakeUp = useCallback(() => {
    setWakeState((current) => ({
      ...current,
      progress: 100,
      failed: false,
    }));
    window.setTimeout(() => {
      setWakeState(INITIAL_STATE);
    }, 450);
  }, []);

  const waitForServer = useCallback(async () => {
    if (wakePromiseRef.current) {
      return wakePromiseRef.current;
    }

    setWakeState({
      active: true,
      progress: 8,
      message: 'Powering up the server',
      detail: 'The API may sleep when idle on Render starter. This usually takes under a minute.',
      failed: false,
    });

    wakePromiseRef.current = (async () => {
      let attempt = 0;

      while (attempt < WAKE_MAX_ATTEMPTS) {
        try {
          const ok = await pingHealth(8000);
          if (ok) {
            finishWakeUp();
            return;
          }
        } catch (error) {
          if (!isServerUnavailableError(error)) {
            setWakeState(INITIAL_STATE);
            throw error;
          }
        }

        attempt += 1;
        setWakeState((current) => ({
          ...current,
          active: true,
          progress: estimateProgress(attempt, WAKE_MAX_ATTEMPTS),
          failed: attempt >= 8,
          message: attempt >= 8 ? 'Server is still starting' : 'Powering up the server',
        }));

        await sleep(WAKE_POLL_MS);
      }

      setWakeState((current) => ({
        ...current,
        active: true,
        progress: 92,
        failed: true,
        message: 'Server is still starting',
      }));
      throw new Error('Server wake timed out.');
    })();

    try {
      await wakePromiseRef.current;
    } finally {
      wakePromiseRef.current = null;
    }
  }, [finishWakeUp]);

  const ensureServerReady = useCallback(async () => {
    try {
      const ok = await pingHealth(4000);
      if (ok) {
        return;
      }
    } catch (error) {
      if (!isServerUnavailableError(error)) {
        throw error;
      }
    }

    await waitForServer();
  }, [waitForServer]);

  useLayoutEffect(() => {
    registerServerWakeHandler(waitForServer);
    return () => registerServerWakeHandler(null);
  }, [waitForServer]);

  useEffect(() => {
    ensureServerReady().catch(() => {});
  }, [ensureServerReady]);

  const value = useMemo(
    () => ({
      waitForServer,
      ensureServerReady,
    }),
    [ensureServerReady, waitForServer],
  );

  return (
    <ServerWakeContext.Provider value={value}>
      {children}
      <ServerWakeOverlay {...wakeState} />
    </ServerWakeContext.Provider>
  );
}

export function useServerWake() {
  const context = useContext(ServerWakeContext);
  if (!context) {
    throw new Error('useServerWake must be used within ServerWakeProvider');
  }
  return context;
}
