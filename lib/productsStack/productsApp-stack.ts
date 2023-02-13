import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { handler } from 'lambda/products/http/productsAdminFunction';
// essa classe vai representar uma stack que vai armazenar as tres funções lambda e a tabela
// products admin, products events, products fetch e products (table)
//  (nessas interfaces das minhas funções lambda) 
// todos os recursos que são da stack de produtos ficarão nessa stack
// os parametros do meu construtor tem que sempre obedecer essa ordem
// o scope que é onde a stack está inserida que sera um cdk.App, que será inserido no momento que eu instanciar minha stack no lib, dessa forma
// o escopo será todo o projeto do cdk
// um id que é o nome da stack
// as props

// minha classe vai receber como parametro a minha tabela de eventos, pois teremos ações que serão armazenadas dentro da tabela de eventos
interface ProductsAppStackProps extends cdk.StackProps {
  eventsDdb: dynamodb.Table
}
export default class ProductsAppStack extends cdk.Stack{
  // aqui eu vou precisar criar um atributo de classe que vai representar a minha primeira função, que vai ler os dados no banco de dados
  // isso será necessário porque vamos criar depois uma outra stack que vai apontar o api gateway que vai precisar ter como parametro essa função
  readonly productsFetchHandler: lambdaNodeJs.NodejsFunction
  readonly productsAdminHandler: lambdaNodeJs.NodejsFunction
  readonly productsDdb: dynamodb.Table
  
  constructor(scope: Construct, id: string, props: ProductsAppStackProps) {
    super(scope, id, props)
    // aqui vamos criar a interface da nossa tabela no dynamodb
    this.productsDdb = new dynamodb.Table(this, 'ProductsDdb', {
      tableName: 'products',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      //atributo essencial para se criar a tabela
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    })

    // aqui vamos criar a parte dos layers de produto, na verdade, vamos trazer as informações para essa stack
    // para isso vamos regatar o parametro do ssm, é essa forma que nosso layer é importado para ser usado
    // o nome do parametro no nosso escopo, tem que ser exatemete o mesmo nome que colocarmos ao criar o ssm 
    const productLayerArn = ssm.StringParameter.valueForStringParameter(this, 'ProductLayerVersionArn')
    // após regastar o meu arm e suas propriedades dentro do meu ssm, eu instancio o meu layer
    const productLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'ProductLayerVersionArn', productLayerArn)
    // products events layer
    const productEventsLayerArn = ssm.StringParameter.valueForStringParameter(this, 'ProductEventsLayerVersionArn')
    const productEventLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'ProductEventsLayerVersionArn', productEventsLayerArn)
    
    const productsEventsHandler = new lambdaNodeJs.NodejsFunction(this, 'ProductsEventsFunction', {
      functionName: 'ProductsEventsFunction',
      entry: 'lambda/products/events/productsEventsFunction.ts',
      handler: 'handler',
      memorySize: 128,
      timeout: cdk.Duration.seconds(2),
      bundling: {
        minify: true,
        sourceMap: false
      },
      environment: {
        EVENTS_DDB: props.eventsDdb.tableName
      },
      layers: [productEventLayer],
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
    })
    props.eventsDdb.grantReadData(productsEventsHandler)
    
    // aqui irei criar uma função lambda com esse meu atributo de classe ↓
    this.productsFetchHandler = new lambdaNodeJs.NodejsFunction(this, 'ProductsFetchFunction', {
      functionName: 'ProductsFetchFunction',
      // ponto de entrada da minha função, ou seja, quando recebe um metódo de invocação, um metodo espeficio será invocado ↓
      entry: 'lambda/products/http/productsFetchFunction.ts',
      // metodo que sera invocado quando eu receber um evento para executar algo na função ↓
      handler: 'handler',
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      bundling: {
        minify: true,
        sourceMap: false
      },
      // essa variael de ambiente mostra para a minha função lambda que
      // ela vai conhecer o nome dessa tabela, aqui eu mostro qual tabela ela deve procurar
      environment: {
        PRODUCTS_DDB: this.productsDdb.tableName,
      }, 
      layers: [productLayer],
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
    })
    // vou dar permissão para minha função de produto acessar a tabela do dynamo para fazer leitura de produtos
    this.productsDdb.grantReadData(this.productsFetchHandler)

    this.productsAdminHandler = new lambdaNodeJs.NodejsFunction(this,'ProductsAdminFunction', {
      functionName: 'ProductsAdminFunction',
      entry: 'lambda/products/http/productsAdminFunction.ts',
      handler: 'handler',
      memorySize: 128, 
      timeout: cdk.Duration.seconds(5),
      bundling: {
        minify: true, 
        sourceMap: false
      },
      environment: {
        PRODUCTS_DDB: this.productsDdb.tableName,
        PRODUCTS_EVENTS_FUNCTION_NAME: productsEventsHandler.functionName
      }, 
      layers: [productLayer, productEventLayer],
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
    })
    this.productsDdb.grantWriteData(this.productsAdminHandler)
    productsEventsHandler.grantInvoke(this.productsAdminHandler)
    // como essa é uma função de administração, que terá metódos post e put
    // eu darei a ela a permissão de escrever na minha tabela
  }
}