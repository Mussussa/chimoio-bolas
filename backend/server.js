import "dotenv/config";
import cors from "cors";
import express from "express";
import { GoogleGenAI } from "@google/genai";
import { ads, adminLogs, aiUsage, batches, providerCampaigns, providerListings, serviceProviders, stores, users } from "./mockDb.js";

const app = express();
const port = Number(process.env.PORT) || 3001;
const batchLimit = 6;
const aiDailyLimit = 10;
const validPlans = new Set(["basico", "destaque", "premium"]);
const providerPlans = {
  basico: { valorMensal: 1000, campanhasMensais: 2 },
  premium: { valorMensal: 1500, campanhasMensais: 4 }
};
const campaignPlatforms = new Set(["Facebook", "Instagram", "TikTok", "WhatsApp"]);

app.use(cors());
app.use(express.json({ limit: "12mb" }));

const findUser = (userId) => users.find((user) => user.id === userId);
const findStore = (storeId) => stores.find((store) => store.id === storeId);
const isAdmin = (user) => user && ["admin", "supaadmin"].includes(user.role);
const findProvider = (providerId) => serviceProviders.find((provider) => provider.id === providerId);
const providerSubscriptionActive = (provider) => provider.estadoSubscricao === "ativa" && new Date(provider.fimCiclo).getTime() > Date.now();
const batchHasSinglePlan = (batch) => batch.adsIds.length > 0 && batch.adsIds.every((id) => ads.find((ad) => ad.id === id)?.plano === batch.plano);
const currentOpenBatch = (plan) => batches.find((batch) => !batch.publicadoWeb && batch.plano === plan && batch.adsIds.length < batchLimit && batchHasSinglePlan(batch));

function updateProviderSubscription(provider) {
  if (provider.estadoSubscricao === "ativa" && new Date(provider.fimCiclo).getTime() <= Date.now()) {
    provider.estadoSubscricao = "expirada";
  }
}

function getProviderWithListings(provider) {
  updateProviderSubscription(provider);
  return {
    ...provider,
    campanhasMensais: providerPlans[provider.plano]?.campanhasMensais ?? 0,
    servicos: providerListings.filter((listing) => listing.providerId === provider.id),
    campanhas: providerCampaigns.filter((campaign) => campaign.providerId === provider.id)
  };
}

function validateListing({ titulo, descricao, fotoUrl, preco, bairro }) {
  return Boolean(
    titulo?.trim() &&
    descricao?.trim() &&
    fotoUrl?.trim() &&
    bairro?.trim() &&
    Number.isFinite(Number(preco)) &&
    Number(preco) > 0
  );
}

function publishBatchWeb(batch) {
  batch.publicadoWeb = true;
  for (const adId of batch.adsIds) {
    const ad = ads.find((item) => item.id === adId);
    if (ad) ad.status = "publicado";
  }
}

function updateBatchRules(batch, force30Min = false) {
  if (force30Min) batch.forcado30Min = true;
  const planIsConsistent = batchHasSinglePlan(batch);
  const ageInMinutes = (Date.now() - new Date(batch.CriadoEm).getTime()) / 60000;
  if (planIsConsistent && (batch.adsIds.length >= batchLimit || ageInMinutes >= 30 || batch.forcado30Min)) {
    publishBatchWeb(batch);
  }
  batch.liberadoMetaAds = planIsConsistent && batch.adsIds.length === batchLimit && batch.receitaTotal >= 600;
}

function getBatchAds(batch) {
  return batch.adsIds
    .map((id) => ads.find((ad) => ad.id === id))
    .filter(Boolean);
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/state", (_req, res) => {
  for (const batch of batches) updateBatchRules(batch);
  const enrichedProviders = serviceProviders.map(getProviderWithListings);
  const enrichedStores = stores.map((store) => ({ ...store, anuncios: ads.filter((ad) => ad.storeId === store.id && ad.status === "publicado") }));
  const enrichedAds = ads.map((ad) => ({ ...ad, store: enrichedStores.find((store) => store.id === ad.storeId) }));
  res.json({
    users: users.map(({ id, nome, role }) => ({ id, nome, role })),
    stores: enrichedStores,
    ads: enrichedAds,
    batches: batches.map((batch) => ({ ...batch, ads: getBatchAds(batch).map((ad) => ({ ...ad, store: findStore(ad.storeId) })) })),
    prestadores: enrichedProviders.map(({ email, ...provider }) => provider),
    campanhasPrestadores: providerCampaigns,
    adminLogs
  });
});

