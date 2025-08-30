import { awscdk } from 'projen';
import { NpmAccess } from 'projen/lib/javascript';

const cdkVersion = '2.189.1';
const minNodeVersion = '22.x';
const jsiiVersion = '~5.8.0';
const constructsVersion = '10.4.2';
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
  repositoryUrl: 'https://github.com/JaysonRawlins/cdk-iam-policy-builder-helper.git',
  githubOptions: {
    mergify: false,
    pullRequestLint: false,
  },
  depsUpgrade: true,
  publishToPypi: {
    distName: 'jjrawlins_cdk-iam-policy-builder-helper',
    module: 'jjrawlins_cdk_iam_policy_builder_helper',
  },
  publishToGo: {
    moduleName: 'github.com/JaysonRawlins/cdk-iam-policy-builder-helper-construct',
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

project.synth();
