#!/usr/bin/env node
import { loadConfig } from '../src/config.js';
import { createInstallerRequest, installAppsInEnterprise, uninstallAppsInEnterprise } from '../src/github.js';

function parseArgs(argv) {
  const args = { command: argv[2], org: undefined };

  for (let index = 3; index < argv.length; index += 1) {
    if (argv[index] === '--org') {
      args.org = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argv[index]}`);
    }
  }

  return args;
}

function printUsage() {
  console.error('Usage: node bin/manage-installations.js <install-all|uninstall-all> [--org ORG_LOGIN]');
}

async function main() {
  const { command, org } = parseArgs(process.argv);
  if (!['install-all', 'uninstall-all'].includes(command)) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const config = loadConfig();
  const request = createInstallerRequest(config);
  const operation = command === 'install-all' ? installAppsInEnterprise : uninstallAppsInEnterprise;
  const results = await operation({ request, config, org });
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
