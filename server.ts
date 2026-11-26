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
import {
  buildDynamicManifestObject,
  DEFAULT_PWA_ENGLISH_NAME,
  DEFAULT_PWA_ENGLISH_TAGLINE,
  resolvePwaEnglishName,
} from './src/utils/pwaLogic';
import { buildZipArchive } from './src/utils/zipBuilder';
import {
  buildAndroidProjectFiles,
  buildAssetLinksJson,
  DEFAULT_ANDROID_PACKAGE_ID,
  PLAY_STORE_MIN_SDK,
  PLAY_STORE_TARGET_SDK,
  sanitizeAndroidPackageId,
} from './src/utils/androidProjectGenerator';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const RELEASES_DIR = path.resolve(UPLOADS_DIR, 'releases');
fs.mkdirSync(RELEASES_DIR, { recursive: true });

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const STORE_FIRESTORE_REST_URL =
  'https://firestore.googleapis.com/v1/projects/ashraf-gold/databases/(default)/documents/computer_tech_store/main_data';

const androidReleaseConfig = {
  packageId: DEFAULT_ANDROID_PACKAGE_ID,
  versionCode: 1,
  versionName: '1.0.0',
  sha256Fingerprint: '',
  siteUrlOverride: '',
};

type PwaIconVariant = '180' | '192' | '512' | 'maskable-512';

interface PwaBrandState {
  storeNameEn: string;
  taglineEn: string;
  version: string;
  iconSourceKey: string;
  iconBuffers: Record<PwaIconVariant, Buffer | null>;
}

const pwaBrandState: PwaBrandState = {
  storeNameEn: DEFAULT_PWA_ENGLISH_NAME,
  taglineEn: DEFAULT_PWA_ENGLISH_TAGLINE,
  version: String(Date.now()),
  iconSourceKey: 'default',
  iconBuffers: {
    '180': null,
    '192': null,
    '512': null,
    'maskable-512': null,
  },
};

function decodeImageDataUrl(dataUrl?: string): Buffer | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return null;
  const buf = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
  if (buf.length === 0 || buf.length > 600 * 1024) return null;
  return buf;
}

function detectImageMimeType(buf: Buffer): string {
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return 'image/png';
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buf.length >= 4 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) {
    return 'image/webp';
  }
  return 'image/png';
}