app.post("/api/prestadores/registar", (req, res) => {
  const { nome, contacto, email, telefone, bairro, titulo, descricao, preco, fotoUrl, plano } = req.body;
  if (!nome?.trim() || !contacto?.trim() || !email?.trim() || !telefone?.trim() || !bairro?.trim()) {
    return res.status(400).json({ error: "Preencha os dados do prestador e da loja." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ error: "Indique um e-mail válido." });
  if (!Object.hasOwn(providerPlans, plano)) return res.status(400).json({ error: "Escolha o plano Básico ou Premium. Empresarial ainda não está disponível." });
  if (!validateListing({ titulo, descricao, fotoUrl, preco, bairro })) return res.status(400).json({ error: "Preencha os dados do serviço inicial com um preço válido." });
  const normalizedEmail = email.trim().toLowerCase();
  if (
    users.some((user) => user.email?.toLowerCase() === normalizedEmail) ||
    serviceProviders.some((provider) => provider.email?.toLowerCase() === normalizedEmail)
  ) return res.status(409).json({ error: "Já existe uma conta de prestador com este e-mail." });

  const user = { id: `u-prestador-${Date.now()}`, nome: nome.trim(), role: "prestador", email: normalizedEmail };
  const plan = providerPlans[plano];
  const provider = {
    id: `prestador-${Date.now()}`,
    ownerId: user.id,
    nome: nome.trim(),
    contacto: contacto.trim(),
    email: user.email,
    telefone: telefone.trim(),
    bairro: bairro.trim(),
    categoria: "individual",
    plano,
    valorMensal: plan.valorMensal,
    estadoSubscricao: "ativa",
    inicioCiclo: new Date().toISOString(),
    fimCiclo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    estadoRevisao: "pendente",
    avaliacoes: [],
    campanhasUsadas: 0,
    createdAt: new Date().toISOString()
  };
  const listing = {
    id: `servico-${Date.now()}`,
    providerId: provider.id,
    titulo: titulo.trim(),
    descricao: descricao.trim(),
    preco: Number(preco),
    fotoUrl: fotoUrl.trim(),
    bairro: bairro.trim(),
    lat: Number.isFinite(Number(req.body.lat)) ? Number(req.body.lat) : -19.1164,
    lng: Number.isFinite(Number(req.body.lng)) ? Number(req.body.lng) : 33.4833,
    status: "pendente",
    createdAt: new Date().toISOString()
  };
  users.push(user);
  serviceProviders.push(provider);
  providerListings.push(listing);
  adminLogs.unshift({ id: `log-${Date.now()}`, adminNome: "Sistema", acao: `Novo prestador ${provider.nome} registado no plano ${plano}`, loteId: "-", hora: new Date().toISOString() });
  res.status(201).json({
    user,
    prestador: getProviderWithListings(provider),
    pagamento: { estado: "simulado_com_sucesso", valor: plan.valorMensal, periodicidade: "mensal", renovaEm: provider.fimCiclo }
  });
});

app.post("/api/prestadores/:id/plano", (req, res) => {
  const provider = findProvider(req.params.id);
  const user = findUser(req.body.userId);
  const plan = providerPlans[req.body.plano];
  if (!provider || provider.ownerId !== user?.id || user.role !== "prestador") return res.status(404).json({ error: "Prestador não encontrado para esta conta." });
  if (!plan) return res.status(400).json({ error: "Escolha o plano Básico ou Premium. Empresarial ainda não está disponível." });

  provider.plano = req.body.plano;
  provider.valorMensal = plan.valorMensal;
  provider.estadoSubscricao = "ativa";
  provider.inicioCiclo = new Date().toISOString();
  provider.fimCiclo = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  provider.campanhasUsadas = 0;
  adminLogs.unshift({ id: `log-${Date.now()}`, adminNome: provider.nome, acao: `Alterou/renovou subscrição para ${req.body.plano} (${plan.valorMensal} MT/mês)`, loteId: "-", hora: new Date().toISOString() });
  res.json({
    prestador: getProviderWithListings(provider),
    pagamento: { estado: "simulado_com_sucesso", valor: plan.valorMensal, periodicidade: "mensal", renovaEm: provider.fimCiclo }
  });
});

app.post("/api/prestadores/:id/servicos", (req, res) => {
  const provider = findProvider(req.params.id);
  const user = findUser(req.body.userId);
  if (!provider || provider.ownerId !== user?.id || user.role !== "prestador") return res.status(404).json({ error: "Prestador não encontrado para esta conta." });
  if (!providerSubscriptionActive(provider)) return res.status(403).json({ error: "A subscrição mensal expirou. Renove o plano para enviar serviços para revisão." });
  if (!validateListing(req.body)) return res.status(400).json({ error: "Preencha título, descrição, fotografia, bairro e preço válido." });

  const listing = {
    id: `servico-${Date.now()}`,
    providerId: provider.id,
    titulo: req.body.titulo.trim(),
    descricao: req.body.descricao.trim(),
    preco: Number(req.body.preco),
    fotoUrl: req.body.fotoUrl.trim(),
    bairro: req.body.bairro.trim(),
    lat: Number.isFinite(Number(req.body.lat)) ? Number(req.body.lat) : -19.1164,
    lng: Number.isFinite(Number(req.body.lng)) ? Number(req.body.lng) : 33.4833,
    status: "pendente",
    createdAt: new Date().toISOString()
  };
  providerListings.push(listing);
  res.status(201).json({ servico: listing });
});

app.post("/api/admin/prestadores/:id/aprovar", (req, res) => {
  const admin = findUser(req.body.adminId);
  const provider = findProvider(req.params.id);
  if (!isAdmin(admin)) return res.status(403).json({ error: "Apenas Admin ou SupaAdmin pode aprovar prestadores." });
  if (!provider) return res.status(404).json({ error: "Prestador não encontrado." });
  provider.estadoRevisao = "aprovado";
  adminLogs.unshift({ id: `log-${Date.now()}`, adminNome: admin.nome, acao: `Aprovou prestador ${provider.nome}`, loteId: "-", hora: new Date().toISOString() });
  res.json({ prestador: getProviderWithListings(provider), adminLogs });
});

app.post("/api/admin/prestadores/:id/servicos/:listingId/publicar", (req, res) => {
  const admin = findUser(req.body.adminId);
  const provider = findProvider(req.params.id);
  const listing = providerListings.find((item) => item.id === req.params.listingId && item.providerId === req.params.id);
  if (!isAdmin(admin)) return res.status(403).json({ error: "Apenas Admin ou SupaAdmin pode publicar serviços de prestadores." });
  if (!provider || !listing) return res.status(404).json({ error: "Prestador ou serviço não encontrado." });
  updateProviderSubscription(provider);
  if (!providerSubscriptionActive(provider) || provider.estadoRevisao !== "aprovado") return res.status(409).json({ error: "Aprove o prestador e confirme a subscrição activa antes de publicar o serviço." });
  listing.status = "publicado";
  listing.publicadoEm = new Date().toISOString();
  adminLogs.unshift({ id: `log-${Date.now()}`, adminNome: admin.nome, acao: `Publicou serviço ${listing.titulo} de ${provider.nome}`, loteId: "-", hora: new Date().toISOString() });
  res.json({ servico: listing, adminLogs });
});

app.post("/api/admin/prestadores/:id/campanhas", (req, res) => {
  const admin = findUser(req.body.adminId);
  const provider = findProvider(req.params.id);
  if (!isAdmin(admin)) return res.status(403).json({ error: "Apenas Admin ou SupaAdmin pode registar campanhas." });
  if (!provider) return res.status(404).json({ error: "Prestador não encontrado." });
  updateProviderSubscription(provider);
  if (!providerSubscriptionActive(provider) || provider.estadoRevisao !== "aprovado") return res.status(409).json({ error: "O prestador precisa de subscrição activa e aprovação administrativa." });
  const campaignLimit = providerPlans[provider.plano].campanhasMensais;
  if (provider.campanhasUsadas >= campaignLimit) return res.status(409).json({ error: `Este plano já usou as ${campaignLimit} campanhas externas do ciclo mensal.` });
  if (!campaignPlatforms.has(req.body.plataforma)) return res.status(400).json({ error: "Escolha Facebook, Instagram, TikTok ou WhatsApp." });
  if (req.body.url && !/^https?:\/\/\S+$/i.test(req.body.url)) return res.status(400).json({ error: "O link da publicação deve começar por http:// ou https://." });

  const campaign = {
    id: `campanha-${Date.now()}`,
    providerId: provider.id,
    adminId: admin.id,
    adminNome: admin.nome,
    plataforma: req.body.plataforma,
    url: req.body.url?.trim() ?? "",
    hora: new Date().toISOString()
  };
  providerCampaigns.unshift(campaign);
  provider.campanhasUsadas += 1;
  adminLogs.unshift({ id: `log-${Date.now()}`, adminNome: admin.nome, acao: `Registou campanha ${req.body.plataforma} para ${provider.nome}`, loteId: "-", hora: campaign.hora });
  res.status(201).json({ campanha: campaign, prestador: getProviderWithListings(provider), adminLogs });
});

app.post("/api/anuncios/criar-e-pagar", (req, res) => {
  const { userId, titulo, descricao, preco, fotoUrl, plano, tipo } = req.body;
  const user = findUser(userId);
  if (!user || user.role !== "lojista") return res.status(403).json({ error: "Só um lojista pode criar anúncios." });
  if (!titulo?.trim() || !descricao?.trim() || !fotoUrl?.trim()) return res.status(400).json({ error: "Preencha título, descrição e fotografia." });
  if (!["produto", "servico"].includes(tipo) || !validPlans.has(plano)) return res.status(400).json({ error: "Tipo ou plano inválido." });
  const numericPrice = Number(preco);
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) return res.status(400).json({ error: "Indique um preço válido." });

  let store = stores.find((item) => item.ownerId === user.id);
  if (!store) {
    store = { id: `store-${Date.now()}`, ownerId: user.id, nome: user.nome, tipo, lat: -19.1164, lng: 33.4833, bairro: "Cimento", visitas: 0, avaliacoes: [] };
    stores.push(store);
  }
  store.tipo = tipo;
  const batch = currentOpenBatch(plano) ?? {
    id: `lote-${Date.now()}`,
    plano,
    adsIds: [],
    CriadoEm: new Date().toISOString(),
    forcado30Min: false,
    publicadoWeb: false,
    liberadoMetaAds: false,
    publicadoMetaAds: false,
    receitaTotal: 0,
    adminId: null
  };
  if (batch.plano !== plano || !batch.adsIds.every((id) => ads.find((item) => item.id === id)?.plano === plano)) {
    return res.status(409).json({ error: "Este lote contém anúncios de outro plano. Não foi possível adicionar o anúncio." });
  }
  if (!batches.includes(batch)) batches.push(batch);
  const prices = { basico: 100, destaque: 150, premium: 250 };
  const ad = {
    id: `ad-${Date.now()}`,
    storeId: store.id,
    titulo: titulo.trim(),
    descricao: descricao.trim(),
    preco: numericPrice,
    fotoUrl: fotoUrl.trim(),
    plano,
    valorPago: prices[plano],
    status: "na_fila",
    loteId: batch.id,
    createdAt: new Date().toISOString()
  };
  ads.push(ad);
  batch.adsIds.push(ad.id);
  batch.receitaTotal += ad.valorPago;
  updateBatchRules(batch);
  res.status(201).json({ ad, batch: { ...batch, ads: getBatchAds(batch) }, pagamento: { estado: "simulado_com_sucesso", metodo: "EscalePay (M-Pesa/e-Mola)" } });
});

