import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

// o ssm (systems manager) serve para guardar parametros anr na aws
export default class ProductsLayerStack extends cdk.Stack {
  // aqui eu crio um atributo de classe pois vou precisar importar esse layer dentro da minha outra stack onde criei as funções de produto
  readonly productLayer: lambda.LayerVersion

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props)
      // aqui eu crio o (template - infra estrutura) do meu layer, que será a criação dele como recurso na aws e o caminho que ele vai seguir, até chegar no layer de fato
    
      const productLayer = new lambda.LayerVersion(this, "ProductsLayer", {
      code: lambda.Code.fromAsset('lambda/products/layers/productsLayer'),
      layerVersionName: 'ProductsLayer',
      // vamos reter porque ele é um layer para outras stacks
      removalPolicy: cdk.RemovalPolicy.RETAIN
    })
    // guardando as informações para que outras stacks possam usar esse layer
    // para isso que usamos o ssm
    // o meu layer pode ter versoes, por isso eu posso dizer que imnha stack pode apontar para uma versão do layer que no caso sera ProductLayerVersionArn
    new ssm.StringParameter(this, 'ProductLayerVersionArn', {
      parameterName: 'ProductLayerVersionArn',
      stringValue: productLayer.layerVersionArn
    })

    const productEventsLayer = new lambda.LayerVersion(this, "ProductsEventsLayer", {
      code: lambda.Code.fromAsset('lambda/products/layers/productsEventsLayer'),
      layerVersionName: 'ProductsEventsLayer',
      removalPolicy: cdk.RemovalPolicy.RETAIN
    })
    new ssm.StringParameter(this, 'ProductEventsLayerVersionArn', {
      parameterName: 'ProductEventsLayerVersionArn',
      stringValue: productEventsLayer.layerVersionArn
    })
  }
}