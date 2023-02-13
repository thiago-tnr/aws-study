// no nosso projeto, o api gateway vai ficar em uma stack separada, pois ele serviço para gerencia api's diferentes. Como serão expostar api diferente de serviço diferentes, o meu apiGateway ficara desacoplado. claro que posso, para cada serviço cirar um api gateway, mas a desvantagem disso é gerencias vários recursos ao inves de um

import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as cdk from 'aws-cdk-lib'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as cwlogs from 'aws-cdk-lib/aws-logs'
import { Construct } from 'constructs'

//aqui nos vamos criar uma stack que irá representar o nosso apigateway (interface) 
// essa stack não servirá para setar as rotas e os enpoint que será consumidos com seus verbos http
// ela será apenas a porta de entrada para que quando eu chamar por exemplo um get products
// ela irá validar se existe essa rota, se existe o resource, se está tudo certo, e logo em seguida
// a minha rota que fica dentro da minha stack com as rotas e ações no código será invocada

interface ECommerceApiStackProps extends cdk.StackProps {
  // aqui eu estou criando um atributo de classe que vai representar a minha stack de product
  productsFetchHandler: lambdaNodeJs.NodejsFunction
  productsAdminHandler: lambdaNodeJs.NodejsFunction
  ordersHandler: lambdaNodeJs.NodejsFunction
}
export default class ECommerceApiStack extends cdk.Stack {
  //construtor padrão de uma stack
  constructor(scope: Construct, id: string, props: ECommerceApiStackProps) {
    super(scope, id, props)

    const logGroups = new cwlogs.LogGroup(this, 'ECommerceApiLogs')

    // criação da requisião da minha apigateway, aqui eu crio a interface principal do apigateway
    const api = new apigateway.RestApi(this, "ECommerceApi", {
      restApiName: "ECommerceApi",
      cloudWatchRole: true,
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroups),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          caller: true,
          user: true
        })
      }
    })

    // criar o redirecionamento da minha integração
    // eu preciso dizer de que forma a minha função lambda, que está sendo criada para minha stack, será invocada    
    // primeiro eu crio um recurso que vai representar o meu serviço de produtos, que é um endpoint nesse caso 
    this.createProductsService(props, api)
    this.createOrdersService(props, api)
  }

  private createProductsService(props: ECommerceApiStackProps, api: apigateway.RestApi) {
    const productResource = api.root.addResource('products')
    const productIdResource = productResource.addResource('{id}')

    // integrando o apigateway com a minha função lambda, para que sempre que alguém fizer um requisição das listadas
    // e esteja tudo correto, o meu apigteway irá invocar/redirecionar minha função lambda
    const productsFetchIntegration = new apigateway.LambdaIntegration(props.productsFetchHandler)
    // o tipo de metodo que será usado para invocar meu resource e para onde esse metodo será direcionado (/products/GET)
    productResource.addMethod('GET', productsFetchIntegration)
    // GET products/id
    productIdResource.addMethod('GET', productsFetchIntegration)

    const productsAdminIntegration = new apigateway.LambdaIntegration(props.productsAdminHandler)
    productResource.addMethod('POST', productsAdminIntegration)
    productIdResource.addMethod('PUT', productsAdminIntegration)
    productIdResource.addMethod('DELETE', productsAdminIntegration)
  }

  private createOrdersService(props: ECommerceApiStackProps, api: apigateway.RestApi) {
    const orderIntegration = new apigateway.LambdaIntegration(props.ordersHandler)

    const ordersResource = api.root.addResource('orders')

    ordersResource.addMethod("GET", orderIntegration)
// validação da requisição para criação dos pedidos
// vamos validar o body, para que caso um item esteja faltando, minha função não seja invocada atoa
    const orderRequestValidator = new apigateway.RequestValidator(this, "OrderRequestValidator", {
      restApi: api,
      requestValidatorName: "Order request validator",
      validateRequestBody: true
    })

    const orderModel = new apigateway.Model(this, "OrderModel", {
      modelName: "OrderModel",
      restApi: api,
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          email: {
            type: apigateway.JsonSchemaType.STRING
          },
          productIds: {
            type: apigateway.JsonSchemaType.ARRAY,
            minItems: 1,
            items: {
              type: apigateway.JsonSchemaType.STRING
            }
          },
          payment: {
            type: apigateway.JsonSchemaType.STRING,
            enum: ["CASH", "DEBIT_CARD", "CREDIT_CARD"]
          },
        },
        required: [
          "email",
          "productIds",
          "payment"
        ]
      }
    })
    ordersResource.addMethod("POST", orderIntegration,  {
      requestValidator: orderRequestValidator,
      //aqui eu vou dizer o que eu quero que venha no meu body
      //aqui eu ensino o apigateway a olhar para minha requisição e ver o que precisa ter la dentro
      requestModels: {
        "application/json" : orderModel
      }
    })

    const orderDeleteValidator = new apigateway.RequestValidator(this, "OrderDeletionValidator", {
      restApi: api,
      requestValidatorName: "OrderDeleteValidator",
      validateRequestParameters: true
    })
// o meus options são uma demonstração para o apigateway que esses itens são obrigatórios
    ordersResource.addMethod("DELETE", orderIntegration, {
      requestParameters: {
        'method.request.querystring.email': true,
        'method.request.querystring.orderId': true
      }, 
      // aqui temos um validador que vai explicar para o apigateway como ele vai fazer essa validação
      requestValidator: orderDeleteValidator
    })
  }
}