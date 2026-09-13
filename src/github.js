import { createAppAuth } from '@octokit/auth-app';
import { request as defaultRequest } from '@octokit/request';

const PER_PAGE = 100;

export function createInstallerRequest(config) {
  const request = defaultRequest.defaults({
    baseUrl: config.apiBaseUrl,
    headers: {
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'github-org-app-installer',
    },
  });

  const auth = createAppAuth({
    appId: config.appId,
    privateKey: config.privateKey,
    installationId: config.installationId,
    request,
  });

  return async (route, parameters = {}) => {
    const { token } = await auth({ type: 'installation' });
    return request(route, {
      ...parameters,
      headers: {
        ...parameters.headers,
        authorization: 'token ' + token,
      },
    });
  };
}

async function paginateArray(request, route, parameters) {
  const items = [];
  let page = 1;

  while (true) {
    const response = await request(route, { ...parameters, per_page: PER_PAGE, page });
    const pageItems = Array.isArray(response.data) ? response.data : [];
    items.push(...pageItems);

    if (pageItems.length < PER_PAGE) {
      return items;
    }

    page += 1;
  }
}

export async function listInstallableOrganizations({ request, enterprise }) {
  return paginateArray(request, 'GET /enterprises/{enterprise}/apps/installable_organizations', {
    enterprise,
  });
}

export async function listOrgInstallations({ request, enterprise, org }) {
  return paginateArray(request, 'GET /enterprises/{enterprise}/apps/organizations/{org}/installations', {
    enterprise,
    org,
  });
}

export async function installAppOnOrg({ request, enterprise, org, targetApp, repositorySelection, repositories }) {
  const body = {
    enterprise,
    org,
    client_id: targetApp.clientId,
    repository_selection: repositorySelection,
  };

  if (repositorySelection === 'selected') {
    body.repositories = repositories;
  }

  const response = await request('POST /enterprises/{enterprise}/apps/organizations/{org}/installations', body);
  return response.data;
}

export async function uninstallAppFromOrg({ request, enterprise, org, installationId }) {
  await request('DELETE /enterprises/{enterprise}/apps/organizations/{org}/installations/{installation_id}', {
    enterprise,
    org,
    installation_id: installationId,
  });
}

export async function installAppsOnOrg({ request, enterprise, org, targetApps, repositorySelection, repositories, log = console }) {
  const installations = [];

  for (const targetApp of targetApps) {
    log.info({ org, clientId: targetApp.clientId }, 'Installing GitHub App on organization');
    const installation = await installAppOnOrg({
      request,
      enterprise,
      org,
      targetApp,
      repositorySelection,
      repositories,
    });
    installations.push(installation);
  }

  return installations;
}

export async function installAppsInEnterprise({ request, config, org, log = console }) {
  const organizations = org ? [{ login: org }] : await listInstallableOrganizations({ request, enterprise: config.enterprise });
  const results = [];

  for (const organization of organizations) {
    const login = organization.login;
    const installations = await installAppsOnOrg({
      request,
      enterprise: config.enterprise,
      org: login,
      targetApps: config.targetApps,
      repositorySelection: config.repositorySelection,
      repositories: config.repositories,
      log,
    });
    results.push({ org: login, installations });
  }

  return results;
}

export async function uninstallAppsInEnterprise({ request, config, org, log = console }) {
  const organizations = org ? [{ login: org }] : await listInstallableOrganizations({ request, enterprise: config.enterprise });
  const targetClientIds = new Set(config.targetApps.map((app) => app.clientId));
  const results = [];

  for (const organization of organizations) {
    const login = organization.login;
    const installations = await listOrgInstallations({ request, enterprise: config.enterprise, org: login });
    const matchingInstallations = installations.filter((installation) => targetClientIds.has(installation.client_id));

    for (const installation of matchingInstallations) {
      log.info({ org: login, clientId: installation.client_id, installationId: installation.id }, 'Uninstalling GitHub App from organization');
      await uninstallAppFromOrg({
        request,
        enterprise: config.enterprise,
        org: login,
        installationId: installation.id,
      });
    }

    results.push({ org: login, uninstalled: matchingInstallations.map((installation) => installation.id) });
  }

  return results;
}
