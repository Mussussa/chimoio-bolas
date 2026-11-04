# Chimoio Boladas

Marketplace local, gratuito e aberto de produtos e serviços em Chimoio. O código da aplicação está em TypeScript: React/Vite/PWA no cliente, Express modular no backend e Sequelize com PostgreSQL. Meticais (MT) são usados apenas nos preços definidos livremente pelos utilizadores para produtos e serviços e nas propostas de negociação. A plataforma não cobra, não simula pagamentos e não implementa escrow.

## Arquitectura

- **Leituras públicas:** o navegador usa `@supabase/supabase-js` para consultar lojas, produtos, prestadores e serviços directamente; coordenadas e marcadores do mapa vêm das mesmas leituras. A migration também disponibiliza a view segura `public_reviews`. As políticas RLS limitam as listagens a dados elegíveis; o frontend nunca recebe a chave `service_role`.
- **Escritas críticas:** Express autentica o JWT Supabase e obtém a função do utilizador na tabela `users`. Criação/publicação de serviços, mensagens, propostas e conclusão de negociação são executados exclusivamente no backend.
- **Persistência:** Sequelize liga-se directamente ao PostgreSQL local do Supabase. A migration SQL cria o esquema, índices, enumerações, checks e políticas RLS. Não usar `sequelize.sync()` para alterar o esquema.
- **Campos sensíveis:** `users.phone`, `negotiations.client_proof_file` e `negotiations.provider_proof_file` são cifrados com AES-256-GCM no hook `beforeValidate` e decifrados no backend após leitura. A chave de 32 bytes é configurada fora do repositório.

```text
frontend/src/
  App.tsx
  lib/{api,supabase}.ts
backend/src/
  app.ts                 # aplicação Express
  server.ts              # arranque e ligação Sequelize
  config/                # PostgreSQL, AES-256-GCM e Winston
  models/
    User.ts, Store.ts, Product.ts
    ServiceProvider.ts, Service.ts
    Negotiation.ts, Message.ts, Review.ts
    associations.ts       # relações entre modelos
    encryptedFields.ts    # hooks de cifragem/decifragem
    modelOptions.ts       # opções Sequelize partilhadas
    types.ts              # tipos de domínio dos modelos
    index.ts              # inicialização e exports compatíveis
  middleware/            # Morgan, erros globais, autenticação, autorização e Joi
  http/                  # respostas JSON padronizadas
  routes/                # declaração dos endpoints e composição da API
  controllers/           # lógica HTTP e de negócio de cada domínio
  validation/            # schemas Joi para corpos e parâmetros das rotas
  domain/                # regras de validação e testes unitários
backend/logs/             # error.log e combined.log (gerados, ignorados pelo Git)
supabase/
  config.toml
  migrations/             # SQL, schema e políticas RLS
```

## Regras implementadas

- Todos podem criar conta, registar uma loja ou perfil de prestador e utilizar as funcionalidades sem subscrição, taxa, quota ou limite temporal. Prestadores publicam serviços livremente; cada serviço recebe `published: true` e `internal_platform_service: true` no servidor.
- Não existem campanhas, lotes de anúncios, pacotes comerciais, subscrições nem pagamentos simulados.
- Apenas cliente pode iniciar negociação. As mensagens e propostas são visíveis aos participantes; uma proposta positiva actualiza `agreed_price`, e só a contraparte pode aceitar/rejeitar. O cliente pode marcar como concluída uma negociação aceite. Não há escrow nem movimentação de dinheiro pela plataforma.
- Os preços de produtos e serviços são definidos pelos próprios utilizadores. A plataforma valida e apresenta os valores em MT sem cobrar comissões ou pagamentos.
- Avaliações são de cliente, de 1 a 5, com uma avaliação por pessoa e alvo. A base também aplica unicidade e validação de intervalo.
- `admin` não pode ser atribuído por metadados do cliente nem por rota pública; a promoção inicial é feita manualmente na base de dados.

## Endpoints críticos

