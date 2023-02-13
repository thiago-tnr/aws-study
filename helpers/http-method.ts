import { APIGatewayProxyResult } from 'aws-lambda'

export const success  = (status: number, message: any): APIGatewayProxyResult => {
  return {
    statusCode: status,
    body: JSON.stringify(message)
  }
}

export const invalidMethod  = (status: number, message: any): APIGatewayProxyResult => {
  return {
    statusCode: status,
    body: JSON.stringify(message)
  }
}
export const requestError  = (status: number, message: any): APIGatewayProxyResult => {
  return {
    statusCode: status,
    body: JSON.stringify(message)
  }
}