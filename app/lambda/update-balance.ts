import { SQSEvent } from "aws-lambda";
import { DynamoDB } from "aws-sdk";

const TABLE = "Balance";

type Transaction = {
  id: string;
  userId: number;
  amount: number;
  operation: "CREDIT" | "DEBIT";
};

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const { transaction } = JSON.parse(record.body) as {
      transaction: Transaction;
    };

    try {
      const balance = await getBalanceByUserId(transaction.userId);

      if (!balance) {
        await createBalance(transaction.userId, transaction.amount);
        console.log(`New balance created for userId: `, transaction.userId);
        return;
      }

      await updateAmountByUserId(transaction, balance);

      console.log(
        `Balance updated successfully for userId: `,
        transaction.userId
      );
    } catch (error) {
      console.error(`Error trying to update balance`, error);
    }
  }
};

function calcAmount(
  currentAmount: number,
  operation: Transaction["operation"],
  operationAmount: number
): number {
  if (operation === "CREDIT") {
    return currentAmount + operationAmount;
  }

  return currentAmount - operationAmount;
}

async function getBalanceByUserId(userId: number): Promise<any> {
  const dynamodb = new DynamoDB.DocumentClient();
  const result = await dynamodb
    .get({
      TableName: TABLE,
      Key: {
        id: userId
      }
    })
    .promise();

    console.log('retorno GET');

  return result;
}

async function createBalance(userId: number, amount: number): Promise<any> {
  const dynamodb = new DynamoDB.DocumentClient();
  return dynamodb
    .put({
      TableName: "Balance",
      Item: {
        id: userId,
        amount: amount,
      },
    })
    .promise();
}

async function updateAmountByUserId(
  transaction: Transaction,
  currentBalance: any
): Promise<any> {
  const newAmount = calcAmount(
    currentBalance.amount,
    transaction.operation,
    transaction.amount
  );

  const dynamodb = new DynamoDB.DocumentClient();
  await dynamodb
    .update({
      TableName: TABLE,
      Key: {
        id: transaction.userId,
      },
      UpdateExpression: "SET #attr1 = :val1",
      ExpressionAttributeNames: {
        "#attr1": "amount",
      },
      ExpressionAttributeValues: {
        ":val1": updateAmountByUserId,
      },
      ReturnValues: "ALL_NEW",
    })
    .promise();
}
