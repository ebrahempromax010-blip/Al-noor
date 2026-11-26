import { resolvePwaEnglishName } from './pwaLogic';

interface GeneratedIconSet {
  icon180DataUrl: string;
  icon192DataUrl: string;
  icon512DataUrl: string;
  iconMaskable512DataUrl: string;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load store icon for PWA rendering'));
    img.src = src;
  });
}

function renderSquarePng(
  img: HTMLImageElement,
  size: number,
  paddingRatio: number = 0,
  bgColor: string = '#0A0F1C'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  const pad = Math.round(size * paddingRatio);
  const drawSize = size - pad * 2;
  const aspect = img.width / Math.max(1, img.height);
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (aspect > 1) {
    sw = img.height;
    sx = Math.round((img.width - sw) / 2);
  } else if (aspect < 1) {
    sh = img.width;
    sy = Math.round((img.height - sh) / 2);
  }

  ctx.drawImage(img, sx, sy, sw, sh, pad, pad, drawSize, drawSize);
  return canvas.toDataURL('image/png');
}

async function generatePngIconSet(iconUrl: string): Promise<GeneratedIconSet | null> {
  try {
    const img = await loadImageElement(iconUrl);
    const icon180DataUrl = renderSquarePng(img, 180, 0);
    const icon192DataUrl = renderSquarePng(img, 192, 0);
    const icon512DataUrl = renderSquarePng(img, 512, 0);
    const iconMaskable512DataUrl = renderSquarePng(img, 512, 0.12);
    if (!icon192DataUrl || !icon512DataUrl) return null;
    return {
      icon180DataUrl,
      icon192DataUrl,
      icon512DataUrl,
      iconMaskable512DataUrl,
    };
  } catch {
    return null;
  }
}

function updateDomPwaTags(englishName: string, version: string) {
  const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appleTitle) {
    appleTitle.setAttribute('content', englishName);
  }

  const v = encodeURIComponent(version);
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (manifestLink) {
    manifestLink.setAttribute('href', `/manifest.json?v=${v}`);
  }

  const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if (appleIcon) {
    appleIcon.setAttribute('href', `/api/pwa-icon/180.png?v=${v}`);
  }

  const pngFavicon = document.querySelector('link[rel="icon"][type="image/png"]');
  if (pngFavicon) {
    pngFavicon.setAttribute('href', `/api/pwa-icon/192.png?v=${v}`);
  }
}

export async function syncDynamicPwaBranding(params: {
  storeNameEn: string;
  taglineEn: string;
  storeIconUrl: string;
}): Promise<void> {
  const englishName = resolvePwaEnglishName(params.storeNameEn);
  const taglineEn = String(params.taglineEn || '').trim();
  const iconSourceKey = `${englishName}::${params.storeIconUrl || '/pwa-512x512.png'}`;

  const icons = await generatePngIconSet(params.storeIconUrl || '/pwa-512x512.png');

  try {
    const res = await fetch('/api/pwa/branding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeNameEn: englishName,
        taglineEn,
        iconSourceKey,
        ...(icons || {}),
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { version?: string };
      updateDomPwaTags(englishName, data.version || String(Date.now()));
    } else {
      updateDomPwaTags(englishName, String(Date.now()));
    }
  } catch {
    updateDomPwaTags(englishName, String(Date.now()));
  }
}
