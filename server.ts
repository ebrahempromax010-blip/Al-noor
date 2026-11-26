import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import express from 'express';
import dotenv from 'dotenv';
import { FunctionDeclaration, GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  analyzeCustomerIntent,
  composeIntelligentFallbackResponse,
  computeAgentFinalPrice,
  findMatchingCatalogAndDeleted,
  scoreAndSelectRecommendations,
  type AgentUseCase,
} from './src/utils/aiAgentEngine';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_VIDEO_TYPES: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

function isPrivateIpAddress(ip: string): boolean {
  if (!net.isIP(ip)) return true;
  if (ip === '::1' || ip === '0.0.0.0') return true;
  if (ip.startsWith('::ffff:')) {
    return isPrivateIpAddress(ip.slice(7));
  }
  const parts = ip.split('.').map(Number);
  if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true;
    return false;
  }
  const normalized = ip.toLowerCase();
  return (
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80') ||
    normalized === '::'
  );
}

async function validatePublicWebhookUrl(rawUrl: string): Promise<URL | null> {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return null;
  }
  if (net.isIP(hostname) && isPrivateIpAddress(hostname)) {
    return null;
  }
  try {
    const records = await dns.lookup(hostname, { all: true });
    if (!records.length || records.some((r) => isPrivateIpAddress(r.address))) {
      return null;
    }
  } catch {
    return null;
  }
  return parsed;
}

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  text: string;
}

interface PublicCatalogProduct {
  id: string;
  nameAr: string;
  nameEn: string;
  brand?: string;
  specsAr?: string;
  specsEn?: string;
  categoryGroup?: string;
  subType?: string;
  price: number;
  discountPercent: number;
  inStock: boolean;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isComingSoon?: boolean;
  createdAt?: string;
  imageUrl?: string;
}

interface DeletedProductSummary {
  id: string;
  nameAr: string;
  nameEn: string;
  specsSummary?: string;
  deletedAt?: string;
}

interface PublicOSDownload {
  titleAr?: string;
  titleEn?: string;
  vendor?: string;
  officialUrl?: string;
}

interface PublicSystemUpdate {
  badgeAr?: string;
  badgeEn?: string;
  textAr?: string;
  textEn?: string;
}

interface PublicAssistantContext {
  storeNameAr?: string;
  storeNameEn?: string;
  currency?: string;
  branchAddress?: string;
  workingHours?: string;
  socialLinks?: Record<string, string>;
  systemUpdates?: PublicSystemUpdate[];
  osDownloads?: PublicOSDownload[];
  products?: PublicCatalogProduct[];
  deletedProductsHistory?: DeletedProductSummary[];
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Custom Function Declarations for Hybrid Tool Calling with Google Search
const searchStoreProductsDecl: FunctionDeclaration = {
  name: 'searchStoreProducts',
  description:
    'Search the store live product inventory and deleted/out-of-stock history by keywords, category, or max price across any language.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Search query (e.g. gaming laptop, RTX 4090, headset, Windows 11, macbook)',
      },
      categoryGroup: {
        type: Type.STRING,
        description: 'Optional category filter: computers, accessories, or software',
      },
      maxPrice: {
        type: Type.NUMBER,
        description: 'Optional maximum budget in store currency',
      },
      inStockOnly: {
        type: Type.BOOLEAN,
        description: 'Set true to filter only available in-stock products',
      },
    },
    required: ['query'],
  },
};

const registerRestockNotificationDecl: FunctionDeclaration = {
  name: 'registerRestockNotification',
  description:
    'Register an automatic restock alert notification for the customer when they ask about an unavailable, out-of-stock, or deleted product so they are notified immediately when Admin adds it.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      productQuery: {
        type: Type.STRING,
        description: 'Concise product name or model requested by the customer',
      },
      matchedDeletedProductId: {
        type: Type.STRING,
        description: 'Matching deleted product ID if present in deletedProductsHistory',
      },
    },
    required: ['productQuery'],
  },
};

