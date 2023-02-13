import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export default class EvensDdbStack extends cdk.Stack {
  // minha stack será invocado por stack de funções diferentes, por isso o nome table
  // ela vai acessar tabelas de oturas stack
  readonly table: dynamodb.Table
// aqui eu estou criando a minha tabela de eventos, essa é a interface que ira implementar ela na aws
// essa é a infra da minha tabela de eventos, que será invocada pelo meu lambda de product-events
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    this.table = new dynamodb.Table(this, "EventDdb", {
      tableName: 'events',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'sk',
        type: dynamodb.AttributeType.STRING
      },
      timeToLiveAttribute: 'ttl',
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1
    })
  }
}