import { createInstallerRequest, installAppsOnOrg } from './github.js';
import { loadConfig } from './config.js';

export default function app(appInstance, options = {}) {
  appInstance.on('organization.member_added', async (context) => {
    if (context.payload.membership?.role !== 'admin') {
      return;
    }

    const config = options.config || loadConfig();
    const organization = context.payload.organization;
    const org = organization && organization.login;

    if (!org) {
      context.log.warn('Received organization.member_added webhook without organization.login');
      return;
    }

    const request = options.request || createInstallerRequest(config);
    await installAppsOnOrg({
      request,
      enterprise: config.enterprise,
      org,
      targetApps: config.targetApps,
      repositorySelection: config.repositorySelection,
      repositories: config.repositories,
      log: context.log,
    });
  });
}
