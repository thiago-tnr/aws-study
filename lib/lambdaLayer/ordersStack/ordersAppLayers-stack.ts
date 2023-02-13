import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as ssm from 'aws-cdk-lib/aws-ssm'

export class OrdersAppLayerStack extends cdk.Stack {
// criando a interface de um layer
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)
    
    const orderLayer = new lambda.LayerVersion(this, 'OrdersLayer', {
      code: lambda.Code.fromAsset('lambda/orders/layers/ordersLayer'),
      layerVersionName: 'OrdersLayer',
      removalPolicy: cdk.RemovalPolicy.RETAIN
    })
    
    new ssm.StringParameter(this, 'OrdersLayerVersionArn', {
      parameterName: 'OrdersLayerVersionArn',
      stringValue: orderLayer.layerVersionArn
    })
    // tratammentos de dados dos modelos de order - req e res
    const orderApiLayer = new lambda.LayerVersion(this, 'OrdersApiLayer', {
      code: lambda.Code.fromAsset('lambda/orders/layers/ordersApiLayer'),
      layerVersionName: 'OrdersApiLayer',
      removalPolicy: cdk.RemovalPolicy.RETAIN
    })
    
    new ssm.StringParameter(this, 'OrdersApiLayerVersionArn', {
      parameterName: 'OrdersApiLayerVersionArn',
      stringValue: orderApiLayer.layerVersionArn
    })
  }
}
    
//     const orderEventsLayer = new lambda.LayerVersion(this, 'OrderEventsLayer', {
//       code: lambda.Code.fromAsset('lambda/orders/layers/orderEventsLayer'),
//       layerVersionName: 'OrderEventsLayer',
//       removalPolicy: cdk.RemovalPolicy.RETAIN
//     })
    
//     new ssm.StringParameter(this, 'OrderEventsLayerVersionArn', {
//       parameterName: 'OrderEventsLayerVersionArn',
//       stringValue: orderEventsLayer.layerVersionArn
//     })

//     const orderEventsRepositoryLayer = new lambda.LayerVersion(this, 'OrderEventsRepositoryLayer', {
//       code: lambda.Code.fromAsset('lambda/orders/layers/orderEventsRepositoryLayer'),
//       layerVersionName: 'OrderEventsRepositoryLayer',
//       removalPolicy: cdk.RemovalPolicy.RETAIN
//     })
    
//     new ssm.StringParameter(this, 'OrderEventsRepositoryLayerVersionArn', {
//       parameterName: 'OrderEventsRepositoryLayerVersionArn',
//       stringValue: orderEventsRepositoryLayer.layerVersionArn
//     })
//   }
// }