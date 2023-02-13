import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { invalidMethod, requestError, success } from '../../../helpers/http-method';
import ProductRepository, { Product } from '/opt/nodejs/productsLayer';
import { DynamoDB, Lambda } from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import ProductEvent, { ProductEventType } from '/opt/nodejs/productsEventsLayer';
// pegando os traços do xray
AWSXRay.captureAWS(require('aws-sdk'))

// aqui eu pego o nome da minha tabela que eu passei como variavel de ambiente dentro da criação do meu lambda
const productsDdb = process.env.PRODUCTS_DDB!
const productsEventsFunctionName = process.env.PRODUCTS_EVENTS_FUNCTION_NAME!
const ddbClient = new DynamoDB.DocumentClient()
// vamos riar um cliente para invocar tbm um outra função llamda, que no caso será nosso lambda de eventos
// o nome da minha função a ser invocada está a cima em productsEventsFunctionName
const lambdaClient = new Lambda()
const productRepository = new ProductRepository(ddbClient, productsDdb)

export async function handler(event:APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  const resource = event.resource
  const httpMethod = event.httpMethod
  const email = 'tnr.rocha@gmail.com'
    // identifica unicamente a execução da minha função lambda
    const lambdaRequest = context.awsRequestId 
    // identifica unicamente a invocação do meu apigateway
    const apiGatewayRequest = event.requestContext.requestId
    console.log(`Api Gateway RequestId - ${apiGatewayRequest} Lambda Request Id - ${lambdaRequest}`);
// aqui eu estou setando as rotas dentro do meu lambda, sendo que elas ja foram indicadas dentro do meu apigateway interface que é o arquivo ecommerceApi 
  if (resource === '/products') {
    if ( httpMethod === 'POST') {
      const product = JSON.parse(event.body!) as Product
      console.log('POST - admin function');
      const createProduct = await productRepository.create(product)
      const eventRequest = await sendProductEvent(createProduct, ProductEventType.CREATED, email, lambdaRequest)
      console.log(eventRequest);
      
      return success (201, createProduct)
    }
  }

  if ( resource === '/products/{id}') {
    const productId = event.pathParameters!.id as string
    if ( httpMethod === 'PUT') {
      const product = JSON.parse(event.body!) as Product
      console.log(`ID: ${productId} Update with success`)
      try {
        const productUpdated = await productRepository.updateProduct(productId, product)
        const eventRequest = await sendProductEvent(productUpdated, ProductEventType.UPDATED, email, lambdaRequest)
        console.log(eventRequest);

        return success (200, productUpdated)
      } catch (error) {
        return requestError(404, 'Product Not Found')
      }

    } else if ( httpMethod === 'DELETE') {
      try {

        const deleteProduct = await productRepository.delete(productId)
        console.log(`ID: ${productId} Deleted with success`)

        const eventRequest = await sendProductEvent(deleteProduct, ProductEventType.DELETED, email, lambdaRequest)
        console.log(eventRequest);
        
        return success (200, deleteProduct)
      } catch (error) {
        console.error((<Error>error).message);
        return requestError(404,(<Error>error).message)
      }
    }
  }
  return invalidMethod(400, "Invalid method")
}

// para poder invocar a função lambda, de eventos, que é ProductEvent, vou fazer esse metódo
// os paremetros são: o produto que foi alterado no caso que sofru qualquer umas das ações descritas no meu event type
// o tipo do meu evento
// o email de quem fez essa alteração
// o id da requisição do lambda
function sendProductEvent(product: Product, eventType: ProductEventType, email: string, lambdaRequestId: string) {
  // aqui vamos criar o evento com os dados que serão passados
  const event: ProductEvent = {
    email: email,
    eventType: eventType,
    productCode: product.code,
    productId: product.id,
    productPrice: product.price.toString(),
    requestId: lambdaRequestId
  }
// aqui vamos invocar a função lambda passando esses parametros
  return lambdaClient.invoke({
    FunctionName: productsEventsFunctionName,
    Payload: JSON.stringify(event),
    InvocationType: "Event"
  }).promise()
} 