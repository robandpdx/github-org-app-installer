function required(name, env) {
  const value = env[name];
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return String(value).trim();
}

export function normalizePrivateKey(value) {
  const key = String(value).trim();
  if (key.includes('-----BEGIN')) {
    return key.replace(/\\n/g, '\n');
  }

  try {
    const decoded = Buffer.from(key, 'base64').toString('utf8').trim();
    if (decoded.includes('-----BEGIN')) {
      return decoded;
    }
  } catch (_) {
    // Fall through and return the original value.
  }

  return key;
}

export function parseList(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function loadConfig(env = process.env) {
  const repositorySelection = env.REPOSITORY_SELECTION || 'all';
  if (!['all', 'selected', 'none'].includes(repositorySelection)) {
    throw new Error('REPOSITORY_SELECTION must be one of: all, selected, none');
  }

  const repositories = parseList(env.SELECTED_REPOSITORIES);
  if (repositorySelection === 'selected' && repositories.length === 0) {
    throw new Error('SELECTED_REPOSITORIES is required when REPOSITORY_SELECTION is selected');
  }

  return {
    enterprise: required('GITHUB_ENTERPRISE_SLUG', env),
    appId: Number(required('INSTALLER_APP_ID', env)),
    installationId: Number(required('INSTALLER_APP_INSTALLATION_ID', env)),
    privateKey: normalizePrivateKey(required('INSTALLER_APP_PRIVATE_KEY', env)),
    webhookSecret: required('WEBHOOK_SECRET', env),
    apiBaseUrl: env.GITHUB_API_BASE_URL || 'https://api.github.com',
    targetApps: parseList(required('TARGET_APP_CLIENT_IDS', env)).map((clientId) => ({ clientId })),
    repositorySelection,
    repositories,
  };
}
