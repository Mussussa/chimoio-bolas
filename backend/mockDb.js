const today = new Date().toISOString();

export const users = [
  { id: "u-supa", nome: "SupaAdmin Demo", role: "supaadmin" },
  { id: "u-admin", nome: "Admin Chimoio", role: "admin" },
  { id: "u-padaria", nome: "Padaria da Vila", role: "lojista" },
  { id: "u-moda", nome: "Moda Soalpo", role: "lojista" },
  { id: "u-cliente", nome: "Cliente Demo", role: "cliente" },
  { id: "u-oficina", nome: "Oficina Eduardo", role: "lojista" },
  { id: "u-flores", nome: "Florista Cimento", role: "lojista" },
  { id: "u-prestador-demo", nome: "Electricista Chimoio", role: "prestador" }
];

export const stores = [
  { id: "s-padaria", ownerId: "u-padaria", nome: "Padaria da Vila", tipo: "produto", lat: -19.1164, lng: 33.4833, bairro: "Cimento", visitas: 128, avaliacoes: [{ userId: "u-cliente", nome: "Cliente Demo", estrelas: 5, comentario: "Pão fresco e atendimento simpático!" }] },
  { id: "s-moda", ownerId: "u-moda", nome: "Moda Soalpo", tipo: "produto", lat: -19.1281, lng: 33.4732, bairro: "Soalpo", visitas: 86, avaliacoes: [{ userId: "u-admin", nome: "Admin Chimoio", estrelas: 4, comentario: "Boa variedade de capulanas." }] },
  { id: "s-oficina", ownerId: "u-oficina", nome: "Oficina Eduardo", tipo: "servico", lat: -19.1077, lng: 33.4971, bairro: "Eduardo Mondlane", visitas: 63, avaliacoes: [] },
  { id: "s-flores", ownerId: "u-flores", nome: "Florista Cimento", tipo: "produto", lat: -19.1224, lng: 33.4912, bairro: "Cimento", visitas: 104, avaliacoes: [{ userId: "u-cliente", nome: "Cliente Demo", estrelas: 5, comentario: "Arranjos lindos para oferecer." }] },
  { id: "s-vilanova", ownerId: "u-moda", nome: "Reparações Vila Nova", tipo: "servico", lat: -19.1019, lng: 33.4694, bairro: "Vila Nova", visitas: 42, avaliacoes: [] },
  { id: "s-soalpo-fresh", ownerId: "u-padaria", nome: "Horta Fresca Soalpo", tipo: "produto", lat: -19.1323, lng: 33.4846, bairro: "Soalpo", visitas: 71, avaliacoes: [] }
];

export const ads = [
  { id: "ad-pao", storeId: "s-padaria", titulo: "Pão caseiro quentinho", descricao: "Pão acabado de sair do forno, feito todos os dias. Encomendas disponíveis.", preco: 25, fotoUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80", plano: "premium", valorPago: 250, status: "publicado", loteId: "lote-seed-premium", createdAt: today },
  { id: "ad-capulana", storeId: "s-moda", titulo: "Capulanas coloridas", descricao: "Capulanas de qualidade em vários padrões. Visite a nossa loja em Soalpo.", preco: 350, fotoUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80", plano: "destaque", valorPago: 150, status: "publicado", loteId: "lote-seed-destaque", createdAt: today },
  { id: "ad-flores", storeId: "s-flores", titulo: "Buquê para momentos especiais", descricao: "Arranjos florais frescos para aniversários e celebrações.", preco: 800, fotoUrl: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80", plano: "premium", valorPago: 250, status: "publicado", loteId: "lote-seed-premium", createdAt: today },
  { id: "ad-oficina", storeId: "s-oficina", titulo: "Revisão de motorizadas", descricao: "Manutenção, diagnóstico e reparação de motorizadas com orçamento no local.", preco: 500, fotoUrl: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80", plano: "destaque", valorPago: 150, status: "publicado", loteId: "lote-seed-destaque", createdAt: today },
  { id: "ad-horta", storeId: "s-soalpo-fresh", titulo: "Cabazes de hortícolas", descricao: "Tomate, couve e hortícolas frescos, colhidos localmente.", preco: 250, fotoUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80", plano: "basico", valorPago: 100, status: "publicado", loteId: "lote-seed-basico", createdAt: today },
  { id: "ad-costura", storeId: "s-vilanova", titulo: "Ajustes e costura", descricao: "Ajustamos vestidos e calças com rapidez e cuidado.", preco: 200, fotoUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80", plano: "basico", valorPago: 100, status: "publicado", loteId: "lote-seed-basico", createdAt: today },
  { id: "ad-bolo", storeId: "s-padaria", titulo: "Bolo de aniversário por encomenda", descricao: "Bolos caseiros personalizados para celebrar os seus momentos especiais.", preco: 1200, fotoUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80", plano: "premium", valorPago: 250, status: "na_fila", loteId: "lote-demo-fila", createdAt: today },
  { id: "ad-costura-demo", storeId: "s-vilanova", titulo: "Uniformes escolares à medida", descricao: "Confecção e ajustes de uniformes para escolas de Chimoio.", preco: 650, fotoUrl: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=80", plano: "premium", valorPago: 250, status: "na_fila", loteId: "lote-demo-fila", createdAt: today }
];

export const batches = [
  ...["premium", "destaque", "basico"].map((plano) => {
    const planAds = ads.filter((ad) => ad.loteId === `lote-seed-${plano}`);
    return {
      id: `lote-seed-${plano}`,
      plano,
      adsIds: planAds.map((ad) => ad.id),
      CriadoEm: today,
      forcado30Min: false,
      publicadoWeb: true,
      liberadoMetaAds: false,
      publicadoMetaAds: false,
      receitaTotal: planAds.reduce((total, ad) => total + ad.valorPago, 0),
      adminId: null
    };
  }),
  { id: "lote-demo-fila", plano: "premium", adsIds: ads.filter((ad) => ad.loteId === "lote-demo-fila").map((ad) => ad.id), CriadoEm: today, forcado30Min: false, publicadoWeb: false, liberadoMetaAds: false, publicadoMetaAds: false, receitaTotal: 500, adminId: null }
];

export const serviceProviders = [
  {
    id: "prestador-demo",
    ownerId: "u-prestador-demo",
    nome: "Electricista Chimoio",
    contacto: "Electricista Chimoio",
    email: "electricista.demo@chimoio.local",
    telefone: "+258 84 000 0000",
    bairro: "Cimento",
    categoria: "individual",
    plano: "premium",
    valorMensal: 1500,
    estadoSubscricao: "ativa",
    inicioCiclo: today,
    fimCiclo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    estadoRevisao: "aprovado",
    avaliacoes: [],
    campanhasUsadas: 1,
    createdAt: today
  }
];

export const providerListings = [
  {
    id: "servico-demo-electricista",
    providerId: "prestador-demo",
    titulo: "Instalações e reparações eléctricas",
    descricao: "Instalação, manutenção e diagnóstico eléctrico para residências e pequenos negócios em Chimoio.",
    preco: 500,
    fotoUrl: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=900&q=80",
    bairro: "Cimento",
    lat: -19.1164,
    lng: 33.4833,
    status: "publicado",
    createdAt: today
  }
];

export const providerCampaigns = [
  {
    id: "campanha-demo-electricista",
    providerId: "prestador-demo",
    adminId: "u-admin",
    adminNome: "Admin Chimoio",
    plataforma: "Facebook",
    url: "https://facebook.com/",
    hora: today
  }
];

export const aiUsage = {};
export const adminLogs = [];
