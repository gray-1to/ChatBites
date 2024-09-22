#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AmplifyApiLambdaStack } from "../lib/cdk-stack";

const app = new cdk.App();
new AmplifyApiLambdaStack(app, "CdkStack", {
  env: { account: "254337601349", region: "ap-northeast-1" },
});
