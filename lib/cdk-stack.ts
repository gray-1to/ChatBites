import * as cdk from "aws-cdk-lib";
import { StackProps } from 'aws-cdk-lib';
import { Construct } from "constructs";
import * as amplify from "@aws-cdk/aws-amplify-alpha";
import { RedirectStatus } from "@aws-cdk/aws-amplify-alpha";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as path from "path";
import * as dotenv from "dotenv";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as iam from "aws-cdk-lib/aws-iam";
import { LayerVersion, Code, Runtime } from "aws-cdk-lib/aws-lambda";
import {
  PolicyStatement,
  Effect,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import * as cognito from 'aws-cdk-lib/aws-cognito';

interface HostingStackProps extends StackProps {
  readonly environmentVariables?: { [name: string]: string }
}

// .envファイルを読み込む
dotenv.config();

export class AmplifyApiLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: HostingStackProps) {
    super(scope, id, props);

    // 環境変数からGitHubのOAuthトークンを取得
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error("GitHub Token is not set in the environment variables");
    }

    // IAM Role for Amplify
    const amplifyRole = new iam.Role(this, 'AmplifyRole', {
      assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
    });

    // Attach necessary policies
    amplifyRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess-Amplify'));

    // Amplify App
    const amplifyApp = new amplify.App(this, "AmplifyApp", {
      sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
        owner: "gray-1to", // GitHubのユーザー名
        repository: "ChatBites", // リポジトリ名
        oauthToken: cdk.SecretValue.plainText(githubToken), // トークンをplainTextとして設定
      }),
      customRules: [
        {
          source: "/<*>",
          target: "/index.html",
          status: RedirectStatus.NOT_FOUND_REWRITE,
        },
      ],
      environmentVariables: props?.environmentVariables,
      buildSpec: codebuild.BuildSpec.fromObjectToYaml({
        version: 1,
        frontend: {
          phases: {
            preBuild: {
              commands: ["cd chatbites && npm ci"],
            },
            build: {
              commands: ["npm run build", "echo GITHUB_TOKEN=$GITHUB_TOKEN >> .env"],
            },
          },
          artifacts: {
            baseDirectory: "chatbites/out",
            files: ["**/*"],
          },
          cache: {
            paths: ["chatbites/node_modules/**/*"],
          },
        },
      }),
      role: amplifyRole,
    });
    const mainBranch = amplifyApp.addBranch('main');
    const devBranch = amplifyApp.addBranch('dev');

    // Cognito User Pool の作成
    const userPool = new cognito.UserPool(this, 'MyUserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: {
          required: true,
          mutable: false,
        },
      },
    });
  
    // Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      generateSecret: false,
    });

    // Amplify に Cognito を統合
    amplifyApp.addEnvironment('COGNITO_USER_POOL_ID', userPool.userPoolId);
    amplifyApp.addEnvironment('NEXT_PUBLIC_COGNITO_CLIENT_ID', userPoolClient.userPoolClientId);


    // Lambda Function
    // for Bedrock
    const boto3LayerVersion = new LayerVersion(this, "Boto3LayerVersion", {
      code: Code.fromAsset(path.join(__dirname, "../lambda/layers/boto3-1.35.25.zip")),
      compatibleRuntimes: [Runtime.PYTHON_3_11],
    });
    // for request
    const requestsLayerVersion = new LayerVersion(this, "RequestsLayerVersion", {
      code: Code.fromAsset(path.join(__dirname, "../lambda/layers/requests-2.32.3.zip")),
      compatibleRuntimes: [Runtime.PYTHON_3_11],
    });

    const bedrockAccessPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["bedrock:InvokeModel"], // See: https://docs.aws.amazon.com/ja_jp/service-authorization/latest/reference/list_amazonbedrock.html
      resources: ["*"],
    });

    const bedrockAccessRole = new Role(this, "BedrockAccessRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    });
    bedrockAccessRole.addToPolicy(bedrockAccessPolicy);

    const talkGenerateLambdaFunction = new lambda.Function(
      this,
      "TalkGenerateLambdaFunction",
      {
        runtime: lambda.Runtime.PYTHON_3_11, // Lambda runtime
        handler: "generate.lambda_handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "../lambda/talk")), // Lambda関数のコードへのパス
        layers: [boto3LayerVersion], // for boto3
        role: bedrockAccessRole, // for bedrock
        timeout: cdk.Duration.seconds(30),
      }
    );
    const talkSearchLambdaFunction = new lambda.Function(
      this,
      "TalkSearchLambdaFunction",
      {
        runtime: lambda.Runtime.PYTHON_3_11, // Lambda runtime
        handler: "search.lambda_handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "../lambda/talk")), // Lambda関数のコードへのパス
        layers: [boto3LayerVersion, requestsLayerVersion], // for boto3, requests
        role: bedrockAccessRole, // for bedrock
        timeout: cdk.Duration.seconds(30),
        environment: {
          GOOGLE_MAP_API_KEY: process.env.GOOGLE_MAP_API_KEY ?? '',
          REGION: cdk.Stack.of(this).region,
        },
      }
    );
    const historyListLambdaFunction = new lambda.Function(
      this,
      "HistoryListLambdaFunction",
      {
        runtime: lambda.Runtime.PYTHON_3_11, // Lambda runtime
        handler: "list.lambda_handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "../lambda/history")), // Lambda関数のコードへのパス
      }
    );

    // API Gateway
    const api = new apigateway.LambdaRestApi(this, "MyApi", {
      handler: talkGenerateLambdaFunction,
      proxy: false, // カスタムルーティング
    });

    const talk = api.root.addResource("talk");
    const generateTalk = talk.addResource("generate");
    generateTalk.addMethod("POST"); // POST /talk/generate -> TalkGenerateLambdaFunction
    
    const talkSearch = talk.addResource("search");
    talkSearch.addMethod(
      "POST",
      new apigateway.LambdaIntegration(talkSearchLambdaFunction),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Headers': true,
              'method.response.header.Access-Control-Allow-Methods': true,
            },
          },
          {
            statusCode: '400',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Headers': true,
              'method.response.header.Access-Control-Allow-Methods': true,
            },
          },
        ],
      }
    );

    const history = api.root.addResource("history");
    const listHistory = history.addResource("list");
    listHistory.addMethod(
      "GET",
      new apigateway.LambdaIntegration(historyListLambdaFunction),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Headers': true,
              'method.response.header.Access-Control-Allow-Methods': true,
            },
          },
          {
            statusCode: '400',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Headers': true,
              'method.response.header.Access-Control-Allow-Methods': true,
            },
          }
        ],
      }
    ); // GET /history/list -> HistoryListLambdaFunction

    // Outputs
    new cdk.CfnOutput(this, "AmplifyAppUrl", {
      value: `https://${mainBranch.branchName}.${amplifyApp.defaultDomain}`,
      description: "The Amplify app URL",
    });

    new cdk.CfnOutput(this, "DevAmplifyAppUrl", {
      value: `https://${devBranch.branchName}.${amplifyApp.defaultDomain}`,
      description: "devブランチのAmplifyアプリURL",
    });

    new cdk.CfnOutput(this, "ApiGatewayUrl", {
      value: api.url,
      description: "API Gateway URL",
    });
  }
}
