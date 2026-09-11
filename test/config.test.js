import { loadConfig, normalizePrivateKey, parseList } from '../src/config.js';

const baseEnv = {
  GITHUB_ENTERPRISE_SLUG: 'octo-enterprise',
  INSTALLER_APP_ID: '123',
  INSTALLER_APP_INSTALLATION_ID: '456',
  INSTALLER_APP_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
  WEBHOOK_SECRET: 'secret',
  TARGET_APP_CLIENT_IDS: 'Iv1.first,Iv1.second',
};

test('loads required configuration and target app client IDs', () => {
  const config = loadConfig(baseEnv);

  expect(config.enterprise).toBe('octo-enterprise');
  expect(config.appId).toBe(123);
  expect(config.installationId).toBe(456);
  expect(config.privateKey).toContain('\nabc\n');
  expect(config.targetApps).toEqual([{ clientId: 'Iv1.first' }, { clientId: 'Iv1.second' }]);
  expect(config.repositorySelection).toBe('all');
});

test('requires repositories for selected repository installations', () => {
  expect(() => loadConfig({ ...baseEnv, REPOSITORY_SELECTION: 'selected' })).toThrow('SELECTED_REPOSITORIES');
});

test('normalizes base64 private keys', () => {
  const pem = '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----';
  expect(normalizePrivateKey(Buffer.from(pem).toString('base64'))).toBe(pem);
});

test('parses comma-separated lists', () => {
  expect(parseList(' one, two ,, three ')).toEqual(['one', 'two', 'three']);
});