const compareAndRecommendByUseCaseDecl: FunctionDeclaration = {
  name: 'compareAndRecommendByUseCase',
  description:
    'Analyze customer workload (gaming, engineering_3d, coding_business, peripherals_setup, software_os) and optional max budget to select and rank the best matching devices from live inventory.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      useCase: {
        type: Type.STRING,
        description:
          'Customer workload: gaming, engineering_3d, coding_business, peripherals_setup, software_os, or general',
      },
      maxBudget: {
        type: Type.NUMBER,
        description: 'Optional maximum budget in store currency',
      },
      preferLaptop: {
        type: Type.BOOLEAN,
        description: 'True if customer prefers a portable laptop over desktop',
      },
    },
    required: ['useCase'],
  },
};

const getStoreResourcesDecl: FunctionDeclaration = {
  name: 'getStoreResources',
  description:
    'Retrieve store branch address, working hours, official OS download links (Windows/macOS/drivers), and social media channels.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

function sanitizePhoneDigits(raw: string): string {
  return String(raw || '').replace(/[^\d]/g, '');
}

function buildFormattedWhatsappText(input: {
  orderId: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  note?: string;
  total: number;
  currency: string;
  items: Array<{ nameAr?: string; nameEn?: string; quantity?: number; unitPrice?: number }>;
}): string {
  const lines = [
    `طلب جديد من: ${input.customerName}`,
    `رقم الطلب: ${input.orderId}`,
    `رقم تليفون العميل: ${input.customerPhone}`,
    `العنوان بالتفصيل: ${input.customerAddress}`,
    '',
    'المنتجات المطلوبة:',
    ...input.items.map(
      (item, idx) =>
        `${idx + 1}. ${item.nameAr || item.nameEn || 'Product'} × ${item.quantity || 1} — ${(
          Number(item.unitPrice || 0) * Number(item.quantity || 1)
        ).toLocaleString('en-US')} ${input.currency}`
    ),
    '',
    `الإجمالي الكلي: ${Number(input.total || 0).toLocaleString('en-US')} ${input.currency}`,
  ];
  if (input.note && input.note.trim()) {
    lines.push(`ملحوظة العميل: ${input.note.trim()}`);
  }
  return lines.join('\n');
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');

  // Video binary upload endpoint (up to 25MB) — mounted before express.json
  app.post(
    '/api/media/upload',
    express.raw({
      type: ['video/mp4', 'video/webm', 'video/quicktime'],
      limit: '25mb',
    }),
    async (req, res) => {
      try {
        const contentType = String(req.headers['content-type'] || '')
          .split(';')[0]
          .trim()
          .toLowerCase();
        const ext = ALLOWED_VIDEO_TYPES[contentType];
        if (!ext) {
          res.status(400).json({ error: 'صيغة الفيديو غير مدعومة. استخدم MP4 أو WebM أو MOV.' });
          return;
        }
        const buffer = req.body as Buffer;
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
          res.status(400).json({ error: 'ملف الفيديو فارغ.' });
          return;
        }
        if (buffer.length > 25 * 1024 * 1024) {
          res.status(413).json({ error: 'حجم الفيديو يتجاوز الحد الأقصى (25 ميجابايت).' });
          return;
        }
        const safeName = `promo_${crypto.randomUUID()}${ext}`;
        const resolved = path.resolve(UPLOADS_DIR, safeName);
        if (!resolved.startsWith(UPLOADS_DIR + path.sep)) {
          res.status(400).json({ error: 'مسار غير صالح.' });
          return;
        }
        await fs.promises.writeFile(resolved, buffer);
        res.status(201).json({
          url: `/uploads/${safeName}`,
          sizeBytes: buffer.length,
        });
      } catch (err) {
        console.error('Media upload failed:', err);
        res.status(500).json({ error: 'تعذر حفظ الفيديو على الخادم.' });
      }
    }
  );

  app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/assistant/status', (_req, res) => {
    const ai = getAiClient();
    res.json({
      configured: Boolean(ai),
      model: 'gemini-4-hydrogen',
      thinkingLevel: 'HIGH',
      googleSearchLinked: true,
      capabilities: [
        'gemini_4_hydrogen',
        'google_search_grounding',
        'human_persona',
        'deep_intent_understanding',
        'all_languages',
        'egyptian_arabic',
        'catalog_tools',
        'use_case_comparison',
        'restock_alerts',
      ],
    });
  });

  app.get('/api/orders/whatsapp-status', (_req, res) => {
    res.json({
      mode: 'customer_whatsapp_client',
      automatedChannelConfigured: true,
      targetPhone: '201025134582',
    });
  });

  app.post('/api/assistant/chat', async (req, res) => {
    try {
      const body = req.body as {
        message?: string;
        lang?: 'ar' | 'en';
        history?: ChatHistoryItem[];
        publicContext?: PublicAssistantContext;
      };

      const rawMessage = typeof body?.message === 'string' ? body.message.trim() : '';
      if (!rawMessage || rawMessage.length > 2000) {
        res.status(400).json({ error: 'الرسالة مطلوبة ويجب ألا تتجاوز 2000 حرف.' });
        return;
      }

      const uiLang: 'ar' | 'en' = body?.lang === 'en' ? 'en' : 'ar';
      const history = Array.isArray(body?.history) ? body.history.slice(-12) : [];
      const ctx = body?.publicContext || {};
      const products = Array.isArray(ctx.products) ? ctx.products.slice(0, 80) : [];
      const deletedHistory = Array.isArray(ctx.deletedProductsHistory)
        ? ctx.deletedProductsHistory.slice(0, 80)
        : [];

      const initialSearch = findMatchingCatalogAndDeleted(rawMessage, products, deletedHistory);
      const intent = analyzeCustomerIntent(rawMessage, history, products, deletedHistory, uiLang);
      const ai = getAiClient();

      const buildFallbackReply = () =>
        composeIntelligentFallbackResponse(rawMessage, intent, ctx, Boolean(ai));

      if (!ai) {
        res.json(buildFallbackReply());
        return;
      }

      const catalogSummary = products.map((p) => ({
        id: p.id,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        brand: p.brand || '',
        category: p.categoryGroup || '',
        subType: p.subType || '',
        specs: `${p.specsAr || ''} | ${p.specsEn || ''}`,
        price: p.price,
        discountPercent: p.discountPercent || 0,
        finalPrice: computeAgentFinalPrice(p.price, p.discountPercent || 0),
        inStock: p.inStock,
        isFeatured: Boolean(p.isFeatured),
        isNewArrival: Boolean(p.isNewArrival),
        isComingSoon: Boolean(p.isComingSoon || !p.inStock),
      }));

      const newArrivalsSummary = catalogSummary.filter((p) => p.isNewArrival && p.inStock);
      const comingSoonSummary = catalogSummary.filter((p) => !p.inStock || p.isComingSoon);
      const deletedSummary = deletedHistory.map((d) => ({
        id: d.id,
        nameAr: d.nameAr,
        nameEn: d.nameEn,
        specsSummary: d.specsSummary || '',
      }));

      const systemInstruction = `You are "طارق / Tarek", an extraordinarily perceptive, warm, human Senior Hardware & Tech Advisor at "${ctx.storeNameAr || 'أشرف تك'} / ${ctx.storeNameEn || 'Ashraf Tech'}".

How You Speak & Think Like an Intelligent Human Advisor:
1. GENUINE HUMAN PRESENCE (NEVER ROBOTIC):
   - Speak naturally, warmly, and directly like a trusted friend in a high-end tech showroom.
   - Read between the lines: understand *why* the customer needs the device (e.g., engineering college/AutoCAD needs high VRAM & 32GB RAM; coding & travel needs long battery, lightweight build, and an anti-glare display; content editing needs OLED color accuracy).
   - Never dump dry spec lists without explaining practical trade-offs in plain language (e.g., battery vs raw GPU power, future-proofing, value for money).
   - Keep replies concise, well-paced, and easy to scan—end with ONE smart, helpful question or next step when appropriate.
2. NATIVE FLUENCY IN EGYPTIAN ARABIC, MSA & ALL LANGUAGES:
   - Match the customer's exact dialect and tone automatically!
   - If Egyptian Arabic ("يا باشا"، "عايز حاجة للشغل"، "ميزانيتي كذا"): speak natural, respectful, friendly Egyptian Arabic without sounding stiff or overly formal.
   - If MSA Arabic, English, French, Spanish, German, Turkish, or any other language: reply natively in that exact language.
3. GOOGLE SEARCH & REAL-TIME STORE MEMORY:
   - You are directly connected to **Google Search** alongside our live store catalog tools.
   - Whenever customers greet you ("السلام عليكم", "أهلاً", "Hello"), answer warmly with an authentic human welcome and offer help right away.
   - Whenever customers ask general knowledge questions, hardware comparisons, benchmark numbers, latest tech/AI/OS news, software releases, or live currency exchange rates, actively use Google Search to give accurate, up-to-date answers grounded in real web information!
   - Remember previous turns cleanly (if they ask "طب التاني؟" or "فيه أرخص؟", carry forward their workload & budget seamlessly).
   - Use compareAndRecommendByUseCase or searchStoreProducts before quoting store specs, prices, discounts, or New Arrivals (${newArrivalsSummary.length} new items).
   - Use getStoreResources when asked about branch address, working hours, official OS downloads, or social channels.
4. DELETED / OUT-OF-STOCK RESTOCK PROMISE (CRITICAL):
   - If the customer asks about an item in deletedProductsHistory, marked inStock=false, or a specific GPU/laptop model unavailable in active stock, ALWAYS call registerRestockNotification and say warmly:
     "عذراً، هذا المنتج نفد/تم حذفه حالياً، سأسجل طلبك وسأرسل لك إشعاراً فور توفره"
     (or its warm equivalent in their language), plus suggest 1-2 realistic available alternatives if helpful.
5. STRICT SECURITY ISOLATION:
   - You only access public store catalog, new arrivals, deleted product logs, OS download links, branch location, social links, and public Google Search results.
   - NEVER reveal, guess, or discuss any admin PIN, secret order dispatch phone number, webhook URL, or private customer orders.

Real-Time Customer Intent Signal (use naturally, never quote raw keys):
- Detected Language: ${intent.detectedLang} (Egyptian dialect: ${intent.isEgyptianDialect})
- Primary Intent: ${intent.primaryIntent} | Workload: ${intent.useCase} | Budget: ${intent.budgetMax || 'unspecified'}
- Follow-up turn: ${intent.isFollowUpTurn} | Prefers laptop: ${intent.wantsLaptop} | Wants cheaper: ${intent.wantsLowerPrice}

Live Store Snapshot (synced from Firestore):
- Currency: ${ctx.currency || 'ج.م'}
- Branch: ${ctx.branchAddress || ''} (${ctx.workingHours || ''})
- Active Inventory (${catalogSummary.length}): ${JSON.stringify(catalogSummary)}
- New Arrivals (${newArrivalsSummary.length}): ${JSON.stringify(newArrivalsSummary)}
- Coming Soon / Out-of-Stock (${comingSoonSummary.length}): ${JSON.stringify(comingSoonSummary)}
- Deleted Products History (${deletedSummary.length}): ${JSON.stringify(deletedSummary)}
- Official Updates / Announcements: ${JSON.stringify(ctx.systemUpdates || [])}
`;

      const firstUserIdx = history.findIndex((turn) => turn.role === 'user');
      const validHistory = firstUserIdx >= 0 ? history.slice(firstUserIdx) : [];

      const contents: Array<Record<string, unknown>> = [
        ...validHistory.map((turn) => ({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(turn.text || '').slice(0, 1400) }],
        })),
        {
          role: 'user',
          parts: [{ text: rawMessage }],
        },
      ];

      const functionDecls = [
        searchStoreProductsDecl,
        compareAndRecommendByUseCaseDecl,
        registerRestockNotificationDecl,
        getStoreResourcesDecl,
      ];

      const tools = [
        { googleSearch: {} },
        {
          functionDeclarations: functionDecls,
        },
      ];
      const toolConfig = { includeServerSideToolInvocations: true };

      let recommendedProducts: PublicCatalogProduct[] = [];
      let unavailableRequested = false;
      let watchQuery: string | null = null;
      let matchedDeletedProductId: string | null = null;

      const isRateLimitOrQuotaError = (err: unknown): boolean => {
        const msg = err instanceof Error ? err.message : String(err || '');
        return /429|RESOURCE_EXHAUSTED|quota|rate[- ]?limit/i.test(msg);
      };

      try {
        let finalResponseText = '';
        const collectedSources = new Map<string, string>();

        const runWithTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
          Promise.race([
            promise,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Gemini request timed out')), ms)
            ),
          ]);

        const selectedModel = 'gemini-4-hydrogen';

        const callGeminiRound = async (
          roundContents: Array<Record<string, unknown>>,
          useTools: 'hybrid' | 'functions' | 'search' | 'none'
        ) => {
          const config: Record<string, unknown> = {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          };
          if (useTools === 'hybrid') {
            config.tools = tools;
            config.toolConfig = toolConfig;
          } else if (useTools === 'functions') {
            config.tools = [{ functionDeclarations: functionDecls }];
          } else if (useTools === 'search') {
            config.tools = [{ googleSearch: {} }];
          }
          return runWithTimeout(
            ai.models.generateContent({
              model: selectedModel,
              contents: roundContents as never,
              config: config as never,
            }),
            25000
          );
        };

        // Always link Google Search alongside store tools ('hybrid' mode) so greetings,
        // general questions, tech news, and catalog searches all benefit from live web grounding.
        let activeToolMode: 'hybrid' | 'functions' | 'search' | 'none' = 'hybrid';

        for (let round = 0; round < 3; round++) {
          let response;
          try {
            response = await callGeminiRound(contents, activeToolMode);
          } catch (tierErr) {
            if (activeToolMode === 'hybrid' && !isRateLimitOrQuotaError(tierErr)) {
              activeToolMode = 'search';
              try {
                response = await callGeminiRound(contents, 'search');
              } catch (searchErr) {
                if (!isRateLimitOrQuotaError(searchErr)) {
                  activeToolMode = 'functions';
                  response = await callGeminiRound(contents, 'functions');
                } else {
                  throw searchErr;
                }
              }
            } else if (activeToolMode === 'functions' && !isRateLimitOrQuotaError(tierErr)) {
              activeToolMode = 'none';
              response = await callGeminiRound(contents, 'none');
            } else {
              throw tierErr;
            }
          }

          const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (Array.isArray(groundingChunks)) {
            for (const chunk of groundingChunks) {
              const web = (chunk as { web?: { uri?: string; title?: string } }).web;
              if (web?.uri && !collectedSources.has(web.uri)) {
                let fallbackTitle = web.title;
                if (!fallbackTitle) {
                  try {
                    fallbackTitle = new URL(web.uri).hostname;
                  } catch {
                    fallbackTitle = web.uri;
                  }
                }
                collectedSources.set(web.uri, fallbackTitle);
              }
            }
          }

          const previousContent = response.candidates?.[0]?.content;
          const calls = response.functionCalls;

          if (!calls || calls.length === 0 || !previousContent) {
            finalResponseText = response.text?.trim() || '';
            break;
          }

          contents.push(previousContent as unknown as Record<string, unknown>);
          const functionResponses: Array<Record<string, unknown>> = [];

          for (const call of calls) {
            if (call.name === 'searchStoreProducts') {
              const args = (call.args || {}) as {
                query?: string;
                categoryGroup?: string;
                maxPrice?: number;
                inStockOnly?: boolean;
              };
              const found = findMatchingCatalogAndDeleted(
                args.query || rawMessage,
                products,
                deletedHistory,
                {
                  categoryGroup: args.categoryGroup,
                  maxPrice: args.maxPrice,
                  inStockOnly: args.inStockOnly,
                }
              );
              if (found.matchedProducts.length > 0) {
                recommendedProducts = found.matchedProducts.slice(0, 3);
              }
              functionResponses.push({
                functionResponse: {
                  id: call.id,
                  name: call.name,
                  response: {
                    availableProducts: found.matchedProducts.map((p) => ({
                      id: p.id,
                      nameAr: p.nameAr,
                      nameEn: p.nameEn,
                      brand: p.brand,
                      specsAr: p.specsAr,
                      specsEn: p.specsEn,
                      price: p.price,
                      discountPercent: p.discountPercent,
                      finalPrice: computeAgentFinalPrice(p.price, p.discountPercent || 0),
                      inStock: p.inStock,
                    })),
                    deletedOrOutOfStockMatches: found.matchedDeleted,
                  },
                },
              });
            } else if (call.name === 'compareAndRecommendByUseCase') {
              const args = (call.args || {}) as {
                useCase?: AgentUseCase;
                maxBudget?: number;
                preferLaptop?: boolean;
              };
              const ranked = scoreAndSelectRecommendations(products, {
                ...intent,
                useCase: args.useCase || intent.useCase,
                budgetMax:
                  typeof args.maxBudget === 'number' && args.maxBudget > 0
                    ? args.maxBudget
                    : intent.budgetMax,
                wantsLaptop:
                  typeof args.preferLaptop === 'boolean' ? args.preferLaptop : intent.wantsLaptop,
              });
              if (ranked.length > 0) {
                recommendedProducts = ranked;
              }
              functionResponses.push({
                functionResponse: {
                  id: call.id,
                  name: call.name,
                  response: {
                    topRankedProducts: ranked.map((p) => ({
                      id: p.id,
                      nameAr: p.nameAr,
                      nameEn: p.nameEn,
                      brand: p.brand,
                      specsAr: p.specsAr,
                      specsEn: p.specsEn,
                      price: p.price,
                      discountPercent: p.discountPercent,
                      finalPrice: computeAgentFinalPrice(p.price, p.discountPercent || 0),
                      inStock: p.inStock,
                    })),
                  },
                },
              });
            } else if (call.name === 'registerRestockNotification') {
              const args = (call.args || {}) as {
                productQuery?: string;
                matchedDeletedProductId?: string;
              };
              unavailableRequested = true;
              watchQuery = (args.productQuery || rawMessage).trim();
              matchedDeletedProductId =
                args.matchedDeletedProductId ||
                initialSearch.matchedDeleted[0]?.id ||
                intent.outOfStockMatch?.id ||
                null;
              functionResponses.push({
                functionResponse: {
                  id: call.id,
                  name: call.name,
                  response: {
                    registered: true,
                    watchQuery,
                    matchedDeletedProductId,
                  },
                },
              });
            } else if (call.name === 'getStoreResources') {
              functionResponses.push({
                functionResponse: {
                  id: call.id,
                  name: call.name,
                  response: {
                    branchAddress: ctx.branchAddress || '',
                    workingHours: ctx.workingHours || '',
                    socialLinks: ctx.socialLinks || {},
                    osDownloads: ctx.osDownloads || [],
                  },
                },
              });
            }
          }

          contents.push({
            role: 'user',
            parts: functionResponses,
          });
        }

        if (intent.primaryIntent === 'deleted_or_out_of_stock' && !unavailableRequested) {
          unavailableRequested = true;
          watchQuery = rawMessage;
          matchedDeletedProductId =
            initialSearch.matchedDeleted[0]?.id || intent.outOfStockMatch?.id || null;
        }

        if (
          recommendedProducts.length === 0 &&
          intent.primaryIntent !== 'greeting_smalltalk' &&
          intent.primaryIntent !== 'branch_and_hours' &&
          intent.primaryIntent !== 'security_sensitive'
        ) {
          const smartPicks = scoreAndSelectRecommendations(products, intent);
          if (smartPicks.length > 0 && intent.matchedProducts.length > 0) {
            recommendedProducts = smartPicks;
          }
        }

        const sources = Array.from(collectedSources.entries())
          .slice(0, 4)
          .map(([uri, title]) => ({ uri, title }));

        res.json({
          reply: finalResponseText || buildFallbackReply().reply,
          unavailableRequested,
          watchQuery,
          matchedDeletedProductId,
          recommendedProducts: recommendedProducts.map((p) => ({
            id: p.id,
            nameAr: p.nameAr,
            nameEn: p.nameEn,
            brand: p.brand || '',
            price: p.price,
            discountPercent: p.discountPercent || 0,
            finalPrice: computeAgentFinalPrice(p.price, p.discountPercent || 0),
            imageUrl: p.imageUrl || '/pwa-512x512.png',
            inStock: p.inStock,
          })),
          sources,
          aiConfigured: true,
          model: selectedModel,
          intent: intent.primaryIntent,
          aiMode: activeToolMode,
        });
      } catch (genErr) {
        const msg = genErr instanceof Error ? genErr.message : String(genErr || '');
        console.error('Gemini chat generation error:', msg);
        if (/PERMISSION_DENIED|API_KEY_INVALID|403/i.test(msg)) {
          res.status(401).json({
            error:
              uiLang === 'ar'
                ? 'مفتاح Gemini API غير صالح أو يحتاج إلى تفعيل من إعدادات الأسرار.'
                : 'Gemini API key is invalid or requires activation in Settings > Secrets.',
          });
          return;
        }
        const fallbackPayload = buildFallbackReply();
        res.json({
          ...fallbackPayload,
          aiMode: isRateLimitOrQuotaError(genErr) ? 'quota_fallback' : 'resilient_fallback',
        });
      }
    } catch (err) {
      console.error('Assistant error:', err);
      res.status(500).json({
        error: 'حدث خطأ مؤقت في خدمة العملاء الذكية. يرجى المحاولة مرة أخرى.',
      });
    }
  });

  app.post('/api/orders/dispatch', async (req, res) => {
    try {
      const body = req.body as {
        orderId?: string;
        customerName?: string;
        customerAddress?: string;
        customerPhone?: string;
        note?: string;
        total?: number;
        currency?: string;
        items?: Array<{ nameAr?: string; nameEn?: string; quantity?: number; unitPrice?: number }>;
        targetWhatsappNumber?: string;
        webhookUrl?: string;
      };

      if (!body?.customerName || !body?.customerAddress || !body?.customerPhone) {
        res.status(400).json({ error: 'بيانات الطلب الأساسية غير مكتملة.' });
        return;
      }

      const orderId = body.orderId || `ORD-${Date.now().toString(36).toUpperCase()}`;
      const formattedWhatsappText = buildFormattedWhatsappText({
        orderId,
        customerName: body.customerName,
        customerAddress: body.customerAddress,
        customerPhone: body.customerPhone,
        note: body.note,
        total: Number(body.total || 0),
        currency: body.currency || 'ج.م',
        items: Array.isArray(body.items) ? body.items : [],
      });

      const DEFAULT_ORDERS_WHATSAPP_NUMBER = '201025134582';
      let rawTargetDigits = sanitizePhoneDigits(
        body.targetWhatsappNumber || DEFAULT_ORDERS_WHATSAPP_NUMBER
      );
      if (rawTargetDigits.startsWith('01') && rawTargetDigits.length === 11) {
        rawTargetDigits = `2${rawTargetDigits}`;
      }
      const targetDigits = rawTargetDigits || DEFAULT_ORDERS_WHATSAPP_NUMBER;

      let dispatchStatus:
        | 'opened_whatsapp_client'
        | 'sent_via_cloud_api'
        | 'sent_via_gateway'
        | 'sent_via_webhook'
        | 'saved_in_admin' = 'opened_whatsapp_client';

      // Optional Admin-configured HTTPS Order Webhook (SSRF-validated)
      if (
        body.webhookUrl &&
        typeof body.webhookUrl === 'string' &&
        body.webhookUrl.trim()
      ) {
        const safeUrl = await validatePublicWebhookUrl(body.webhookUrl);
        if (safeUrl) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const hookRes = await fetch(safeUrl.toString(), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                event: 'whatsapp_order_dispatch',
                toWhatsappNumber: targetDigits,
                senderName: body.customerName,
                senderPhone: body.customerPhone,
                orderId,
                customerAddress: body.customerAddress,
                note: body.note || '',
                total: body.total,
                currency: body.currency || 'ج.م',
                items: body.items || [],
                message: formattedWhatsappText,
                submittedAt: new Date().toISOString(),
              }),
            });
            clearTimeout(timeout);
            if (hookRes.ok) {
              dispatchStatus = 'sent_via_webhook';
            }
          } catch {
            // Persisted in Firestore cleanly
          }
        }
      }

      res.json({
        ok: true,
        orderId,
        dispatchStatus,
        formattedWhatsappText,
      });
    } catch (err) {
      console.error('Order dispatch error:', err);
      res.status(500).json({ error: 'تعذر معالجة إرسال الطلب.' });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tech Store server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