async function hydrateBrandFromFirestore(): Promise<void> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(STORE_FIRESTORE_REST_URL, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return;
    const docJson = (await res.json()) as {
      fields?: {
        settings?: {
          mapValue?: {
            fields?: {
              storeNameEn?: { stringValue?: string };
              taglineEn?: { stringValue?: string };
              storeIconUrl?: { stringValue?: string };
            };
          };
        };
      };
    };
    const settingsFields = docJson?.fields?.settings?.mapValue?.fields;
    if (!settingsFields) return;

    const remoteEn = settingsFields.storeNameEn?.stringValue;
    const remoteTagline = settingsFields.taglineEn?.stringValue;
    const remoteIcon = settingsFields.storeIconUrl?.stringValue;

    if (remoteEn && remoteEn.trim()) {
      pwaBrandState.storeNameEn = resolvePwaEnglishName(remoteEn);
    }
    if (remoteTagline && remoteTagline.trim()) {
      pwaBrandState.taglineEn = remoteTagline.trim();
    }
    if (remoteIcon && remoteIcon.startsWith('data:image/')) {
      const buf = decodeImageDataUrl(remoteIcon);
      if (buf) {
        pwaBrandState.iconBuffers['180'] = buf;
        pwaBrandState.iconBuffers['192'] = buf;
        pwaBrandState.iconBuffers['512'] = buf;
        pwaBrandState.iconBuffers['maskable-512'] = buf;
        pwaBrandState.iconSourceKey = `${pwaBrandState.storeNameEn}::firestore`;
      }
    }
    pwaBrandState.version = String(Date.now());
  } catch {
    // Keep clean defaults if Firestore is temporarily unreachable at boot
  }
}

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

  // Binary APK / AAB upload endpoint (up to 120MB) — mounted before express.json
  app.post(
    '/api/admin/files/upload/:kind',
    express.raw({
      type: () => true,
      limit: '120mb',
    }),
    async (req, res) => {
      try {
        const kind = String(req.params.kind || '').toLowerCase();
        if (kind !== 'apk' && kind !== 'aab') {
          res.status(400).json({ error: 'صيغة الملف يجب أن تكون apk أو aab فقط.' });
          return;
        }
        const buffer = req.body as Buffer;
        if (!Buffer.isBuffer(buffer) || buffer.length < 100) {
          res.status(400).json({ error: 'الملف المرفوع فارغ أو غير مكتمل.' });
          return;
        }
        // Real APK and AAB files are ZIP containers starting with PK\x03\x04
        if (buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
          res.status(400).json({
            error:
              kind === 'apk'
                ? 'ملف APK غير صالح (يجب أن يكون ملف أندرويد مترجم بصيغة APK حقيقية).'
                : 'ملف AAB غير صالح (يجب أن يكون حزمة أندرويد App Bundle بصيغة AAB حقيقية).',
          });
          return;
        }

        const fileName = kind === 'apk' ? 'app-release.apk' : 'app-release.aab';
        const dest = path.resolve(RELEASES_DIR, fileName);
        if (!dest.startsWith(RELEASES_DIR + path.sep)) {
          res.status(400).json({ error: 'مسار غير صالح.' });
          return;
        }
        await fs.promises.writeFile(dest, buffer);
        const stats = await fs.promises.stat(dest);
        res.status(201).json({
          ok: true,
          kind,
          sizeBytes: stats.size,
          updatedAt: stats.mtime.toISOString(),
          downloadUrl: `/api/admin/files/download/${kind}`,
        });
      } catch (err) {
        console.error('Release binary upload failed:', err);
        res.status(500).json({ error: 'تعذر حفظ ملف التطبيق على الخادم.' });
      }
    }
  );

  app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));
  app.use(express.json({ limit: '2mb' }));

  void hydrateBrandFromFirestore();

  app.get(['/manifest.json', '/manifest.webmanifest'], (req, res) => {
    const host = req.get('host') || `localhost:${PORT}`;
    const proto = req.headers['x-forwarded-proto']
      ? String(req.headers['x-forwarded-proto']).split(',')[0].trim()
      : req.protocol || 'http';
    const manifest = buildDynamicManifestObject({
      storeNameEn: pwaBrandState.storeNameEn,
      taglineEn: pwaBrandState.taglineEn,
      version: pwaBrandState.version,
      origin: `${proto}://${host}`,
    });
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json(manifest);
  });

  app.get('/.well-known/assetlinks.json', (_req, res) => {
    const links = buildAssetLinksJson(
      androidReleaseConfig.packageId,
      androidReleaseConfig.sha256Fingerprint ? [androidReleaseConfig.sha256Fingerprint] : []
    );
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.json(links);
  });

  app.get('/api/admin/files/status', async (req, res) => {
    const host = req.get('host') || `localhost:${PORT}`;
    const proto = req.headers['x-forwarded-proto']
      ? String(req.headers['x-forwarded-proto']).split(',')[0].trim()
      : req.protocol || 'http';
    const liveOrigin = `${proto}://${host}`;

    const inspectRelease = async (kind: 'apk' | 'aab') => {
      const target = path.resolve(RELEASES_DIR, kind === 'apk' ? 'app-release.apk' : 'app-release.aab');
      try {
        const st = await fs.promises.stat(target);
        return {
          exists: true,
          sizeBytes: st.size,
          updatedAt: st.mtime.toISOString(),
          downloadUrl: `/api/admin/files/download/${kind}`,
        };
      } catch {
        return {
          exists: false,
          sizeBytes: 0,
          updatedAt: null,
          downloadUrl: `/api/admin/files/download/${kind}`,
        };
      }
    };

    const [apk, aab] = await Promise.all([inspectRelease('apk'), inspectRelease('aab')]);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      storeNameEn: pwaBrandState.storeNameEn,
      liveOrigin,
      firebaseProjectId: 'ashraf-gold',
      firestoreDocPath: 'computer_tech_store/main_data',
      targetSdk: PLAY_STORE_TARGET_SDK,
      minSdk: PLAY_STORE_MIN_SDK,
      config: androidReleaseConfig,
      apk,
      aab,
    });
  });

  app.post('/api/admin/files/config', (req, res) => {
    const body = req.body as {
      packageId?: string;
      versionCode?: number;
      versionName?: string;
      sha256Fingerprint?: string;
      siteUrlOverride?: string;
    };
    androidReleaseConfig.packageId = sanitizeAndroidPackageId(
      body?.packageId,
      pwaBrandState.storeNameEn
    );
    if (Number.isFinite(body?.versionCode) && Number(body.versionCode) >= 1) {
      androidReleaseConfig.versionCode = Math.floor(Number(body.versionCode));
    }
    if (
      typeof body?.versionName === 'string' &&
      /^\d+\.\d+(\.\d+)?$/.test(body.versionName.trim())
    ) {
      androidReleaseConfig.versionName = body.versionName.trim();
    }
    if (typeof body?.sha256Fingerprint === 'string') {
      androidReleaseConfig.sha256Fingerprint = body.sha256Fingerprint.trim().toUpperCase();
    }
    if (typeof body?.siteUrlOverride === 'string') {
      androidReleaseConfig.siteUrlOverride = body.siteUrlOverride.trim();
    }
    res.json({ ok: true, config: androidReleaseConfig });
  });

  app.get('/api/admin/files/android-project.zip', async (req, res) => {
    try {
      const host = req.get('host') || `localhost:${PORT}`;
      const proto = req.headers['x-forwarded-proto']
        ? String(req.headers['x-forwarded-proto']).split(',')[0].trim()
        : req.protocol || 'http';
      const defaultOrigin = `${proto}://${host}`;
      const querySiteUrl = typeof req.query.siteUrl === 'string' ? req.query.siteUrl.trim() : '';
      const websiteOrigin = querySiteUrl || androidReleaseConfig.siteUrlOverride || defaultOrigin;

      const packageId = sanitizeAndroidPackageId(
        typeof req.query.packageId === 'string' ? req.query.packageId : androidReleaseConfig.packageId,
        pwaBrandState.storeNameEn
      );
      const versionCode = Number(req.query.versionCode || androidReleaseConfig.versionCode || 1);
      const versionName =
        typeof req.query.versionName === 'string' && req.query.versionName.trim()
          ? req.query.versionName.trim()
          : androidReleaseConfig.versionName;
      const sha256 =
        typeof req.query.sha256 === 'string' && req.query.sha256.trim()
          ? req.query.sha256.trim()
          : androidReleaseConfig.sha256Fingerprint;

      const readFallbackPng = async (variant: PwaIconVariant, fallbackFile: string): Promise<Buffer | null> => {
        if (pwaBrandState.iconBuffers[variant]) return pwaBrandState.iconBuffers[variant];
        const fp = path.join(PUBLIC_DIR, fallbackFile);
        try {
          return await fs.promises.readFile(fp);
        } catch {
          return null;
        }
      };

      const [icon512, icon192] = await Promise.all([
        readFallbackPng('512', 'pwa-512x512.png'),
        readFallbackPng('192', 'pwa-192x192.png'),
      ]);

      const entries = buildAndroidProjectFiles({
        storeNameEn: pwaBrandState.storeNameEn,
        websiteOrigin,
        packageId,
        versionCode,
        versionName,
        sha256Fingerprint: sha256,
        firebaseProjectId: 'ashraf-gold',
        firestoreDocPath: 'computer_tech_store/main_data',
        iconPng512: icon512,
        iconPng192: icon192,
      });

      const zipBuf = buildZipArchive(entries);
      const slug = resolvePwaEnglishName(pwaBrandState.storeNameEn)
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${slug || 'Al-Nour-Computer'}-Android-PlayStore-Project.zip"`
      );
      res.setHeader('Cache-Control', 'no-store');
      res.send(zipBuf);
    } catch (err) {
      console.error('Failed to generate Android project zip:', err);
      res.status(500).json({ error: 'تعذر إنشاء حزمة مشروع الأندرويد.' });
    }
  });

  app.get('/api/admin/files/download/:kind', async (req, res) => {
    const kind = String(req.params.kind || '').toLowerCase();
    if (kind !== 'apk' && kind !== 'aab') {
      res.status(404).end();
      return;
    }
    const target = path.resolve(RELEASES_DIR, kind === 'apk' ? 'app-release.apk' : 'app-release.aab');
    if (!fs.existsSync(target)) {
      res.status(404).json({ error: 'لم يتم رفع هذا الملف بعد في لوحة الإدارة.' });
      return;
    }
    const slug = resolvePwaEnglishName(pwaBrandState.storeNameEn)
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    res.setHeader(
      'Content-Type',
      kind === 'apk' ? 'application/vnd.android.package-archive' : 'application/octet-stream'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${slug || 'Al-Nour-Computer'}.${kind}"`
    );
    res.sendFile(target);
  });

  app.delete('/api/admin/files/:kind', async (req, res) => {
    const kind = String(req.params.kind || '').toLowerCase();
    if (kind !== 'apk' && kind !== 'aab') {
      res.status(400).json({ error: 'صيغة غير صالحة.' });
      return;
    }
    const target = path.resolve(RELEASES_DIR, kind === 'apk' ? 'app-release.apk' : 'app-release.aab');
    try {
      await fs.promises.unlink(target);
    } catch {
      // ignore if missing
    }
    res.json({ ok: true });
  });

  app.get('/api/pwa/branding', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      storeNameEn: pwaBrandState.storeNameEn,
      taglineEn: pwaBrandState.taglineEn,
      version: pwaBrandState.version,
      iconSourceKey: pwaBrandState.iconSourceKey,
    });
  });

  app.post('/api/pwa/branding', (req, res) => {
    const body = req.body as {
      storeNameEn?: string;
      taglineEn?: string;
      iconSourceKey?: string;
      icon180DataUrl?: string;
      icon192DataUrl?: string;
      icon512DataUrl?: string;
      iconMaskable512DataUrl?: string;
    };

    const nextNameEn = resolvePwaEnglishName(body?.storeNameEn || pwaBrandState.storeNameEn);
    const nextTaglineEn =
      typeof body?.taglineEn === 'string' && body.taglineEn.trim()
        ? body.taglineEn.trim().slice(0, 180)
        : DEFAULT_PWA_ENGLISH_TAGLINE;
    const nextSourceKey =
      typeof body?.iconSourceKey === 'string' && body.iconSourceKey.trim()
        ? body.iconSourceKey.trim()
        : pwaBrandState.iconSourceKey;

    const b180 = decodeImageDataUrl(body?.icon180DataUrl);
    const b192 = decodeImageDataUrl(body?.icon192DataUrl);
    const b512 = decodeImageDataUrl(body?.icon512DataUrl);
    const bMask = decodeImageDataUrl(body?.iconMaskable512DataUrl);

    let changed =
      nextNameEn !== pwaBrandState.storeNameEn ||
      nextTaglineEn !== pwaBrandState.taglineEn ||
      nextSourceKey !== pwaBrandState.iconSourceKey;

    pwaBrandState.storeNameEn = nextNameEn;
    pwaBrandState.taglineEn = nextTaglineEn;
    pwaBrandState.iconSourceKey = nextSourceKey;

    if (b180) {
      pwaBrandState.iconBuffers['180'] = b180;
      changed = true;
    }
    if (b192) {
      pwaBrandState.iconBuffers['192'] = b192;
      changed = true;
    }
    if (b512) {
      pwaBrandState.iconBuffers['512'] = b512;
      changed = true;
    }
    if (bMask) {
      pwaBrandState.iconBuffers['maskable-512'] = bMask;
      changed = true;
    }

    if (changed) {
      pwaBrandState.version = String(Date.now());
    }

    res.json({
      ok: true,
      storeNameEn: pwaBrandState.storeNameEn,
      version: pwaBrandState.version,
    });
  });

  app.get('/api/pwa-icon/:variant', async (req, res) => {
    const rawVariant = String(req.params.variant || '').replace(/\.png$/i, '');
    const fallbackFileByVariant: Record<PwaIconVariant, string> = {
      '180': 'apple-touch-icon.png',
      '192': 'pwa-192x192.png',
      '512': 'pwa-512x512.png',
      'maskable-512': 'pwa-maskable-512x512.png',
    };

    if (!(rawVariant in fallbackFileByVariant)) {
      res.status(404).end();
      return;
    }

    const variant = rawVariant as PwaIconVariant;
    const customBuf = pwaBrandState.iconBuffers[variant];
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    if (customBuf) {
      res.setHeader('Content-Type', detectImageMimeType(customBuf));
      res.send(customBuf);
      return;
    }

    const fallbackPath = path.join(PUBLIC_DIR, fallbackFileByVariant[variant]);
    if (fs.existsSync(fallbackPath)) {
      res.sendFile(fallbackPath);
      return;
    }
    res.status(404).end();
  });

  app.get('/api/assistant/status', (_req, res) => {
    const ai = getAiClient();
    res.json({
      configured: Boolean(ai),
      model: 'gemini-4-hydrogen',
      thinkingLevel: 'MEDIUM',
      googleSearchLinked: true,
      adminIsolated: true,
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
        'strict_admin_privacy',
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

      // Strict deterministic Admin & Customer Order isolation before invoking Gemini
      if (intent.primaryIntent === 'security_sensitive') {
        res.json({
          ...buildFallbackReply(),
          aiMode: 'security_guard',
        });
        return;
      }

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

      const systemInstruction = `You are "طارق / Tarek", an extraordinarily perceptive, warm, human Senior Hardware & Tech Advisor representing "${ctx.storeNameAr || 'النور للكمبيوتر'} / ${ctx.storeNameEn || 'Al-Nour Computer'}".

How You Speak & Think Like an Intelligent Human Advisor:
1. GENUINE HUMAN PRESENCE (NEVER ROBOTIC):
   - Speak naturally, warmly, and directly on behalf of Al-Nour Computer like a trusted friend in a high-end tech showroom.
   - Read between the lines: understand *why* the customer needs the device (e.g., engineering college/AutoCAD needs high VRAM & 32GB RAM; coding & travel needs long battery, lightweight build, and an anti-glare display; content editing needs OLED color accuracy).
   - Never dump dry spec lists without explaining practical trade-offs in plain language (e.g., battery vs raw GPU power, future-proofing, value for money).
   - Keep replies concise, well-paced, and easy to scan—end with ONE smart, helpful question or next step when appropriate.
2. NATIVE FLUENCY IN EGYPTIAN ARABIC, MSA & ALL LANGUAGES:
   - Match the customer's exact dialect and tone automatically!
   - If Egyptian Arabic ("يا باشا"، "عايز حاجة للشغل"، "ميزانيتي كذا"): speak natural, respectful, friendly Egyptian Arabic without sounding stiff or overly formal.
   - If MSA Arabic, English, French, Spanish, German, Turkish, or any other language: reply natively in that exact language.
3. GOOGLE SEARCH & INTERNET CONNECTIVITY:
   - You are directly connected to the internet via **Google Search** alongside our live store catalog tools.
   - Whenever customers greet you ("السلام عليكم", "أهلاً", "Hello"), answer warmly with an authentic human welcome on behalf of Al-Nour Computer and offer help right away.
   - Whenever customers ask general knowledge questions, hardware comparisons, benchmark numbers, latest tech/AI/OS news, software releases, or live currency exchange rates, actively use Google Search to give accurate, up-to-date answers grounded in real web information!
   - Remember previous turns cleanly (if they ask "طب التاني؟" or "فيه أرخص؟", carry forward their workload & budget seamlessly).
   - Use compareAndRecommendByUseCase or searchStoreProducts before quoting store specs, prices, discounts, or New Arrivals (${newArrivalsSummary.length} new items).
   - Use getStoreResources when asked about branch address, working hours, official OS downloads, or social channels.
4. DELETED / OUT-OF-STOCK RESTOCK PROMISE (CRITICAL):
   - If the customer asks about an item in deletedProductsHistory, marked inStock=false, or a specific GPU/laptop model unavailable in active stock, ALWAYS call registerRestockNotification and say warmly:
     "عذراً، هذا المنتج نفد/تم حذفه حالياً، سأسجل طلبك وسأرسل لك إشعاراً فور توفره"
     (or its warm equivalent in their language), plus suggest 1-2 realistic available alternatives if helpful.
5. STRICT ADMIN PRIVACY & HIDING (ZERO EXCEPTIONS):
   - Everything belonging to the Administration is STRICTLY HIDDEN from you and from customers.
   - You only access public store catalog, new arrivals, deleted product logs, OS download links, branch location, social links, and public Google Search results.
   - NEVER reveal, guess, discuss, or acknowledge any admin dashboard records, incoming customer orders, customer phone numbers or addresses, admin PINs, secret order dispatch numbers, or internal webhook URLs.

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
            thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
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
          intent.primaryIntent !== 'branch_and_hours'
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