app.post("/api/lotes/verificar-regras", (req, res) => {
  const { batchId, force30Min = false, adminId } = req.body;
  if (!isAdmin(findUser(adminId))) return res.status(403).json({ error: "Apenas Admin ou SupaAdmin pode verificar os lotes." });
  const batch = batchId ? batches.find((item) => item.id === batchId) : batches.find((item) => !item.publicadoWeb && item.adsIds.length > 0);
  if (!batch) return res.status(404).json({ error: "Não há lote em espera para verificar." });
  if (!batchHasSinglePlan(batch)) return res.status(409).json({ error: "O lote contém planos diferentes e não pode ser publicado." });
  updateBatchRules(batch, Boolean(force30Min));
  res.json({ batch: { ...batch, ads: getBatchAds(batch) }, mensagem: batch.publicadoWeb ? "Carrossel publicado na Web." : "Lote continua em espera." });
});

app.post("/api/lotes/:id/publicar-meta", (req, res) => {
  const user = findUser(req.body.userId);
  const batch = batches.find((item) => item.id === req.params.id);
  if (!isAdmin(user)) return res.status(403).json({ error: "Apenas Admin ou SupaAdmin pode publicar no Meta Ads." });
  if (!batch) return res.status(404).json({ error: "Lote não encontrado." });
  updateBatchRules(batch);
  if (!batch.liberadoMetaAds) return res.status(409).json({ error: "Meta Ads requer 6 anúncios do mesmo plano e receita mínima de 600 MT." });
  if (!batch.publicadoWeb) return res.status(409).json({ error: "O lote deve ser publicado na Web antes do Meta Ads." });
  batch.publicadoMetaAds = true;
  batch.adminId = user.id;
  adminLogs.unshift({ id: `log-${Date.now()}`, adminNome: user.nome, acao: "Publicou lote no Meta Ads", loteId: batch.id, hora: new Date().toISOString() });
  res.json({ batch, adminLogs });
});

