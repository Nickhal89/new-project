export const DEMO_COMPANY_NAME = 'Demo Hospitality Group';
export const DEMO_JOB_TOKEN = 'demo_waiter_v2';

export function isDemoModeEnabled() {
  return String(process.env.DEMO_MODE ?? '').trim().toLowerCase() === 'true';
}

export function getDemoViewKey() {
  return String(process.env.DEMO_VIEW_KEY ?? '').trim();
}
