import { awscdk, DependencyType, TextFile } from 'projen';
import { GithubCredentials, workflows } from 'projen/lib/github';
import { NpmAccess } from 'projen/lib/javascript';

const cdkCliVersion = '2.1029.2';
const minNodeVersion = '20.9.0';
const jsiiVersion = '^5.8.22';
const cdkVersion = '2.85.0'; // Minimum CDK Version Required
const minProjenVersion = '0.98.10'; // Does not affect consumers of the library
const minConstructsVersion = '10.0.5'; // Minimum version to support CDK v2 and does affect consumers of the library
const devConstructsVersion = '10.0.5'; // Pin for local dev/build to avoid jsii type conflicts
const configureAwsCredentialsVersion = 'v5';
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Jayson Rawlins',
  description: 'A CDK construct that helps build IAM policies using the AWS IAM Policy Builder dump. Normally it is better to use cdk-iam-floyd, However, I found that cdk-iam-floyd currently is not jsii compliant so I wasn\'t able to use it in my jsii compliant projects in languages that are not typescript or python.',
  authorAddress: 'JaysonJ.Rawlins@gmail.com',
  keywords: [
    'aws',
    'cdk',
    'iam-policy',
    'iam-actions',
  ],
  packageName: '@jjrawlins/cdk-iam-policy-builder-helper',
  cdkVersion: cdkVersion,
  cdkCliVersion: cdkCliVersion,
  projenVersion: `^${minProjenVersion}`,
  defaultReleaseBranch: 'main',
  license: 'Apache-2.0',
  jsiiVersion: jsiiVersion,
  name: '@jjrawlins/cdk-iam-policy-builder-helper',
  workflowBootstrapSteps: [
    {
      name: 'configure aws credentials',
      uses: `aws-actions/configure-aws-credentials@${configureAwsCredentialsVersion}`,
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
  publishToNuget: { // Broken for some reason
    packageId: 'JJRawlins.CdkIamPolicyBuilderHelper',
    dotNetNamespace: 'JJRawlins.CdkIamPolicyBuilderHelper',
  },
  publishToPypi: {
    distName: 'jjrawlins-cdk-iam-policy-builder-helper',
    module: 'jjrawlins_cdk_iam_policy_builder_helper',
  },
  publishToGo: {
    moduleName: 'github.com/jaysonrawlins/cdk-iam-policy-builder-helper',
    packageName: 'cdkiampolicybuilderhelper',
  },
  peerDeps: [
    `aws-cdk-lib@>=${cdkVersion} <3.0.0`,
    `constructs@>=${minConstructsVersion} <11.0.0`,
  ],
  deps: [
    '@aws-sdk/client-iam',
    'axios@^1.8.2',
  ],
  devDeps: [
    `aws-cdk@${cdkCliVersion}`,
    `aws-cdk-lib@${cdkVersion}`,
    `constructs@^${minConstructsVersion}`,
    '@aws-sdk/types',
    '@types/node',
    'projen',
    'jsii-docgen@^11',
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


project.addTask('generate:actions', {
  description: 'Generates the Actions.ts file from the AWS IAM Policy Builder dump.',
  exec: [
    'set -eu',
    'ts-node -P tsconfig.dev.json ./src/bin/download-actions-json.ts',
    'ts-node -P tsconfig.dev.json ./src/bin/create-actions-json.ts',
    'npx projen eslint',
    'echo "Actions.ts created successfully"',
  ].join('\n'),
});

project.addTask('generate:managed-policies', {
  description: 'Generates the ManagedPolicies.ts file from the AWS IAM Policy Builder dump.',
  exec: [
    'set -eu',
    'ts-node -P tsconfig.dev.json ./src/bin/download-managed-policies-json.ts',
    'npx projen eslint',
    'echo "ManagedPolicies.ts created successfully"',
  ].join('\n'),
});

// Create a new workflow for generating IAM definitions (runs separately from release)
const generateIamWorkflow = project.github!.addWorkflow('generate-iam-definitions');
generateIamWorkflow.on({
  workflowDispatch: {},
  schedule: [{ cron: '0 6 * * 1' }], // Weekly on Monday at 6am UTC
});

generateIamWorkflow.addJobs({
  generate: {
    name: 'Generate IAM Definitions',
    runsOn: ['ubuntu-latest'],
    permissions: {
      contents: workflows.JobPermission.WRITE,
      idToken: workflows.JobPermission.WRITE,
      packages: workflows.JobPermission.WRITE,
      pullRequests: workflows.JobPermission.WRITE,
    },
    outputs: {
      patch_created: { outputName: 'patch_created', stepId: 'create_patch' },
    },
    steps: [
      {
        name: 'Checkout',
        uses: 'actions/checkout@v5',
        with: { ref: 'main' },
      },
      {
        name: 'configure aws credentials',
        uses: `aws-actions/configure-aws-credentials@${configureAwsCredentialsVersion}`,
        with: {
          'role-to-assume': '${{ secrets.AWS_GITHUB_OIDC_ROLE }}',
          'role-duration-seconds': 900,
          'aws-region': '${{ secrets.AWS_GITHUB_OIDC_REGION }}',
          'role-skip-session-tagging': true,
          'role-session-name': 'GitHubActions',
        },
      },
      {
        name: 'Setup Node.js',
        uses: 'actions/setup-node@v5',
        with: { 'node-version': 'lts/*' },
      },
      {
        name: 'Install dependencies',
        run: 'yarn install --check-files --frozen-lockfile',
      },
      {
        name: 'Generate Actions',
        run: 'npx projen generate:actions',
      },
      {
        name: 'Generate Managed Policies',
        run: 'npx projen generate:managed-policies',
      },
      {
        name: 'Find mutations',
        id: 'create_patch',
        run: [
          'git add .',
          'git diff --staged --patch --exit-code > repo.patch || echo "patch_created=true" >> $GITHUB_OUTPUT',
        ].join('\n'),
      },
      {
        name: 'Upload patch',
        if: 'steps.create_patch.outputs.patch_created',
        uses: 'actions/upload-artifact@v4.6.2',
        with: {
          name: 'repo.patch',
          path: 'repo.patch',
          overwrite: true,
        },
      },
    ],
  },
  pr: {
    name: 'Create Pull Request',
    needs: ['generate'],
    runsOn: ['ubuntu-latest'],
    permissions: {
      contents: workflows.JobPermission.WRITE,
      idToken: workflows.JobPermission.WRITE,
      packages: workflows.JobPermission.WRITE,
      pullRequests: workflows.JobPermission.WRITE,
    },
    if: '${{ needs.generate.outputs.patch_created }}',
    steps: [
      {
        name: 'Generate token',
        id: 'generate_token',
        uses: 'actions/create-github-app-token@3ff1caaa28b64c9cc276ce0a02e2ff584f3900c5',
        with: {
          'app-id': '${{ secrets.PROJEN_APP_ID }}',
          'private-key': '${{ secrets.PROJEN_APP_PRIVATE_KEY }}',
        },
      },
      {
        name: 'Checkout',
        uses: 'actions/checkout@v5',
        with: { ref: 'main' },
      },
      {
        name: 'Download patch',
        uses: 'actions/download-artifact@v5',
        with: {
          name: 'repo.patch',
          path: '${{ runner.temp }}',
        },
      },
      {
        name: 'Apply patch',
        run: '[ -s ${{ runner.temp }}/repo.patch ] && git apply ${{ runner.temp }}/repo.patch || echo "Empty patch. Skipping."',
      },
      {
        name: 'Set git identity',
        run: [
          'git config user.name "github-actions[bot]"',
          'git config user.email "41898282+github-actions[bot]@users.noreply.github.com"',
        ].join('\n'),
      },
      {
        name: 'Create Pull Request',
        id: 'create-pr',
        uses: 'peter-evans/create-pull-request@v7',
        with: {
          'token': '${{ steps.generate_token.outputs.token }}',
          'commit-message': [
            'chore(deps): update IAM definitions',
            '',
            'Updates IAM action and managed policy definitions from AWS.',
            '',
            '[Workflow Run]: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}',
            '',
            '------',
            '',
            '*Automatically created by projen via the "generate-iam-definitions" workflow*',
          ].join('\n'),
          'branch': 'github-actions/generate-iam-definitions',
          'title': 'chore(deps): update IAM definitions',
          'body': [
            'Updates IAM action and managed policy definitions from AWS.',
            '',
            '[Workflow Run]: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}',
            '',
            '------',
            '',
            '*Automatically created by projen via the "generate-iam-definitions" workflow*',
          ].join('\n'),
          'author': 'github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>',
          'committer': 'github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>',
          'signoff': true,
        },
      },
      {
        name: 'Enable auto-merge',
        if: "steps.create-pr.outputs.pull-request-number != ''",
        run: 'gh pr merge --auto --squash "${{ steps.create-pr.outputs.pull-request-number }}"',
        env: {
          GH_TOKEN: '${{ steps.generate_token.outputs.token }}',
        },
      },
    ],
  },
});

// Add Yarn resolutions to ensure patched transitive versions
project.package.addField('resolutions', {
  'brace-expansion': '1.1.12',
  'form-data': '^4.0.4',
  '@eslint/plugin-kit': '^0.3.4',
  'eslint-import-resolver-typescript': '^4.4.4',
  'aws-cdk-lib': `>=${cdkVersion} <3.0.0`,
  // Pin constructs for local dev/build to a single version to avoid jsii conflicts
  'constructs': devConstructsVersion,
  'projen': `>=${minProjenVersion} <1.0.0`,
});

// Ensure 'constructs' is only a peer dependency (avoid duplicates that cause jsii conflicts)
project.deps.removeDependency('constructs');
project.deps.addDependency(`constructs@>=${minConstructsVersion} <11.0.0`, DependencyType.PEER);

project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.upgrade.permissions.id-token', 'write');
project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.upgrade.permissions.packages', 'write');
project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.upgrade.permissions.pull-requests', 'write');
project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.upgrade.permissions.contents', 'write');

project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.pr.permissions.id-token', 'write');
project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.pr.permissions.packages', 'write');
project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.pr.permissions.pull-requests', 'write');
project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.pr.permissions.contents', 'write');

// Add auto-merge step to upgrade-main workflow (step index 6, after PR creation)
project.github!.tryFindWorkflow('upgrade-main')!.file!.addOverride('jobs.pr.steps.6', {
  name: 'Enable auto-merge',
  if: "steps.create-pr.outputs.pull-request-number != ''",
  run: 'gh pr merge --auto --squash "${{ steps.create-pr.outputs.pull-request-number }}"',
  env: {
    GH_TOKEN: '${{ steps.generate_token.outputs.token }}',
  },
});

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

project.github!.tryFindWorkflow('build')!.file!.addOverride('jobs.package-dotnet.permissions.packages', 'write');
project.github!.tryFindWorkflow('build')!.file!.addOverride('jobs.package-dotnet.permissions.id-token', 'write');

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

project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release_nuget.permissions.id-token', 'write');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release_nuget.permissions.packages', 'read');
project.github!.tryFindWorkflow('release')!.file!.addOverride('jobs.release_nuget.permissions.contents', 'write');

new TextFile(project, '.tool-versions', {
  lines: [
    '# ~~ Generated by projen. To modify, edit .projenrc.ts and run "npx projen".',
    `nodejs ${minNodeVersion}`,
    'yarn 1.22.22',
  ],
});

// Projen creates this incorrectly
// Removing to keep linter happy
project.compileTask.exec('rm -r tsconfig.json');

project.synth();
// noop