app.post("/api/admin/promover", (req, res) => {
  const actor = findUser(req.body.adminId);
  const target = findUser(req.body.userId);
  if (!actor || actor.role !== "supaadmin") return res.status(403).json({ error: "Só o SupaAdmin pode promover utilizadores." });
  if (!target) return res.status(404).json({ error: "Utilizador não encontrado." });
  if (!["cliente", "lojista", "admin"].includes(target.role)) return res.status(400).json({ error: "Este cargo não pode ser atribuído." });
  target.role = "admin";
  adminLogs.unshift({ id: `log-${Date.now()}`, adminNome: actor.nome, acao: `Promoveu ${target.nome} a Admin`, loteId: "-", hora: new Date().toISOString() });
  res.json({ user: target, adminLogs });
});

app.get("/api/lojas/proximas", (req, res) => {
  const lat = Number(req.query.lat) || -19.1164;
  const lng = Number(req.query.lng) || 33.4833;
  const tipo = req.query.tipo;
  const radius = Math.max(0, Number(req.query.raio) || 10);
  const storeResults = stores
    .filter((store) => !tipo || tipo === "todos" || store.tipo === tipo)
    .map((store) => ({
      ...store,
      distanciaKm: distanceKm(lat, lng, store.lat, store.lng),
      anuncios: ads.filter((ad) => ad.storeId === store.id && ad.status === "publicado")
    }))
    .filter((store) => store.distanciaKm <= radius)
    .sort((a, b) => a.distanciaKm - b.distanciaKm);
  const providerResults = serviceProviders
    .filter((provider) => provider.estadoRevisao === "aprovado" && providerSubscriptionActive(provider))
    .flatMap((provider) => providerListings
      .filter((listing) => listing.providerId === provider.id && listing.status === "publicado")
      .map((listing) => ({
        id: listing.id,
        providerId: provider.id,
        ownerId: provider.ownerId,
        nome: provider.nome,
        tipo: "servico",
        planoPrestador: provider.plano,
        lat: listing.lat,
        lng: listing.lng,
        bairro: listing.bairro,
        visitas: 0,
        avaliacoes: provider.avaliacoes ?? [],
        distanciaKm: distanceKm(lat, lng, listing.lat, listing.lng),
        anuncios: [{ ...listing, storeId: listing.id, plano: provider.plano, store: { id: listing.id, nome: provider.nome, bairro: listing.bairro } }]
      })))
    .filter((store) => (!tipo || tipo === "todos" || tipo === "servico") && store.distanciaKm <= radius);
  res.json([...storeResults, ...providerResults].sort((a, b) =>
    Number(b.planoPrestador === "premium") - Number(a.planoPrestador === "premium") ||
    a.distanciaKm - b.distanciaKm
  ));
});

