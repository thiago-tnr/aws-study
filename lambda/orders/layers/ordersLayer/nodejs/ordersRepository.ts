import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { v4 as uuid } from 'uuid'

export interface OrderProduct {
  code: string,
  price: number,
}

// modelo de como o pedido será guardado no dynamo
export interface Order {
  pk: string,
  sk?: string,
  createdAt?: number,
  shipping: {
    type: "URGENT" | "ECONOMIC",
    carrier: "CORREIOS" | "FEDEX"
  },
  billing: {
    payment: "CASH" | "DEBIT_CARD" | "CREDIT_CARD",
    totalPrice: number
  },
  products: OrderProduct[]
}

export class ORderRepository {
  // aqui temos quem vai acesaar nosso banco de dados e o nome da minha tabela que virá por variavel de ambiente
  // pois ela foi definida na interface da minha stack
  constructor(private dbClient: DocumentClient, private ordersDb: string) {}
  async createOrder(order:Order): Promise<Order> {
    order.sk = uuid()
    order.createdAt = Date.now()
    await this.dbClient.put({
      TableName: this.ordersDb,
      Item: order
    }).promise()

    return order
  }

  async getAllOrders(): Promise<Order[]> {
    const data = await this.dbClient.scan({
      TableName: this.ordersDb
    }).promise()
    return data.Items as Order[]
  }

  // aqui vamos fazer uma pesquisa com a chave primaria sendo o email
  // essa pk como email será setada na hora de invocar o post
  async getOrdersByEmail(email:string): Promise<Order[]> {
    const data = await this.dbClient.query({
      TableName: this.ordersDb,
      KeyConditionExpression: "pk = :email",
      ExpressionAttributeValues: {
        ":email": email
      }
    }).promise()
    return data.Items as Order[]
  }
  async getOrder(email:string, orderId: string): Promise<Order> {
    const data = await this.dbClient.get({
      TableName: this.ordersDb,
      Key: {
        pk: email,
        sk: orderId
      }
    }).promise()
    if (!data.Item) {
      throw new Error('Order not found')
    }
    return data.Item as Order

  }
  async deleteOrder(email:string, orderId: string): Promise<Order> {
    const data = await this.dbClient.delete({
      TableName: this.ordersDb,
      Key: {
        pk: email,
        sk: orderId
      },
      ReturnValues: "ALL_OLD"
    }).promise()
    if (!data.Attributes) {
      throw new Error('Order not found')
    }
    return data.Attributes as Order
  }


}