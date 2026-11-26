# Rascunho: destaques pagos

> Documento de planeamento. A funcionalidade de destaque pago ainda não está implementada nem altera a ordenação atual da plataforma.

## Objetivo futuro

Permitir que lojas e prestadores locais adquiram visibilidade adicional para anúncios, com identificação clara de conteúdo patrocinado.

## Ordem de apresentação pretendida

1. **Destaques pagos:** anúncios ativos e elegíveis, identificados visualmente como patrocinados.
2. **Ofertas e serviços locais:** ordenados pela distância ao bairro escolhido ou à localização GPS autorizada pelo utilizador, do mais próximo para o mais distante.

Quando não houver uma localização válida para um anúncio, ele deve aparecer depois dos anúncios com distância calculável, sem desaparecer do catálogo.

## Decisões pendentes antes da implementação

- Definir como a taxa é cobrada, a duração do destaque e o processo de renovação.
- Definir limites de quantidade, elegibilidade e regras de moderação.
- Definir como distinguir anúncios patrocinados na interface e em páginas partilhadas.
- Definir a fonte da localização, as regras de distância e o comportamento para anúncios sem coordenadas.
- Definir relatórios, cancelamentos, reembolsos e auditoria administrativa.
- Desenhar o modelo de dados, endpoints, permissões e integração de pagamento antes de ativar a funcionalidade.

## Regras de transparência

- O destaque deve ser rotulado como **Patrocinado** ou **Destaque pago**.
- O pagamento não deve representar uma verificação de identidade nem uma garantia de qualidade ou de transação.
- Anúncios pagos continuam sujeitos às mesmas regras de publicação e segurança que os restantes anúncios.