app.post("/api/lojas/:id/avaliar", (req, res) => {
  const { userId, estrelas, comentario = "" } = req.body;
  const user = findUser(userId);
  const store = findStore(req.params.id);
  const provider = serviceProviders.find((item) => item.id === req.params.id) ??
    serviceProviders.find((item) => providerListings.some((listing) => listing.id === req.params.id && listing.providerId === item.id));
  const target = store ?? provider;
  if (!target) return res.status(404).json({ error: "Loja não encontrada." });
  if (!user || user.role !== "cliente") return res.status(403).json({ error: "Só clientes podem avaliar lojas." });
  if (target.ownerId === user.id) return res.status(403).json({ error: "Não pode avaliar a sua própria loja." });
  target.avaliacoes ??= [];
  if (target.avaliacoes.some((review) => review.userId === user.id)) return res.status(409).json({ error: "Já avaliou esta loja." });
  const rating = Number(estrelas);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: "A avaliação deve ser entre 1 e 5 estrelas." });
  target.avaliacoes.push({ userId: user.id, nome: user.nome, estrelas: rating, comentario: String(comentario).trim().slice(0, 500) });
  res.status(201).json({ store: { id: target.id, avaliacoes: target.avaliacoes } });
});

app.post("/api/chat/perguntar", async (req, res) => {
  const { deviceId, pergunta, adId } = req.body;
  const ad = ads.find((item) => item.id === adId);
  if (!deviceId?.trim() || !pergunta?.trim() || !ad) return res.status(400).json({ error: "Envie deviceId, pergunta e um anúncio válido." });

  const date = new Date().toISOString().slice(0, 10);
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const usageKey = `${ip}:${deviceId.trim()}`;
  const usage = aiUsage[usageKey];
  if (!usage || usage.date !== date) aiUsage[usageKey] = { date, count: 0 };
  if (aiUsage[usageKey].count >= aiDailyLimit) return res.status(429).json({ error: "Atingiu o limite diário de 10 perguntas ao assistente.", count: aiDailyLimit, limite: aiDailyLimit });
  aiUsage[usageKey].count += 1;

  const store = findStore(ad.storeId);
  const count = aiUsage[usageKey].count;
  if (ad.plano === "basico") {
    return res.json({
      resposta: `Este anúncio tem o preço de ${ad.preco} MT e fica no bairro ${store?.bairro ?? "Cimento"}, em Chimoio. Contacte a loja para mais informações.`,
      count,
      limite: aiDailyLimit,
      origem: "automatica"
    });
  }

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "AQ.Ab8RN6IYIlNJPqoR_YtbaL8sQ216nT17KAjn7BhCH-88WQ8crw") {
    aiUsage[usageKey].count -= 1;
    return res.status(503).json({ error: "O assistente Gemini está sem chave configurada. Defina GEMINI_API_KEY no ficheiro backend/.env." });
  }

  const relatedAds = ad.plano === "premium"
    ? ads.filter((item) => item.storeId === ad.storeId && item.id !== ad.id).slice(0, 3)
    : [];
  const relatedContext = relatedAds.map((item) => `- ${item.titulo}: ${item.preco} MT — http://localhost:5173/?anuncio=${encodeURIComponent(item.id)}`).join("\n");
  const prompt = [
    "És o assistente de compras do Chimoio Boladas. Responde sempre em português de Moçambique, com simpatia, clareza e sem inventar informação.",
    "Usa apenas os dados fornecidos. Para perguntas sem resposta nos dados, recomenda contactar directamente a loja.",
    ad.plano === "premium" ? "Este é um anúncio PREMIUM: além de responder, recomenda naturalmente outros produtos da mesma loja e inclui os respectivos links." : "Este é um anúncio DESTAQUE: responde sobre este anúncio e inclui o seu link directo.",
    `Anúncio: ${ad.titulo}\nDescrição: ${ad.descricao}\nPreço: ${ad.preco} MT\nLoja: ${store?.nome ?? "Loja local"}\nLocalização: ${store?.bairro ?? "Chimoio"}\nLink: http://localhost:5173/?anuncio=${encodeURIComponent(ad.id)}`,
    relatedContext ? `Outros produtos da loja:\n${relatedContext}` : "",
    `Pergunta do cliente: ${pergunta.trim()}`
  ].filter(Boolean).join("\n\n");

  try {
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await genAI.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
    res.json({ resposta: result.text, count, limite: aiDailyLimit, origem: "gemini" });
  } catch (error) {
    aiUsage[usageKey].count -= 1;
    console.error("Falha ao consultar Gemini:", error);
    res.status(502).json({ error: "Não foi possível obter resposta do Gemini. Tente novamente." });
  }
});

const ruleTimer = setInterval(() => batches.forEach((batch) => updateBatchRules(batch)), 15000);
ruleTimer.unref();

app.listen(port, () => console.log(`Chimoio Boladas API disponível em http://localhost:${port}`));
