import { Construct } from "constructs";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { Stack, RemovalPolicy, StackProps, Duration } from "aws-cdk-lib";
import { Function, Code, Runtime } from "aws-cdk-lib/aws-lambda";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { config } from 'dotenv';

config();

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const namespace = process.env.NAMESPACE;
    const domain = namespace === 'prod' ? 'churrasmaster.com' : `${namespace}.churrasmaster.com`;


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
      tableName: "Transactions",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const balanceTable = new Table(this, "BalanceTable-" + namespace, {
      partitionKey: {
        name: "id",
        type: AttributeType.NUMBER,
      },
      tableName: "Balance",
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
