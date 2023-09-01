import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { randomUUID } from "crypto";
import { DynamoDB, SQS } from "aws-sdk";
import { config } from 'dotenv';

config();
const namespace = process.env.NAMESPACE;
const TABLE = "Transactions-" + namespace;

type Transaction = {
  id: string;
  userId: number;
  amount: number;
  operation: "CREDIT" | "DEBIT";
};

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  if (!event.body) {
    return { statusCode: 500, body: "Empty Body" };
  }

  const transaction: Transaction = {
    id: randomUUID(),
    ...JSON.parse(event.body),
  };

  try {
    await insertTransaction(transaction);
    console.log("New transacion insertion for: ", transaction);

    await sendMessageQueue(transaction);
    console.log("Message send to queue successfully!");

    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Operation failed", error: err }),
    };
  }
};

async function insertTransaction(transaction: Transaction): Promise<any> {
  const dynamodb = new DynamoDB.DocumentClient();
  return dynamodb
    .put({
      TableName: TABLE,
      Item: transaction,
    })
    .promise();
}

async function sendMessageQueue(transaction: Transaction): Promise<any> {
  const sqs = new SQS();
  await sqs
    .sendMessage({
      MessageBody: JSON.stringify({
        transaction,
      }),
      QueueUrl: process.env.QUEUE_URL || "",
    })
    .promise();
}
