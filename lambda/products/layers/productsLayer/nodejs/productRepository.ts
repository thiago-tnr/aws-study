import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { v4 as uuid } from 'uuid';
// aqui ficara todo o código do meu layer
// o configuração de chamada do meu layer a o arquivo que ele invocará ou ser chamado
// sera indicaido no meu tsconfig


// criaremos um modelo que vai representar como o meu produto será armazenado na tabela no dynamoDb
export interface Product {
  id: string;
  productName: string;
  code: string;
  price: number;
  model: string;
  productUrl: string;
}

// criando um repositório que vai reprensetar as ações compartilhadas a serem usadas no dyanmo

export default class ProductRepository {
  // temos que ter um cliente que vai poder acessar o Ddb
  // esse clientes são criados dentro das stacks que invocarão esse layer e passados aqui, para que ele de fato consiga acessar a tabela
  // ele é criado dentro da função lamba, porque cada instancia dela tem seu cliente
  // então teremos dois parametros, o client que quer acessar minha tabela
  // e o nome da tabela

  constructor(private ddbClient: DocumentClient, private productsDbb: string) { }
  // as funções de busca de dados no banco de dados sempre serão assincronas

  async getAllProducts(): Promise<Product[]> {
    const products = await this.ddbClient.scan({
      TableName: this.productsDbb,
    }).promise()
    // todos os dados que vem de retorno, sempre vem dentro de items
    // aqui eu faço um cast para transformar no tipo de dado que eu quero retornar
    // nesse caso o items são porque usamos o scan
    return products.Items as Product[]
  }

  async getOneById(productId: string): Promise<Product> {
    const product = await this.ddbClient.get({
      TableName: this.productsDbb,
      Key: {
        id: productId
      }
    }).promise()
    if (!product.Item) {
      throw new Error('Product not found')
    }
    return product.Item as Product
  }

  async getProductsByIds(productIds: string[]): Promise<Product[]> {
    const keys: { id: string }[] = []

    productIds.forEach((productId) => {
      keys.push ({
        id: productId
      })
    })
    const data = await this.ddbClient.batchGet({
      RequestItems: {
        [this.productsDbb]: {
          Keys: keys
        }
      }
    }).promise()
    return data.Responses![this.productsDbb] as Product[]
  }

  async create(product: Product): Promise<Product> {
    product.id = uuid()
    await this.ddbClient.put({
      TableName: this.productsDbb,
      Item: product
    }).promise()
    return product
  }

  async delete(productId: string): Promise<Product> {
    const product = await this.ddbClient.delete({
      TableName: this.productsDbb,
      Key: {
        id: productId
      },
      // retorno os valores do produto deletado, para mostrar que de fato foi encontrado e apagado
      ReturnValues: "ALL_OLD"
    }).promise()
    if (!product.Attributes) {
      throw new Error('Product not found')
    }
    return product.Attributes as Product
  }

  async updateProduct(productId: string, product: Product): Promise<Product> {
    const data = await this.ddbClient.update({
      TableName: this.productsDbb,
      Key: {
        id: productId
      },
      UpdateExpression: "set productName = :n, code = :c, price = :p, model = :m, productUrl = :u",
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "UPDATED_NEW",
      ExpressionAttributeValues: {
        ":n": product.productName,
        ":c": product.code,
        ":p": product.price,
        ":m": product.model,
        ":u": product.productUrl
      }
    }).promise()
    data.Attributes!.id = productId
    return data.Attributes as Product
  }
}