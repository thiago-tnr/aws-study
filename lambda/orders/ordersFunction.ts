import { DynamoDB } from "aws-sdk"
import * as AWSXRay from "aws-xray-sdk"
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda"
import { Order, ORderRepository } from '/opt/nodejs/ordersLayer'
import ProductRepository, { Product } from '/opt/nodejs/productsLayer';
import { CarrierType, OrderProductResponse, OrderRequest, OrderResponse, PaymentType, ShippingType } from '/opt/nodejs/ordersApiLayer';

AWSXRay.captureAWS(require("aws-sdk"))

const ordersDdb = process.env.ORDERS_DDB!
const productsDdb = process.env.PRODUCTS_DDB!
//const orderEventsTopicArn = process.env.ORDER_EVENTS_TOPIC_ARN!

const ddbClient = new DynamoDB.DocumentClient()

const orderRepository = new ORderRepository(ddbClient, ordersDdb)
const productRepository = new ProductRepository(ddbClient, productsDdb)

export async function handler(event: APIGatewayProxyEvent, context: Context):
  Promise<APIGatewayProxyResult> {

  const method = event.httpMethod
  const apiRequestId = event.requestContext.requestId
  const lambdaRequestId = context.awsRequestId

  console.log(`API Gateway RequestId: ${apiRequestId} - LambdaRequestId :${lambdaRequestId}`)
// aqui eu não coloqueri o resource pois ja está setado no apigateway, porque tomos os meus GET serão feitos no mesmo endpoint
// e esse arquivo esta sendo setado no meu apigetway (aqui temos o handler que vem da interface da minha lambda que é chamada no gateway)
  if (method === 'GET') {
    // o tratamento do meu metodo get é feito aqui, pois no meu apigateway eu não coloquei nenhum parameter como obrigação 
    if (event.queryStringParameters) {
      const email = event.queryStringParameters!.email
      const orderId = event.queryStringParameters!.orderId
      if (email) {
        if (orderId) {
          //Get one order from an user
          try {
            const order = await orderRepository.getOrder(email, orderId)
            return {
              statusCode: 200,
              body: JSON.stringify(convertToOrderResponse(order))
            }
          } catch (error) {
            console.log((<Error>error).message)
            return {
              statusCode: 404,
              body: (<Error>error).message
            }
          }
        } else {
          //Get all orders from an user
          const orders = await orderRepository.getOrdersByEmail(email)
          return {
            statusCode: 200,
            body: JSON.stringify(orders.map(convertToOrderResponse))
          }
        }
      }
    } else {
      //Get all orders
      const orders = await orderRepository.getAllOrders()
      return {
        statusCode: 200,
        body: JSON.stringify(orders.map(convertToOrderResponse))
      }
    }
  } else if (method === 'POST') {
    console.log('POST /orders')
    const orderRequest = JSON.parse(event.body!) as OrderRequest
    const products = await productRepository.getProductsByIds(orderRequest.productIds)
    if (products.length === orderRequest.productIds.length) {
      const order = buildOrder(orderRequest, products)
      const orderCreated = await orderRepository.createOrder(order)

      // const eventResult = await sendOrderEvent(orderCreated, OrderEventsType.CREATED, lambdaRequestId)
      // console.log(
      //   `Order created event sent - OrderId: ${orderCreated.sk} 
      //       - MessageId: ${eventResult.MessageId}`
      // )
      return {
        statusCode: 201,
        body: JSON.stringify(convertToOrderResponse(orderCreated))
      }
    } else {
      return {
        statusCode: 404,
        body: "Some product was not found"
      }
    }
  } else if (method === 'DELETE') {
    console.log('DELETE /orders')
    const email = event.queryStringParameters!.email!
    const orderId = event.queryStringParameters!.orderId!

    try {
      const orderDelete = await orderRepository.deleteOrder(email, orderId)

      // const eventResult = await sendOrderEvent(orderDelete, OrderEventsType.DELETED, lambdaRequestId)
      // console.log(
      //   `Order deleted event sent - OrderId: ${orderDelete.sk} 
      //       - MessageId: ${eventResult.MessageId}`
      // )

      return {
        statusCode: 200,
        body: JSON.stringify(convertToOrderResponse(orderDelete))
      }
    } catch (error) {
      console.log((<Error>error).message)
      return {
        statusCode: 404,
        body: (<Error>error).message
      }
    }
  }

  return {
    statusCode: 400,
    body: 'Bad request'
  }
}

// function sendOrderEvent(order: Order, eventType: OrderEventsType, lambdaRequestId: string) {
//   const productCodes: string[] = []
//   order.products.forEach((product) => {
//     productCodes.push(product.code)
//   })
//   const orderEvent: OrderEvent = {
//     email: order.pk,
//     orderId: order.sk!,
//     billing: order.billing,
//     shipping: order.shipping,
//     requestId: lambdaRequestId,
//     productCodes: productCodes
//   }

//   const envelope: Envelope = {
//     eventType: eventType,
//     data: JSON.stringify(orderEvent)
//   }

//   return snsClient.publish({
//     TopicArn: orderEventsTopicArn,
//     Message: JSON.stringify(envelope),
//     MessageAttributes: {
//       eventType: {
//         DataType: "String",
//         StringValue: eventType
//       }
//     }
//   }).promise()
// }
// aqui vamos converter um pedido que vem de uma tabela de dynamo para um response
function convertToOrderResponse(order: Order): OrderResponse {
  const orderProducts: OrderProductResponse[] = []
  order.products.forEach((product) => {
    orderProducts.push({
      code: product.code,
      price: product.price
    })
  })
  const orderResponse: OrderResponse = {
    email: order.pk,
    id: order.sk!,
    createdAt: order.createdAt!,
    products: orderProducts,
    billing: {
      payment: order.billing.payment as PaymentType,
      totalPrice: order.billing.totalPrice
    },
    shipping: {
      type: order.shipping.type as ShippingType,
      carrier: order.shipping.carrier as CarrierType
    }
  }

  return orderResponse
}
// aqui eu estou pegando os dados que vai do meu request e gerando uma order
// fazemos a conversão da requisição que vem da minha api para o que precisa ser salvo no banco de dados
function buildOrder(orderRequest: OrderRequest, products: Product[]): Order {
  const orderProducts: OrderProductResponse[] = [];
  let totalPrice = 0;
  console.log(products)
//aqui vamos interar sobre a lista de produtos ja consultada no banco
  products.forEach((product) => {
    totalPrice += product.price;
    orderProducts.push({
      code: product.code,
      price: product.price
    });
  });

  const order: Order = {
    pk: orderRequest.email,
    billing: {
      payment: orderRequest.payment,
      totalPrice: totalPrice
    },
    shipping: {
      type: orderRequest.shipping.type,
      carrier: orderRequest.shipping.carrier
    },
    products: orderProducts
  }
  return order
}

