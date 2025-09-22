import { awscdk, TextFile } from 'projen';
import { GithubCredentials } from 'projen/lib/github';
import { NpmAccess } from 'projen/lib/javascript';

const cdkCliVersion = '2.1029.2';
const minNodeVersion = '20.9.0';
const jsiiVersion = '~5.8.0';
const cdkVersion = '2.85.0'; // Required
const projenVersion = '^0.95.4'; // Does not affect consumers of the library
const minConstructsVersion = '10.0.0'; // Minimum version to support CDK v2
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Jayson Rawlins',
  authorAddress: 'JaysonJ.Rawlins@gmail.com',
  description: 'A CDK construct that helps build IAM policies using the AWS IAM Policy Builder dump. Normally it is better to use cdk-iam-floyd, However, I found that cdk-iam-floyd currently is not jsii compliant so I wasn\'t able to use it in my jsii compliant projects in languages that are not typescript or python.',
  keywords: [
    'aws',
    'cdk',
    'iam-policy',
    'iam-actions',
  ],
  cdkVersion: cdkVersion,
  cdkCliVersion: cdkCliVersion,
  projenVersion: projenVersion,
  projenDevDependency: false,
  defaultReleaseBranch: 'main',
  minNodeVersion: minNodeVersion,
  jsiiVersion: jsiiVersion,
  name: '@jjrawlins/cdk-iam-policy-builder-helper',
  workflowBootstrapSteps: [
    {
      name: 'configure aws credentials',
      uses: 'aws-actions/configure-aws-credentials@v4',
      with: {
        'role-to-assume': '${{ secrets.AWS_GITHUB_OIDC_ROLE }}',
        'role-duration-seconds': 900,
        'aws-region': '${{ secrets.AWS_GITHUB_OIDC_REGION }}',
        'role-skip-session-tagging': true,
        'role-session-name': 'GitHubActions',
      },
    },
  ],
  npmAccess: NpmAccess.PUBLIC,
  projenrcTs: true,
  repositoryUrl: 'https://github.com/JaysonRawlins/cdk-iam-policy-builder-helper.git',
  githubOptions: {
    projenCredentials: GithubCredentials.fromApp({
      appIdSecret: 'PROJEN_APP_ID',
      privateKeySecret: 'PROJEN_APP_PRIVATE_KEY',
    }),
    mergify: false,
    pullRequestLintOptions: {
      semanticTitleOptions: {
        types: [
          'feat',
          'fix',
          'docs',
          'style',
          'refactor',
          'perf',
          'test',
          'chore',
          'revert',
          'ci',
          'build',
          'deps',
          'wip',
          'release',
        ],
      },
    },
  },
  depsUpgrade: true,
  // publishToNuget: { // Broken for some reason
  //   packageId: 'jjrawlins.CdkIamPolicyBuilderHelper',
  //   dotNetNamespace: 'jjrawlins.CdkIamPolicyBuilderHelper',
  // },
  publishToPypi: {
    distName: 'jjrawlins-cdk-iam-policy-builder-helper',
    module: 'jjrawlins_cdk_iam_policy_builder_helper',
  },
  publishToGo: {
    moduleName: 'github.com/jaysonrawlins/cdk-iam-policy-builder-helper',
    packageName: 'cdk-iam-policy-builder-helper',
  },
  peerDeps: [
    'aws-cdk-lib',
  ],
  deps: [
    'projen',
    'constructs',
    '@aws-sdk/client-iam',
    'axios@^1.8.2',
  ],
  devDeps: [
    `aws-cdk@${cdkVersion}`,
    `aws-cdk-lib@${cdkVersion}`,
    `constructs@^${minConstructsVersion}`,
    '@aws-sdk/types',
    '@types/node',
  ],
  bundledDeps: [
    '@aws-sdk/client-iam',
    'axios',
    'jsonc-parser',
  ],
  gitignore: [
    'methods_list.txt',
    '~*.yml',
  ],
  eslint: true,
});


project.preCompileTask.exec([
  'rm src/constructs/ManagedPolicies.ts || true',
  'rm src/constructs/Actions.ts || true',
  'ts-node ./src/bin/download-actions-json.ts',
  'ts-node ./src/bin/download-managed-policies-json.ts',
  'ts-node ./src/bin/create-actions-json.ts',
  'npx projen eslint',
  'if [ -f src/constructs/ManagedPolicies.ts ]; then echo "ManagedPolicies.ts created successfully"; else echo "ManagedPolicies.ts not found"; exit 1; fi',
  'if [ -f src/constructs/Actions.ts ]; then echo "Actions.ts created successfully"; else echo "Actions.ts not found"; exit 1; fi',
].join('\n'));

// Add Yarn resolutions to ensure patched transitive versions
project.package.addField('resolutions', {
  'brace-expansion': '1.1.12',
  'form-data': '^4.0.4',
  '@eslint/plugin-kit': '^0.3.4',
  'eslint-import-resolver-typescript': '^4.4.4',
  'aws-cdk-lib': '>=2.85.0 <3.0.0',
  'constructs': '>=10.0.0 <11.0.0',
});

project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.upgrade.permissions.id-token', 'write');
project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.upgrade.permissions.packages', 'write');
project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.upgrade.permissions.pull-requests', 'write');
project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.upgrade.permissions.contents', 'write');

project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.pr.permissions.id-token', 'write');
project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.pr.permissions.packages', 'write');
project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.pr.permissions.pull-requests', 'write');
project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.pr.permissions.contents', 'write');

/**
 * For the build job, we need to be able to read from packages and also need id-token permissions for OIDC to authenticate to the registry.
 * This is needed to be able to install dependencies from GitHub Packages during the build.
 */
project.github!.tryFindWorkflow('build')!.file!.addOverride('jobs.build.permissions.id-token', 'write');
project.github!.tryFindWorkflow('build')!.file!.addOverride('jobs.build.permissions.packages', 'read');

/**
 * For the package jobs, we need to be able to write to packages and also need id-token permissions for OIDC to authenticate to the registry.
 */
project.github!.tryFindWorkflow('build')!.file!.addOverride('jobs.package-js.permissions.id-token', 'write');
project.github!.tryFindWorkflow('build')!.file!.addOverride('jobs.package-js.permissions.packages', 'write');

project.github!.tryFindWorkflow('build')!.file!.addOverride('jobs.package-python.permissions.packages', 'write');
project.github!.tryFindWorkflow('build')!.file!.addOverride('jobs.package-python.permissions.id-token', 'write');

project.github!.tryFindWorkflow('build')!.file!.addOverride('jobs.package-go.permissions.packages', 'write');
project.github!.tryFindWorkflow('build')!.file!.addOverride('jobs.package-go.permissions.id-token', 'write');

/** * For the release jobs, we need to be able to read from packages and also need id-token permissions for OIDC to authenticate to the registry.
 */
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release.permissions.id-token', 'write');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release.permissions.packages', 'read');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release.permissions.contents', 'write');

project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release_npm.permissions.id-token', 'write');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release_npm.permissions.packages', 'read');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release_npm.permissions.contents', 'write');

project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release_pypi.permissions.id-token', 'write');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release_pypi.permissions.packages', 'read');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release_pypi.permissions.contents', 'write');

project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release_golang.permissions.id-token', 'write');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release_golang.permissions.packages', 'read');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release_golang.permissions.contents', 'write');

new TextFile(project, '.tool-versions', {
  lines: [
    '# ~~ Generated by projen. To modify, edit .projenrc.ts and run "npx projen".',
    `nodejs ${minNodeVersion}`,
    'yarn 1.22.22',
  ],
});

project.synth();
// noop
