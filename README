AWS Cloud Formation Projet

### Description

This is a simple project to learn AWS Cloud formation
The main requirement of this chalange is 

"Me as a user, want to store transactions for my bank account and want to see the final balance"


### Solutions steps
The solution is composed by API Gateway, 3 lambdas, SQS and DynamoDb

### How to setup
- npm install in main directory
- setup your AWS path variables
- npm run build
- npm run bootstrap
- npm run deploy -> the aoutcome will be a valid url you can use to reach the available APIS

-----
# APIS

### Save new transaction
This endpoint will store a new transaction for the userId provided and will return the saved value

HTTP POST `{{url}}/transactions`  
body:
```js 
{
  "operation": "CREDIT" | "DEBIT",
  "amount": 500,
  "userId": 1
}
``` 
-----

### Get user balance
This endpoint will return the balance by userId

HTTP POST `{{url}}/balance/{userID}`  
response:

```js 
{
  "id": 1,
  "amount": 2000
}
```
-----
### Diagram
![alt text](app/Diagram.png)