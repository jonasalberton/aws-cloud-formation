import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDB } from "aws-sdk";

const TABLE = "Balance";

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  console.log("event", event);

  try {
    const balance = await getBalanceByUserId(1);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(balance),
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
  const result = await dynamodb
    .scan({
      TableName: TABLE,
      FilterExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": userId,
      },
    })
    .promise();

  return result.Items?.[0];
}
