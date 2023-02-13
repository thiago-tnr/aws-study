#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import ProductsAppStack from '../lib/productsStack/productsApp-stack';
import ECommerceApiStack from '../lib/http/apiGateway/ecommerceApi.stack';
import ProductsLayerStack from '../lib/lambdaLayer/productLayerStack';
import EvensDdbStack from '../lib/eventsStack/eventsDdbStack';
import { OrdersAppLayerStack } from '../lib/lambdaLayer/ordersStack/ordersAppLayers-stack';
import { OrdersAppStack } from '../lib/orderStack/ordersApp-stack';

const app = new cdk.App();
// conta para deplopy dos recursos
const env: cdk.Environment = {
  account: '890908582945',
  region: 'us-east-1'
}

// tags de identificação que são opicionais
const tags = {
  cost: 'Ecommerce2',
  team: 'Study2'
}

// aqui vamos criar as stack que acabamos de fazer e suas respectivas integrações
// a stack que sera criada primeiro será minha stack de products
// pois ela será o parametro da stack ecommerceapi que é justamente a função que precisa dela
// pois ela mapeia o meu apigatey e passa através do lambda no metodo handler
// nesse caso a productsFetchHandler da minha stack productsApp-stack será passada como parametro para
// productsFetchHandler ecommercerApi

// aqui vamos instaciar a nossa classe do layer
const productsLayerStack = new ProductsLayerStack(app, 'ProductsLayerSack', {
  tags: tags,
  env: env
})
const eventsDdbStack = new EvensDdbStack(app, 'EventsDdbStack', {
  tags: tags,
  env: env
})

//vamos aqui de fato, criar no stack na aws, tudo o que foi feito até aqui foi a interface da stack
// os parametros, serão os mesmos das definições da interface da stack, que são o scopo, id (nome da stack na aws), e as propiedades  
const productsAppStack = new ProductsAppStack(app, 'ProductsApp',{
  eventsDdb: eventsDdbStack.table,
  tags: tags,
  env: env
})
productsAppStack.addDependency(productsLayerStack)
productsAppStack.addDependency(eventsDdbStack)

const ordersAppLayerStack = new OrdersAppLayerStack(app, "OrderLayerStack", {
  tags: tags,
  env: env
})

const orderAppStack = new OrdersAppStack(app, 'OrdersApp', {
  tags: tags,
  env: env,
  productsDdb: productsAppStack.productsDdb,
  eventsDdb: eventsDdbStack.table
})

orderAppStack.addDependency(productsAppStack)
orderAppStack.addDependency(ordersAppLayerStack)
orderAppStack.addDependency(eventsDdbStack)

// aqui eu estou dizendo que o productsfetchhandler que a minha ecommercestack vai receber como parametro
// é a minha variavel de letitura do productsappstack (readyonly productsFetchHandler)
const eCommerceApiStack = new ECommerceApiStack(app, 'ECommerceApi', {
  productsFetchHandler: productsAppStack.productsFetchHandler,
  productsAdminHandler: productsAppStack.productsAdminHandler,
  ordersHandler: orderAppStack.ordersHandler,
  tags: tags,
  env: env
})
// sempre quanto temos uma stack que depende da outra é bom adicionar a dependencia(de execução) para não ter erro na criação da stack
eCommerceApiStack.addDependency(productsAppStack)
eCommerceApiStack.addDependency(orderAppStack)