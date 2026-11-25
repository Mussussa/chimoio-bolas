export function storeProductHref(storeSlug: string, productId: string): string {
  return `/lojas/${encodeURIComponent(storeSlug)}#produto-${encodeURIComponent(productId)}`;
}

export function providerServiceHref(providerId: string, serviceId: string): string {
  return `/prestadores/${encodeURIComponent(providerId)}#servico-${encodeURIComponent(serviceId)}`;
}
