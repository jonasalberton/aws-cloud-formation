import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import { config } from 'dotenv';

config();
const namespace = process.env.NAMESPACE;
const TABLE = "Balance-" + namespace;

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {

  const { userId } = event.pathParameters as any;

  try {
    const { Item } = await getBalanceByUserId(userId);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Item),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to get user balance", error }),
    };
  }
};

async function getBalanceByUserId(userId: number) {
  const dynamodb = new DynamoDB.DocumentClient();
  return dynamodb
    .get({
      TableName: TABLE,
      Key: {
        id: Number(userId)
      }
    })
    .promise();
}
