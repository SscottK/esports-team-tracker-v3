export const APP_NAME = 'Esports Team Tracker';
export const APP_BETA_VERSION = '0.1.0';
export const APP_BETA_LABEL = `Beta v${APP_BETA_VERSION}`;

export function formatDocumentTitle(pageTitle) {
  if (!pageTitle || pageTitle === APP_NAME) {
    return APP_NAME;
  }
  return `${pageTitle} · ${APP_NAME}`;
}