| Método e rota | Regra |
| --- | --- |
| `POST /api/stores/register` | Cria a loja do utilizador autenticado; começa não verificada. |
| `POST /api/products` | Cria produto na loja própria. |
| `PATCH /api/products/:id/price` | Altera preço apenas para o proprietário, com validação monetária. |
| `POST /api/providers/register` | Cria gratuitamente o perfil de prestador sem subscrição ou quota. |
| `POST /api/services` | Publica serviço do próprio prestador com `internal_platform_service=true`. |
| `POST /api/negotiations`, `POST /api/negotiations/:id/messages` | Cria negociação e mensagens/propostas apenas para participantes. |
| `POST /api/negotiations/:id/proposals/:messageId/respond` | Apenas a contraparte pode aceitar/rejeitar a proposta mais recente. |
| `POST /api/negotiations/:id/complete` | O cliente confirma a conclusão de uma negociação aceite, sem pagamento ou escrow. |
| `POST /api/admin/stores/:id/verify` | Verificação administrativa de lojas. |

Para criar o primeiro administrador local, cria uma conta pela interface, inicia sessão uma vez e actualiza manualmente a role dessa conta no SQL Editor do Supabase:

```sql
update public.users set role = 'admin' where email = 'admin@example.local';
```

## Executar localmente

Requisitos: Node.js 22.12+, npm, Docker e Supabase CLI.

1. Inicia o Supabase local (a CLI usa Docker):

   ```sh
   npx supabase start
   npx supabase db reset
   npx supabase status
   ```

   As migrations criam o esquema aberto. `db reset` recria a base local; a migration `20261104120000_free_open_marketplace.sql` remove campanhas/lotes, colunas de subscrição e estado de escrow da versão anterior. Em bases existentes, exporta/guarda os dados de campanhas que precises antes de aplicar essa migration, pois esses dados são apagados. Guarda a URL e a chave `anon` mostradas por `supabase status`; nunca uses a `service_role` no frontend.

2. Cria as configurações ignoradas pelo Git:

   ```sh
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   openssl rand -base64 32
   ```

   Coloca o resultado de `openssl` em `FIELD_ENCRYPTION_KEY` no `backend/.env`; preenche `SUPABASE_ANON_KEY` e `VITE_SUPABASE_ANON_KEY` com a chave pública `anon`. A ligação local padrão do Sequelize é `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

3. Instala e arranca, em terminais separados:

   ```sh
   cd backend && npm install && npm run dev
   cd frontend && npm install && npm run dev
   ```

   Frontend: `http://localhost:5173`; API: `http://localhost:3001`; Supabase Studio: `http://localhost:54323`.

O service worker TypeScript é compilado para `dist/sw.js`; guarda a shell e os recursos estáticos já visitados. Respostas da API, dados autenticados e pedidos Supabase não são guardados offline.

## Verificação

```sh
cd backend && npm test && npm run build
cd frontend && npm test && npm run build
```

Os testes unitários cobrem cifragem, regras do marketplace, validação Joi e ausência de campos comerciais pagos; os testes Express verificam healthcheck, autenticação e que as rotas removidas de campanhas, subscrições e escrow não existem. Com Supabase local em execução, `cd backend && npm run test:integration` confirma as oito tabelas, RLS e ausência do esquema comercial removido.

## Logs, erros e auditoria

- Winston escreve eventos JSON em `backend/logs/combined.log` e erros com stack trace em `backend/logs/error.log`; em desenvolvimento, os eventos também aparecem no terminal. `LOG_LEVEL` pode ajustar o nível mínimo.
- Morgan regista método, padrão da rota (sem query string), status HTTP, duração e IP.
- As respostas de sucesso usam `{ success: true, message, data }`; erros usam `{ success: false, message, error_code }`. O cliente HTTP frontend desempacota `data` e apresenta `message` em falhas.
- Eventos auditados incluem mensagens, propostas, criação de serviços e conclusão de negociações. Os metadados guardam IDs e tipo/estado da acção, sem conteúdo de mensagens, telefones ou referências de comprovativos.
- Joi valida e normaliza os corpos e parâmetros das operações de escrita antes de chamar os controllers. Erros de entrada devolvem HTTP 400 no envelope padrão, com mensagens amigáveis em português; campos desconhecidos são rejeitados.
- Cada ficheiro em `routes/` associa caminhos e middleware às funções de `controllers/`; `routes/index.ts` compõe os routers e `app.ts` monta a API. A lógica de negócio não fica embutida nas definições de rota.

## Deploy futuro

Frontend pode ser publicado na Vercel, API Express no Render e PostgreSQL/Auth no Supabase gerido. Em produção, define variáveis independentes para cada serviço, activa HTTPS, restringe CORS, roda e protege a chave AES; não uses a configuração local, o utilizador `postgres` local ou segredos no bundle do frontend.
