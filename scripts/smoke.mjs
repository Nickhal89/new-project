#!/usr/bin/env node

import { getMissingSmokeEnv, runSmoke } from '../lib/smokeRunner.ts';

const BASE_URL = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const SMOKE_JOB_TOKEN = process.env.SMOKE_JOB_TOKEN;
const SMOKE_JOB_ID = process.env.SMOKE_JOB_ID;
const SMOKE_HR_TOKEN = process.env.SMOKE_HR_TOKEN;
const SMOKE_EMAIL = process.env.SMOKE_EMAIL;

const missing = getMissingSmokeEnv(process.env);
if (missing.length > 0) {
  console.error(`❌ Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const result = await runSmoke({
  baseUrl: BASE_URL,
  jobToken: SMOKE_JOB_TOKEN,
  jobId: SMOKE_JOB_ID,
  hrToken: SMOKE_HR_TOKEN,
  email: SMOKE_EMAIL
});

if (result.output) {
  console.log(result.output);
}

if (!result.ok) {
  process.exit(1);
}
