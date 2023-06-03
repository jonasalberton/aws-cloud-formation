import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { randomUUID } from "crypto";
import { DynamoDB } from "aws-sdk";

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  if (!event.body) {
    return { statusCode: 500, body: "Empty Body" };
  }

  const transaction = {
    id: randomUUID(),
    ...JSON.parse(event.body),
  };

  try {
    const dynamodb = new DynamoDB.DocumentClient();
    await dynamodb
      .put({
        TableName: "Transactions",
        Item: transaction,
      })
      .promise();

    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction),
    };
  } catch (err) {
    return { statusCode: 500, body: "Failed to add operation" };
  }
};
