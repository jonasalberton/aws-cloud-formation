import { Construct } from "constructs";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { Stack, RemovalPolicy, StackProps  } from "aws-cdk-lib";
import { Function, Code, Runtime } from "aws-cdk-lib/aws-lambda";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    /* FUNCTIONS */

    const transactionFN = new Function(this, "TransactionFN", {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset("lambda"),
      handler: "transaction.handler",
    });

    /* DATABASE*/

    const transactionsTable = new Table(this, "TransactionsTable", {
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
      tableName: 'Transactions',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    transactionsTable.grantReadWriteData(transactionFN);

    /* GATEWAY */

    const api = new RestApi(this, "OperationAPI", {
      restApiName: "OperationServiceApi",
    });

    const transactions = api.root.addResource("transactions");
    transactions.addMethod("POST", new LambdaIntegration(transactionFN));
  }
}
