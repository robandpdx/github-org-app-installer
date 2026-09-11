import app from '../src/app.js';
import { jest } from '@jest/globals';

test('handles organization.created events by installing configured apps', async () => {
  const request = jest.fn().mockResolvedValue({ data: { id: 1 } });
  const on = jest.fn();
  app({ on }, {
    config: {
      enterprise: 'enterprise',
      targetApps: [{ clientId: 'Iv1.app' }],
      repositorySelection: 'all',
      repositories: [],
    },
    request,
  });

  const [eventName, handler] = on.mock.calls[0];
  expect(eventName).toBe('organization.created');

  const context = {
    payload: { organization: { login: 'new-org' } },
    log: { info: jest.fn(), warn: jest.fn() },
  };

  await handler(context);

  expect(request).toHaveBeenCalledWith('POST /enterprises/{enterprise}/apps/organizations/{org}/installations', {
    enterprise: 'enterprise',
    org: 'new-org',
    client_id: 'Iv1.app',
    repository_selection: 'all',
  });
  expect(context.log.warn).not.toHaveBeenCalled();
});
