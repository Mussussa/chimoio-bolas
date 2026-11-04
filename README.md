# Chimoio Boladas

Marketplace local de produtos e serviços em Chimoio. O código da aplicação está em TypeScript: React/Vite/PWA no cliente, Express modular no backend e Sequelize com PostgreSQL. Os valores monetários são em Meticais (MT); pagamentos e escrow são simulações locais.

## Arquitectura

- **Leituras públicas:** o navegador usa `@supabase/supabase-js` para consultar lojas, produtos, prestadores e serviços directamente; coordenadas e marcadores do mapa vêm das mesmas leituras. A migration também disponibiliza a view segura `public_reviews`. As políticas RLS limitam as listagens a dados elegíveis; o frontend nunca recebe a chave `service_role`.
- **Escritas críticas:** Express autentica o JWT Supabase e obtém a função do utilizador na tabela `users`. Criação/publicação de serviços, campanhas, mensagens, propostas, negociação, escrow e publicação Meta Ads são executados exclusivamente no backend.
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
  models/                # modelos Sequelize e relações
  middleware/            # Morgan, erros globais, autenticação e autorização
  http/                  # respostas JSON padronizadas
  routes/                # perfil, serviços, negociação, avaliações e Admin
  domain/                # regras e testes unitários
backend/logs/             # error.log e combined.log (gerados, ignorados pelo Git)
supabase/
  config.toml
  migrations/             # SQL, schema e políticas RLS
```

## Regras implementadas

- Prestador autenticado cria o perfil e publica serviços directamente. Cada serviço é marcado no servidor como `published: true` e `internal_platform_service: true`; a subscrição local é válida por 30 dias.
- Planos mensais simulados: Básico 1.000 MT com 2 campanhas por ciclo de 30 dias; Premium 1.500 MT com 4 campanhas. Empresarial não está disponível. Renovar reinicia o ciclo e a quota. O custo por campanha é determinado pelo backend: Básico 100 MT, Destaque 150 MT, Standard 150 MT e Premium 250 MT. O cliente nunca controla o valor cobrado.
- As campanhas entram em lotes separados por plano. O lote publica na Web com seis campanhas ou após 30 minutos. Meta Ads só é libertado por Admin após seis campanhas, receita mínima de 600 MT e publicação Web.
- Apenas cliente pode iniciar negociação. As mensagens e propostas são visíveis aos participantes; proposta positiva actualiza `agreed_price`, e só a contraparte pode aceitar/rejeitar. O preço e os estados não podem ser alterados via escrita directa no navegador.
- O escrow é simulado: o cliente pode activar após aceitação, qualquer participante pode abrir disputa quando activo e só o cliente pode confirmar a conclusão/libertação. Referências de comprovativos passam pelo Express e são cifradas.
- Avaliações são de cliente, de 1 a 5, com uma avaliação por pessoa e alvo. A base também aplica unicidade e validação de intervalo.
- `admin` não pode ser atribuído por metadados do cliente nem por rota pública; a promoção inicial é feita manualmente na base de dados.

## Endpoints críticos

| Método e rota | Regra |
| --- | --- |
| `POST /api/stores/register` | Cria a loja do utilizador autenticado; começa não verificada. |
| `POST /api/products` | Cria produto na loja própria. |
| `PATCH /api/products/:id/price` | Altera preço apenas para o proprietário, com validação monetária. |
| `POST /api/providers/register`, `POST /api/providers/renew` | Cria/renova subscrição simulada de prestador por 30 dias. |
| `POST /api/services` | Publica serviço do próprio prestador com `internal_platform_service=true`. |
| `POST /api/campaigns` | Determina custo, quota e lote no servidor; não aceita custo enviado pelo cliente. |
| `POST /api/negotiations`, `POST /api/negotiations/:id/messages` | Cria negociação e mensagens/propostas apenas para participantes. |
| `POST /api/negotiations/:id/proposals/:messageId/respond` | Apenas a contraparte pode aceitar/rejeitar a proposta mais recente. |
| `POST /api/negotiations/:id/escrow` | Controla activação, entrega, disputa e conclusão em transacções protegidas. |
| `POST /api/admin/stores/:id/verify`, `POST /api/admin/ad-batches/:id/publish-meta` | Operações administrativas que exigem role `admin`. |
| `POST /api/admin/negotiations/:id/resolve` | Fecha por decisão administrativa uma disputa simulada. |

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

   A migration é aplicada por `db reset`. Guarda a URL e a chave `anon` mostradas por `supabase status`; nunca uses a `service_role` no frontend.

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

Os testes unitários cobrem cifragem, quotas, publicação dos lotes, requisitos Meta Ads e transições de escrow; os testes Express verificam healthcheck e recusa de escrita sem sessão. Com Supabase local em execução, `cd backend && npm run test:integration` confirma a presença das tabelas e RLS.

## Logs, erros e auditoria

- Winston escreve eventos JSON em `backend/logs/combined.log` e erros com stack trace em `backend/logs/error.log`; em desenvolvimento, os eventos também aparecem no terminal. `LOG_LEVEL` pode ajustar o nível mínimo.
- Morgan regista método, padrão da rota (sem query string), status HTTP, duração e IP.
- As respostas de sucesso usam `{ success: true, message, data }`; erros usam `{ success: false, message, error_code }`. O cliente HTTP frontend desempacota `data` e apresenta `message` em falhas.
- Eventos auditados incluem propostas de preço, transições de escrow, alterações/criação/publicação de lotes. Os metadados guardam IDs, estados e valores MT; não incluem telefones nem referências de comprovativos. Publicações automáticas são atribuídas ao actor `system`.

## Deploy futuro

Frontend pode ser publicado na Vercel, API Express no Render e PostgreSQL/Auth no Supabase gerido. Em produção, define variáveis independentes para cada serviço, activa HTTPS, restringe CORS, roda e protege a chave AES; não uses a configuração local, o utilizador `postgres` local ou segredos no bundle do frontend.
