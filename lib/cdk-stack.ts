import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from '@aws-cdk/aws-amplify-alpha';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import * as dotenv from 'dotenv';

// .envファイルを読み込む
dotenv.config();

export class AmplifyApiLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 環境変数からGitHubのOAuthトークンを取得
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error('GitHub Token is not set in the environment variables');
    }

    // Amplify App
    const amplifyApp = new amplify.App(this, 'AmplifyApp', {
      sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
        owner: 'gray-1to', // GitHubのユーザー名
        repository: 'ChatBites', // リポジトリ名
        oauthToken: cdk.SecretValue.plainText(githubToken), // トークンをplainTextとして設定
      }),
    });

    const mainBranch = amplifyApp.addBranch('main'); // mainブランチの追加

    // Lambda Function
    const talkGenerateLambdaFunction = new lambda.Function(this, 'TalkGenerateLambdaFunction', {
      runtime: lambda.Runtime.PYTHON_3_11, // Lambda runtime
      handler: 'generate.lambda_handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/talk')), // Lambda関数のコードへのパス
    });
    const historyListLambdaFunction = new lambda.Function(this, 'HistoryListLambdaFunction', {
      runtime: lambda.Runtime.PYTHON_3_11, // Lambda runtime
      handler: 'list.lambda_handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/history')), // Lambda関数のコードへのパス
    });

    // API Gateway
    const api = new apigateway.LambdaRestApi(this, 'MyApi', {
      handler: talkGenerateLambdaFunction,
      proxy: false, // カスタムルーティング
    });

    const talk = api.root.addResource('talk');
    const generateTalk = talk.addResource('generate');
    generateTalk.addMethod('POST'); // POST /talk/generate -> TalkGenerateLambdaFunction

    const history = api.root.addResource('history');
    const listHistory = history.addResource('list');
    listHistory.addMethod('GET', new apigateway.LambdaIntegration(historyListLambdaFunction)); // GET /history/list -> HistoryListLambdaFunction

    // Outputs
    new cdk.CfnOutput(this, 'AmplifyAppUrl', {
      value: `https://${mainBranch.branchName}.${amplifyApp.defaultDomain}`,
      description: 'The Amplify app URL',
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });
  }
}

