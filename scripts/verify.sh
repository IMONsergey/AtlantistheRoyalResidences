#!/usr/bin/env bash
set -euo pipefail
export SITE_URL=https://atlantis-imon.vercel.app
npm ci --no-audit --no-fund
npm run build
npm run check
npm run test:api
node scripts/browser-qa.mjs
