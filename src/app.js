import { createInstallerRequest, installAppsOnOrg } from './github.js';
import { loadConfig } from './config.js';

export default function app(appInstance, options = {}) {
  appInstance.on('organization.created', async (context) => {
    const config = options.config || loadConfig();
    const organization = context.payload.organization;
    const org = organization && organization.login;

    if (!org) {
      context.log.warn('Received organization.created webhook without organization.login');
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
