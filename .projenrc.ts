import { awscdk } from 'projen';
import { GithubCredentials } from 'projen/lib/github';
import { NpmAccess } from 'projen/lib/javascript';

const cdkVersion = '2.189.1';
const minNodeVersion = '22.x';
const jsiiVersion = '~5.8.0';
const constructsVersion = '10.4.2';
const projenVersion = '^0.95.4';
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
  constructsVersion: constructsVersion,
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
        ],
      },
    },
  },
  depsUpgrade: true,
  publishToPypi: {
    distName: 'jjrawlins_cdk-iam-policy-builder-helper',
    module: 'jjrawlins_cdk_iam_policy_builder_helper',
  },
  publishToGo: {
    moduleName: 'github.com/jaysonrawlins/cdk-iam-policy-builder-helper',
    packageName: 'cdk-iam-policy-builder-helper',
  },
  bundledDeps: [
    '@aws-sdk/client-iam',
    'axios',
    'jsonc-parser',
  ],
  deps: [
    'projen',
    'constructs',
    '@aws-sdk/client-iam',
    'axios@^1.8.2',
  ],
  devDeps: [
    '@aws-sdk/types',
    '@types/node',
  ],
  gitignore: [
    'methods_list.txt',
    '~*.yml',
  ],
  eslint: true,
});


project.preCompileTask.exec([
  'ts-node ./src/bin/download-actions-json.ts',
  'ts-node ./src/bin/download-managed-policies-json.ts',
  'ts-node ./src/bin/create-actions-json.ts',
  'npx projen eslint',
].join('\n'));

// Add Yarn resolutions to ensure patched transitive versions
project.package.addField('resolutions', {
  'brace-expansion': '1.1.12',
  'form-data': '^4.0.4',
  '@eslint/plugin-kit': '^0.3.4',
});

project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.upgrade.permissions.id-token', 'write');
project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.upgrade.permissions.packages', 'write');
project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.upgrade.permissions.pull-requests', 'write');
project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.upgrade.permissions.contents', 'write');

project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.pr.permissions.id-token', 'write');
project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.pr.permissions.packages', 'write');
project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.pr.permissions.pull-requests', 'write');
project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.pr.permissions.contents', 'write');


project.github!.tryFindWorkflow('build')!.file!.addOverride('jobs.build.permissions.id-token', 'write');
project.github!.tryFindWorkflow('build')!.file!.addOverride('jobs.build.permissions.packages', 'read');

project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release.permissions.id-token', 'write');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release.permissions.packages', 'read');

project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release_npm.permissions.id-token', 'write');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release_npm.permissions.packages', 'read');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release_npm.permissions.contents', 'write');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.package_npm.permissions.id-token', 'write');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.package_npm.permissions.packages', 'read');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.package_npm.permissions.contents', 'write');


project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release_pypi.permissions.contents', 'write');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release_pypi.permissions.id-token', 'write');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release_pypi.permissions.packages', 'read');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.package_pypi.permissions.contents', 'write');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.package_pypi.permissions.id-token', 'write');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.package_pypi.permissions.packages', 'read');


project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release_golang.permissions.id-token', 'write');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release_golang.permissions.packages', 'read');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release_golang.permissions.contents', 'write');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.package_golang.permissions.id-token', 'write');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.package_golang.permissions.packages', 'read');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.package_golang.permissions.contents', 'write');


project.synth();
