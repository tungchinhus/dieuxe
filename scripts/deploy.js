/* eslint-disable no-console */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function readFirebaseConfig() {
  const firebaseJsonPath = path.resolve(__dirname, '..', 'firebase.json');
  if (!fs.existsSync(firebaseJsonPath)) {
    throw new Error('firebase.json not found');
  }
  const content = fs.readFileSync(firebaseJsonPath, 'utf8');
  return JSON.parse(content);
}

function resolveHostingSite(config) {
  if (process.env.SITE && process.env.SITE.trim()) {
    return process.env.SITE.trim();
  }

  const hosting = config.hosting;
  if (!hosting) throw new Error('Missing hosting config in firebase.json');

  // hosting can be an object or an array (for multiple sites)
  if (Array.isArray(hosting)) {
    const entryWithSite = hosting.find((h) => typeof h.site === 'string' && h.site.trim());
    if (entryWithSite) return entryWithSite.site.trim();
    throw new Error('No hosting entry with a valid "site" found in firebase.json');
  }

  if (typeof hosting.site === 'string' && hosting.site.trim()) {
    return hosting.site.trim();
  }

  throw new Error('hosting.site is missing or invalid in firebase.json');
}

function deploy() {
  const cfg = readFirebaseConfig();
  const site = resolveHostingSite(cfg);
  console.log(`Deploying to Firebase Hosting site: ${site}`);

  const cmd = `npx --yes firebase deploy --only "hosting:${site}" --non-interactive`;
  execSync(cmd, { stdio: 'inherit', shell: true });
}

try {
  deploy();
} catch (err) {
  console.error('Deployment failed:', err.message || err);
  process.exit(1);
}


