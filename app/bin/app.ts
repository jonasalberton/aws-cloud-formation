#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AppStack } from '../lib/app-stack';
import { config } from 'dotenv';

config();

const namespace = process.env.NAMESPACE;

const app = new cdk.App();
new AppStack(app, 'AppStack-' + namespace, {
  env: {
    account: process.env.AWS_ACCOUNT,
    region: 'us-east-1',
}
});