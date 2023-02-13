import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { invalidMethod, requestError, success } from '../../../helpers/http-method';
import ProductRepository from '/opt/nodejs/productsLayer';
import { DynamoDB } from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'

// pegando os traços do xray
AWSXRay.captureAWS(require('aws-sdk'))
// aqui eu pego o nome da minha tabela que eu passei como variavel de ambiente dentro da criação do meu lambda
const productsDdb = process.env.PRODUCTS_DDB!
const ddbClient = new DynamoDB.DocumentClient()

const productRepository = new ProductRepository(ddbClient, productsDdb)

// aqui nos temos o metodo handler da nossa função handler que é indicada ns nossa stack, dentro da interface do lambda
// quando eu crio uma função lambda ela tem dois parametros que são o event e o context
// o event é do tipo apigateway porque minha função será invocado pelo apigateway, ou seja,
// o evento que virá do meu user, através de um endpoint, passará antes, pelo apigateway e ele vai chamar o meu lambda
// vale lembrar que o event será sempre do tipo do evento que chamar o lambda
// o context mostra quando e de que jeito a minha função está sendo invocada

export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  const resource = event.resource
  const httpMethod = event.httpMethod

  // identifica unicamente a execução da minha função lambda
  const lambdaRequest = context.awsRequestId
  // identifica unicamente a invocação do meu apigateway
  const apiGatewayRequest = event.requestContext.requestId

  console.log(`Api Gateway RequestId - ${apiGatewayRequest} Lambda Request Id - ${lambdaRequest}`);

  if (resource === '/products') {
    if (httpMethod === 'GET') {
      console.log('GET/products');
      const getAllProducts = await productRepository.getAllProducts()
      return success(200, getAllProducts)
    }
  } else if (resource === '/products/{id}') {
    // aqui estou pegando o id que vem la no meu apigateway - do meu add resource
    const productId = event.pathParameters!.id as string
    if (httpMethod === 'GET') {
      console.log(`ID: ${productId} GET with success`);
      // como o produto pode não ser encontrado, e eu lançei um throw no meu respository, eu preciso tratar isso com um try catch
      try {
        const getProduct = await productRepository.getOneById(productId)
        return success(200, getProduct)
      } catch (error) {
        console.error((<Error>error).message);
        return requestError(404, (<Error>error).message)
      }
    }
  }
  return invalidMethod(400, "Invalid method")
}