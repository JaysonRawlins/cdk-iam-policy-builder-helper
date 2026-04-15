import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import {
  Effect,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Actions, ManagedPolicies } from '../../src';

const fakeEnv = { account: '123456789012', region: 'us-east-1' };

describe('E2E: CDK synth with Actions and ManagedPolicies', () => {

  describe('EC2 role (mirrors tester repo stack)', () => {
    let template: Template;

    beforeAll(() => {
      const app = new App();
      const stack = new Stack(app, 'TesterStack', { env: fakeEnv });

      new Role(stack, 'Ec2Role', {
        assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
        inlinePolicies: {
          Ec2Policy: new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  Actions.ec2.DescribeInstances,
                  Actions.ec2.DescribeInstanceTypes,
                  Actions.ec2.DescribeInstanceTypeOfferings,
                ],
                resources: ['*'],
              }),
            ],
          }),
        },
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName(ManagedPolicies.AmazonEC2ReadOnlyAccess.PolicyName),
          ManagedPolicy.fromManagedPolicyArn(stack, 'Ec2ReadOnly', ManagedPolicies.AmazonEC2ReadOnlyAccess.Arn),
        ],
      });

      template = Template.fromStack(stack);
    });

    test('inline policy contains the expected EC2 actions', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        Policies: Match.arrayWith([
          Match.objectLike({
            PolicyName: 'Ec2Policy',
            PolicyDocument: {
              Statement: Match.arrayWith([
                Match.objectLike({
                  Effect: 'Allow',
                  Action: Match.arrayWith([
                    'ec2:DescribeInstances',
                    'ec2:DescribeInstanceTypes',
                    'ec2:DescribeInstanceTypeOfferings',
                  ]),
                  Resource: '*',
                }),
              ]),
            },
          }),
        ]),
      });
    });

    test('managed policies are attached', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: Match.arrayWith([
          { 'Fn::Join': Match.anyValue() },
          'arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess',
        ]),
      });
    });

    test('trust policy allows ec2.amazonaws.com', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            Match.objectLike({
              Effect: 'Allow',
              Principal: { Service: 'ec2.amazonaws.com' },
            }),
          ],
        },
      });
    });
  });

  describe('Multi-service role with mixed lookup styles', () => {
    let template: Template;

    beforeAll(() => {
      const app = new App();
      const stack = new Stack(app, 'MultiServiceStack', { env: fakeEnv });

      new Role(stack, 'MultiRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          S3Access: new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  Actions.s3.GetObject,
                  Actions.s3.PutObject,
                  Actions.s3.DeleteObject,
                  Actions.s3.ListBucket,
                ],
                resources: [
                  'arn:aws:s3:::my-bucket',
                  'arn:aws:s3:::my-bucket/*',
                ],
              }),
            ],
          }),
          DynamoAccess: new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  Actions.dynamodb.GetItem,
                  Actions.dynamodb.PutItem,
                  Actions.dynamodb.Query,
                ],
                resources: ['arn:aws:dynamodb:us-east-1:123456789012:table/my-table'],
              }),
            ],
          }),
        },
        managedPolicies: [
          ManagedPolicy.fromManagedPolicyArn(stack, 'LambdaExec', ManagedPolicies.AWSLambdaBasicExecutionRole.Arn),
          ManagedPolicy.fromAwsManagedPolicyName(ManagedPolicies.AWSLambdaVPCAccessExecutionRole.PolicyName),
        ],
      });

      template = Template.fromStack(stack);
    });

    test('S3 inline policy has scoped resources', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        Policies: Match.arrayWith([
          Match.objectLike({
            PolicyName: 'S3Access',
            PolicyDocument: {
              Statement: Match.arrayWith([
                Match.objectLike({
                  Action: Match.arrayWith(['s3:GetObject', 's3:PutObject']),
                  Resource: Match.arrayWith([
                    'arn:aws:s3:::my-bucket',
                    'arn:aws:s3:::my-bucket/*',
                  ]),
                }),
              ]),
            },
          }),
        ]),
      });
    });

    test('DynamoDB inline policy targets a specific table', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        Policies: Match.arrayWith([
          Match.objectLike({
            PolicyName: 'DynamoAccess',
            PolicyDocument: {
              Statement: Match.arrayWith([
                Match.objectLike({
                  Action: Match.arrayWith([
                    'dynamodb:GetItem',
                    'dynamodb:PutItem',
                    'dynamodb:Query',
                  ]),
                  Resource: 'arn:aws:dynamodb:us-east-1:123456789012:table/my-table',
                }),
              ]),
            },
          }),
        ]),
      });
    });

    test('Lambda managed policies attached via both ARN and name', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: Match.arrayWith([
          'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
          { 'Fn::Join': Match.anyValue() },
        ]),
      });
    });

    test('trust policy allows lambda.amazonaws.com', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            Match.objectLike({
              Principal: { Service: 'lambda.amazonaws.com' },
            }),
          ],
        },
      });
    });
  });

  describe('Deny statement and multiple managed policies', () => {
    let template: Template;

    beforeAll(() => {
      const app = new App();
      const stack = new Stack(app, 'DenyStack', { env: fakeEnv });

      new Role(stack, 'RestrictedRole', {
        assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
        inlinePolicies: {
          AllowRead: new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [Actions.s3.GetObject, Actions.s3.ListBucket],
                resources: ['*'],
              }),
            ],
          }),
          DenyDelete: new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.DENY,
                actions: [Actions.s3.DeleteObject, Actions.s3.DeleteBucket],
                resources: ['*'],
              }),
            ],
          }),
        },
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName(ManagedPolicies.ReadOnlyAccess.PolicyName),
          ManagedPolicy.fromManagedPolicyArn(stack, 'CloudWatch', ManagedPolicies.CloudWatchFullAccess.Arn),
        ],
      });

      template = Template.fromStack(stack);
    });

    test('deny statement is synthesized with Effect: Deny', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        Policies: Match.arrayWith([
          Match.objectLike({
            PolicyName: 'DenyDelete',
            PolicyDocument: {
              Statement: Match.arrayWith([
                Match.objectLike({
                  Effect: 'Deny',
                  Action: Match.arrayWith(['s3:DeleteObject', 's3:DeleteBucket']),
                }),
              ]),
            },
          }),
        ]),
      });
    });

    test('both managed policies are attached', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: Match.arrayWith([
          { 'Fn::Join': Match.anyValue() },
          'arn:aws:iam::aws:policy/CloudWatchFullAccess',
        ]),
      });
    });
  });

  describe('Action and ManagedPolicy value integrity', () => {
    test('Actions values follow the service:Action format', () => {
      expect(Actions.ec2.DescribeInstances).toMatch(/^ec2:\w+$/);
      expect(Actions.s3.GetObject).toMatch(/^s3:\w+$/);
      expect(Actions.lambda.InvokeFunction).toMatch(/^lambda:\w+$/);
      expect(Actions.dynamodb.Query).toMatch(/^dynamodb:\w+$/);
      expect(Actions.iam.CreateRole).toMatch(/^iam:\w+$/);
      expect(Actions.sts.AssumeRole).toMatch(/^sts:\w+$/);
      expect(Actions.sqs.SendMessage).toMatch(/^sqs:\w+$/);
      expect(Actions.sns.Publish).toMatch(/^sns:\w+$/);
    });

    test('ManagedPolicies have both PolicyName and Arn', () => {
      const policies = [
        ManagedPolicies.AdministratorAccess,
        ManagedPolicies.PowerUserAccess,
        ManagedPolicies.ReadOnlyAccess,
        ManagedPolicies.AWSLambdaBasicExecutionRole,
        ManagedPolicies.AmazonEC2ReadOnlyAccess,
      ];

      for (const policy of policies) {
        expect(policy).toHaveProperty('PolicyName');
        expect(policy).toHaveProperty('Arn');
        expect(policy.PolicyName).toBeTruthy();
        expect(policy.Arn).toMatch(/^arn:aws:iam::aws:policy\//);
      }
    });

    test('ManagedPolicy ARN contains the policy name', () => {
      expect(ManagedPolicies.AdministratorAccess.Arn).toContain('AdministratorAccess');
      expect(ManagedPolicies.PowerUserAccess.Arn).toContain('PowerUserAccess');
    });
  });
});
