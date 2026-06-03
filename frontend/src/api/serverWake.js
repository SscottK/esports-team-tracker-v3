import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const HEALTH_URL = `${API_URL}/api/health/`;

export const WAKE_POLL_MS = 2500;
export const WAKE_MAX_ATTEMPTS = 48;

export function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function isServerUnavailableError(error) {
  if (!error) {
    return false;
  }
  if (error.code === 'ECONNABORTED') {
    return true;
  }
  if (!error.response) {
    return true;
  }
  const status = error.response.status;
  return status === 502 || status === 503 || status === 504;
}

export async function pingHealth(timeoutMs = 5000) {
  const response = await axios.get(HEALTH_URL, { timeout: timeoutMs });
  return response.data?.status === 'ok';
}

let waitForServerHandler = null;

export function registerServerWakeHandler(handler) {
  waitForServerHandler = handler;
}

export async function waitForServerFromApi() {
  if (!waitForServerHandler) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await sleep(100);
      if (waitForServerHandler) {
        break;
      }
    }
  }
  if (!waitForServerHandler) {
    return;
  }
  await waitForServerHandler();
}
