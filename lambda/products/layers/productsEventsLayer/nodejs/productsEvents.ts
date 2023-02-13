//aqui eu vou indicar quais eventos eu vou ter entre a função de adm e a função de eventos
// eventos esse que serão salvos na minha tabela de eventos

export enum ProductEventType {
  CREATED = "PRODUCT_CREATED",
  UPDATED = "PRODUCT_UPDATED",
  DELETED = "PRODUCT_DELETED"
}

export default interface ProductEvent {
  requestId: string;
  eventType: ProductEventType;
  productId: string;
  productCode: string;
  productPrice: string;
  email:string;
}
