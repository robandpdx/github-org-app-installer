# github-org-app-installer

A Probot app packaged as an AWS SAM application that installs one or more enterprise-owned GitHub Apps into organizations when they are created.

## What it does

- Receives `organization.created` webhooks from an enterprise-level installer GitHub App.
- Authenticates as the installer app's enterprise installation.
- Installs the configured organization-level GitHub App client IDs into the new organization by using GitHub's enterprise organization installation APIs.
- Provides a CLI for one-time installation or uninstallation across all installable organizations in the enterprise.

## GitHub App requirements

Create the two GitHub Apps described in GitHub's [automating app installations guide](https://docs.github.com/en/enterprise-cloud@latest/admin/managing-github-apps-for-your-enterprise/automate-installations):

1. **Installer app** owned by the enterprise:
   - Installed on the enterprise account.
   - Has `Enterprise organization installations` read/write permission.
   - Webhooks enabled for the `Organization` event.
2. **Target organization app** owned by the enterprise:
   - Has whatever organization/repository permissions your automation requires.
   - Its client ID is supplied to this app at deploy time.

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
    InstallerAppPrivateKey="$(base64 -w0 installer-app.private-key.pem)" \
    WebhookSecret=your-webhook-secret \
    TargetAppClientIds=Iv1.targetappclientid \
    RepositorySelection=all
```

Use the `WebhookUrl` stack output as the webhook URL for the enterprise-level installer GitHub App. The Lambda handler verifies `X-Hub-Signature-256` before dispatching events to Probot.

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
export INSTALLER_APP_PRIVATE_KEY="$(base64 -w0 installer-app.private-key.pem)"
export WEBHOOK_SECRET=unused-for-cli
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
