import { awscdk } from 'projen';
import { NpmAccess } from 'projen/lib/javascript';

const cdkVersion = '2.150.0';
const minNodeVersion = '20.9.0';
const jsiiVersion = '~5.8.0';
const constructsVersion = '10.3.5';
const projenVersion = '0.91.1';
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
  npmAccess: NpmAccess.PUBLIC,
  projenrcTs: true,
  repositoryUrl: 'https://github.com/jjrawlins/cdk-iam-policy-builder-helper.git',
  githubOptions: {
    mergify: false,
    pullRequestLint: false,
  },
  depsUpgrade: false,
  publishToPypi: {
    distName: 'jjrawlins_cdk-iam-policy-builder-helper',
    module: 'jjrawlins_cdk_iam_policy_builder_helper',
  },
  publishToGo: {
    moduleName: 'github.com/jjrawlins/cdk-iam-policy-builder-helper-construct',
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
  ],
  devDeps: [
    '@types/axios',
    '@aws-sdk/types',
    '@types/node',
  ],
  gitignore: [
    'methods_list.txt',
    '~*.yml',
  ],
  eslint: true,
});

// Add the 'download-policies' task to the 'prebuild' phase of the build process
project.preCompileTask.exec(`ts-node ./src/bin/download-actions-json.ts &&
ts-node ./src/bin/download-managed-policies-json.ts &&
ts-node ./src/bin/create-actions-json.ts`);

project.github!.actions.set('actions/checkout', 'actions/checkout@v4');
project.github!.actions.set('actions/setup-node', 'actions/setup-node@v4');
project.github!.actions.set('actions/upload-artifact', 'actions/upload-artifact@v4');
project.github!.actions.set('actions/download-artifact', 'actions/download-artifact@v4');

project.synth();
