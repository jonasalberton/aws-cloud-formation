import { Construct } from "constructs";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { Stack, RemovalPolicy, StackProps, Duration } from "aws-cdk-lib";
import { Function, Code, Runtime } from "aws-cdk-lib/aws-lambda";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { config } from 'dotenv';
import { Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { CloudFrontWebDistribution, ViewerCertificate } from "aws-cdk-lib/aws-cloudfront";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";

config();

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const namespace = process.env.NAMESPACE;
    const domain = namespace === 'prod' ? 'churrasmasters.com.br' : `${namespace}.churrasmasters.com.br`;


    /* FRONT_END */

    const websiteBucket = new Bucket(this, `website-bucket-${namespace}`, {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false
      },
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new BucketDeployment(this, `website-deployment-${namespace}`, {
      sources: [Source.asset('../frontend/dist')],
      destinationBucket: websiteBucket,
    });

    const certificate = Certificate.fromCertificateArn(this, `certificate`, 'arn:aws:acm:us-east-1:813957740682:certificate/135c6143-0180-41f7-b5c6-2cd90bbd9928');
    
    const distribution = new CloudFrontWebDistribution(this, `cloud-front-distribution-${namespace}`, {
      comment: `cloud-front-distribution-${namespace}`,
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: websiteBucket,
          },
          behaviors: [{ isDefaultBehavior: true }],
        },
      ],
      viewerCertificate: ViewerCertificate.fromAcmCertificate(certificate, {
        aliases: [domain],
      }),
    });


    new ARecord(this, `a-record-${namespace}`, {
      recordName: domain,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      zone: HostedZone.fromLookup(this, 'Zone', { domainName: 'churrasmasters.com.br' }),
    });


    /* QUEUE */

    const newTransactionCreatedQueue = new Queue(
      this,
      "TransactionCreatedQueue-" + namespace,
      {
        visibilityTimeout: Duration.seconds(300),
      }
    );

    /* FUNCTIONS */

    const updateBalanceFN = new Function(this, "UpdateBalanceFN-" + namespace, {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset("lambda"),
      handler: "update-balance.handler",
    });

    const transactionFN = new Function(this, "TransactionFN-" + namespace, {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset("lambda"),
      handler: "transaction.handler",
      environment: {
        QUEUE_URL: newTransactionCreatedQueue.queueUrl,
      },
    });

    const balanceFN = new Function(this, "BalanceFN-" + namespace, {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset("lambda"),
      handler: "get-balance.handler",
    });

    /* DATABASE*/

    const transactionsTable = new Table(this, "TransactionsTable-" + namespace, {
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
      tableName: "Transactions-" + namespace,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const balanceTable = new Table(this, "BalanceTable-" + namespace, {
      partitionKey: {
        name: "id",
        type: AttributeType.NUMBER,
      },
      tableName: "Balance-" + namespace,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    /* AUTHORIZATIONS CONFIG */

    balanceTable.grantReadWriteData(balanceFN);
    balanceTable.grantReadWriteData(updateBalanceFN);
    transactionsTable.grantReadWriteData(transactionFN);
    newTransactionCreatedQueue.grantSendMessages(transactionFN);
    updateBalanceFN.addEventSource(
      new SqsEventSource(newTransactionCreatedQueue)
    );

    /* GATEWAY */

    const api = new RestApi(this, "Bank API-" + namespace, {
      restApiName: "BankApi",
    });

    const transactionsController = api.root.addResource("transactions");
    transactionsController.addMethod("POST", new LambdaIntegration(transactionFN));

    const balanceController = api.root.addResource("balance");
    
    const userBalance = balanceController.addResource('{userId}')
    userBalance.addMethod("GET", new LambdaIntegration(balanceFN));
  }
}
