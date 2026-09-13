# github-org-app-installer

A Probot app packaged as an AWS SAM application that installs one or more enterprise-owned GitHub Apps when an organization administrator is added.

## What it does

- Receives `organization.member_added` deliveries from a global enterprise webhook.
- Ignores the delivery unless `membership.role` is `admin`. The first administrator added during organization creation acts as the new-organization signal.
- Authenticates as the installer app's enterprise installation.
- Installs the configured organization-level GitHub App client IDs into the new organization by using GitHub's enterprise organization installation APIs.
- Provides a CLI for one-time installation or uninstallation across all installable organizations in the enterprise.

## GitHub App and webhook requirements

Create the two GitHub Apps described in GitHub's [automating app installations guide](https://docs.github.com/en/enterprise-cloud@latest/admin/managing-github-apps-for-your-enterprise/automate-installations):

1. **Installer app** owned by the enterprise:
   - Installed on the enterprise account.
   - Under **Enterprise permissions**, has **Enterprise organization installations: Read and write**.
   - Does not need its GitHub App webhook enabled for this deployment. Apps installed on an enterprise do not receive GitHub App webhook deliveries.
2. **Target organization app** owned by the enterprise:
   - Has whatever organization/repository permissions your automation requires.
   - Its client ID is supplied to this app at deploy time.

Configure a separate **global enterprise webhook** under the enterprise's settings:

- Set the payload URL to the deployed `WebhookUrl` stack output.
- Set the content type to `application/json`.
- Select **Let me select individual events**, then subscribe to **Organization**.
- Set a webhook secret and deploy the same value as `WebhookSecret` when signature verification is required.

The **Organization** event sends the `member_added` action used by this application. Other Organization actions and members whose role is not `admin` are ignored. Global enterprise webhook subscriptions are not controlled by GitHub App permissions.

If an organization-installed GitHub App webhook is used instead, the app needs **Members: Read-only** under **Organization permissions** before it can subscribe to **Organization**. That does not replace the global webhook for this use case because an app installed only on the enterprise cannot receive GitHub App webhooks.

You can supply multiple target app client IDs as a comma-delimited list.

## Deploy with AWS SAM

Install dependencies first:

```sh
npm install
```

Deploy the Lambda function URL with SAM:

```sh
sam build
sam deploy --guided \
  --parameter-overrides \
    GitHubEnterpriseSlug=octo-enterprise \
    InstallerAppId=123456 \
    InstallerAppInstallationId=987654 \
   InstallerAppPrivateKey="$(base64 < installer-app.private-key.pem | tr -d '\n')" \
    TargetAppClientIds=Iv1.targetappclientid \
    RepositorySelection=all
```

Use the `WebhookUrl` stack output as the payload URL for the global enterprise webhook. Webhook signature verification is disabled when `WebhookSecret` is omitted. During `sam deploy --guided`, press Enter at `Parameter WebhookSecret []` to keep it disabled. To enable it, enter the secret and configure the same value on the global enterprise webhook.

### Repository selection

`RepositorySelection` can be:

- `all` - grant the target app access to all repositories.
- `selected` - grant access only to `SelectedRepositories`.
- `none` - install an app that requests no repository permissions.

## Bulk install or uninstall existing organizations

The CLI uses the same configuration names as the Lambda environment. Private keys can be PEM text with escaped newlines or base64-encoded PEM text.

```sh
export GITHUB_ENTERPRISE_SLUG=octo-enterprise
export INSTALLER_APP_ID=123456
export INSTALLER_APP_INSTALLATION_ID=987654
export INSTALLER_APP_PRIVATE_KEY="$(base64 < installer-app.private-key.pem | tr -d '\n')"
export TARGET_APP_CLIENT_IDS=Iv1.targetappclientid,Iv1.anotherapp
export REPOSITORY_SELECTION=all

npm run install-all
npm run uninstall-all
```

To run against a single organization while testing:

```sh
node bin/manage-installations.js install-all --org octo-org
node bin/manage-installations.js uninstall-all --org octo-org
```

## Test

```sh
npm test
```
