import {
  installAppOnOrg,
  installAppsInEnterprise,
  uninstallAppsInEnterprise,
} from '../src/github.js';
import { jest } from '@jest/globals';

test('installs a target app on an enterprise organization', async () => {
  const request = jest.fn().mockResolvedValue({ data: { id: 99 } });

  await expect(installAppOnOrg({
    request,
    enterprise: 'octo-enterprise',
    org: 'octo-org',
    targetApp: { clientId: 'Iv1.app' },
    repositorySelection: 'all',
    repositories: [],
  })).resolves.toEqual({ id: 99 });

  expect(request).toHaveBeenCalledWith('POST /enterprises/{enterprise}/apps/organizations/{org}/installations', {
    enterprise: 'octo-enterprise',
    org: 'octo-org',
    client_id: 'Iv1.app',
    repository_selection: 'all',
  });
});

test('installs configured apps across installable enterprise organizations', async () => {
  const request = jest.fn()
    .mockResolvedValueOnce({ data: [{ login: 'org-a' }, { login: 'org-b' }] })
    .mockResolvedValueOnce({ data: { id: 1 } })
    .mockResolvedValueOnce({ data: { id: 2 } });

  const results = await installAppsInEnterprise({
    request,
    config: {
      enterprise: 'enterprise',
      targetApps: [{ clientId: 'Iv1.app' }],
      repositorySelection: 'none',
      repositories: [],
    },
    log: { info: jest.fn() },
  });

  expect(results).toEqual([
    { org: 'org-a', installations: [{ id: 1 }] },
    { org: 'org-b', installations: [{ id: 2 }] },
  ]);
});

test('uninstalls matching target app installations only', async () => {
  const request = jest.fn()
    .mockResolvedValueOnce({ data: [{ login: 'org-a' }] })
    .mockResolvedValueOnce({ data: [
      { id: 10, client_id: 'Iv1.keep' },
      { id: 11, client_id: 'Iv1.remove' },
    ] })
    .mockResolvedValueOnce({ data: undefined });

  const results = await uninstallAppsInEnterprise({
    request,
    config: {
      enterprise: 'enterprise',
      targetApps: [{ clientId: 'Iv1.remove' }],
    },
    log: { info: jest.fn() },
  });

  expect(results).toEqual([{ org: 'org-a', uninstalled: [11] }]);
  expect(request).toHaveBeenLastCalledWith(
    'DELETE /enterprises/{enterprise}/apps/organizations/{org}/installations/{installation_id}',
    { enterprise: 'enterprise', org: 'org-a', installation_id: 11 },
  );
});
