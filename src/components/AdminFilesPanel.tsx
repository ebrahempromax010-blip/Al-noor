import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Download,
  ExternalLink,
  FolderArchive,
  Loader2,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
} from 'lucide-react';
import { Language, StoreData, UploadedAppBinary } from '../types/store';
import {
  formatFileSizeLabel,
  resolvePwaEnglishName,
  validateUploadedAppBinaryFile,
} from '../utils/pwaLogic';
import { sanitizeAndroidPackageId } from '../utils/androidProjectGenerator';

interface FilesStatusResponse {
  storeNameEn: string;
  iconVersion: string;
  liveOrigin: string;
  cloudApkEligible: boolean;
  firebaseProjectId: string;
  firestoreDocPath: string;
  targetSdk: number;
  minSdk: number;
  config: {
    packageId: string;
    versionCode: number;
    versionName: string;
    sha256Fingerprint: string;
    siteUrlOverride: string;
  };
}

interface AdminFilesPanelProps {
  lang: Language;
  storeData: StoreData;
  onSaveStoreData: (nextData: StoreData, successMsg: string) => Promise<void>;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function extractFilenameFromDisposition(header: string | null, fallbackName: string): string {
  if (!header) return fallbackName;
  const match = header.match(/filename="?([^";\n]+)"?/i);
  return match?.[1]?.trim() || fallbackName;
}

export const AdminFilesPanel: React.FC<AdminFilesPanelProps> = ({
  lang,
  storeData,
  onSaveStoreData,
}) => {
  const [status, setStatus] = useState<FilesStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingKind, setDownloadingKind] = useState<'apk' | 'aab' | 'aab-kit' | null>(null);
  const [uploadingPlatform, setUploadingPlatform] = useState<'android' | 'ios' | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const englishAppName = resolvePwaEnglishName(storeData.settings.storeNameEn);
  const [packageId, setPackageId] = useState(() =>
    sanitizeAndroidPackageId('', englishAppName)
  );
  const [versionCode, setVersionCode] = useState('1');
  const [versionName, setVersionName] = useState('1.0.0');
  const [sha256, setSha256] = useState('');

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/files/status');
      if (res.ok) {
        const data = (await res.json()) as FilesStatusResponse;
        setStatus(data);
        if (data.config) {
          setPackageId(data.config.packageId || sanitizeAndroidPackageId('', englishAppName));
          setVersionCode(String(data.config.versionCode || 1));
          setVersionName(data.config.versionName || '1.0.0');
          setSha256(data.config.sha256Fingerprint || '');
        }
      }
    } catch {
      // Keep UI responsive
    } finally {
      setLoading(false);
    }
  }, [englishAppName]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const activeOrigin =
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    status?.liveOrigin ||
    storeData.settings.siteUrl;

  const handleSaveBuildConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setErrorMsg('');
    setNotice('');
    try {
      const res = await fetch('/api/admin/files/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId,
          versionCode: Number(versionCode) || 1,
          versionName,
          sha256Fingerprint: sha256,
          siteUrlOverride: activeOrigin,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      await fetchStatus();
      setNotice(
        lang === 'ar'
          ? 'تم حفظ إعدادات الحزمة وربطها بالمتجر وFirestore وmanifest.json وsw.js بنجاح.'
          : 'Release configuration saved & synced with live Store, Firestore, manifest.json & sw.js.'
      );
    } catch {
      setErrorMsg(
        lang === 'ar'
          ? 'تعذر حفظ الإعدادات. يرجى التحقق من القيم.'
          : 'Failed to save configuration.'
      );
    } finally {
      setSavingConfig(false);
    }
  };

  const handleGenerateAndDownload = async (
    kind: 'apk' | 'aab',
    opts?: { includeKit?: boolean; forceSource?: boolean }
  ) => {
    const busyKey = opts?.includeKit ? 'aab-kit' : kind;
    setDownloadingKind(busyKey);
    setErrorMsg('');
    setNotice('');
    try {
      const params = new URLSearchParams({
        packageId,
        versionCode: String(Number(versionCode) || 1),
        versionName: versionName || '1.0.0',
        siteUrl: activeOrigin,
        sha256,
      });
      if (opts?.includeKit) params.set('includeKit', '1');
      if (opts?.forceSource) params.set('mode', 'source');

      const res = await fetch(`/api/admin/files/generate/${kind}?${params.toString()}`);
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || 'Package generation failed');
      }

      const source = res.headers.get('X-Build-Source') || 'local-twa-bundle';
      const fallbackFilename =
        source === 'pwabuilder-cloudapk' && !opts?.includeKit
          ? `${englishAppName.replace(/[^a-zA-Z0-9]+/g, '-')}.${kind}`
          : `${englishAppName.replace(/[^a-zA-Z0-9]+/g, '-')}-${
              kind === 'apk' ? 'Android-APK-Package' : 'GooglePlay-AAB-Package'
            }.zip`;
      const filename = extractFilenameFromDisposition(
        res.headers.get('Content-Disposition'),
        fallbackFilename
      );

      const blob = await res.blob();
      triggerBlobDownload(blob, filename);

      if (source === 'pwabuilder-cloudapk') {
        setNotice(
          lang === 'ar'
            ? `تم توليد وتنزيل "${filename}" الموقّع عبر PWABuilder API المرتبط بـ ${activeOrigin} بنجاح!`
            : `Generated and downloaded signed "${filename}" via PWABuilder API linked to ${activeOrigin}!`
        );
      } else {
        setNotice(
          lang === 'ar'
            ? `تم توليد وتنزيل حزمة "${filename}" المربوطة بـ ${activeOrigin} وFirestore (جاهزة للتوقيع والبناء بـ Target SDK 35).`
            : `Generated and downloaded "${filename}" synced with ${activeOrigin} & Firestore (Target SDK 35 ready).`
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloadingKind(null);
    }
  };

  const handleUploadStoreAppBinary = async (
    platform: 'android' | 'ios',
    file: File | undefined
  ) => {
    if (!file) return;
    setErrorMsg('');
    setNotice('');

    const validation = validateUploadedAppBinaryFile(platform, file.name, file.size);
    if (!validation.ok) {
      setErrorMsg(lang === 'ar' ? validation.errorAr : validation.errorEn);
      return;
    }

    setUploadingPlatform(platform);
    try {
      const res = await fetch(
        `/api/admin/app-binaries/upload?platform=${platform}&fileName=${encodeURIComponent(
          validation.cleanName
        )}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'x-file-name': encodeURIComponent(validation.cleanName),
          },
          body: file,
        }
      );

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        binary?: UploadedAppBinary;
        error?: string;
      };
      if (!res.ok || !data.binary) {
        throw new Error(
          data.error ||
            (lang === 'ar' ? 'فشل رفع ملف التطبيق.' : 'Failed to upload app file.')
        );
      }

      const nextUploadedFiles = {
        ...(storeData.uploadedAppFiles || {}),
        ...(platform === 'android'
          ? { androidApk: data.binary }
          : { iosApp: data.binary }),
      };

      const msg =
        platform === 'android'
          ? lang === 'ar'
            ? `تم رفع "${data.binary.fileName}" وإضافته لأزرار تنزيل الأندرويد بالموقع فوراً!`
            : `Uploaded "${data.binary.fileName}" and published to storefront downloads!`
          : lang === 'ar'
            ? `تم رفع "${data.binary.fileName}" وإضافته لأزرار تنزيل الآيفون بالموقع فوراً!`
            : `Uploaded "${data.binary.fileName}" and published to storefront downloads!`;

      await onSaveStoreData(
        {
          ...storeData,
          uploadedAppFiles: nextUploadedFiles,
        },
        msg
      );
      setNotice(msg);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingPlatform(null);
    }
  };

  const handleRemoveStoreAppBinary = async (platform: 'android' | 'ios') => {
    setErrorMsg('');
    setNotice('');
    setUploadingPlatform(platform);
    try {
      await fetch(`/api/admin/app-binaries/${platform}`, { method: 'DELETE' }).catch(() => {});
      const nextUploadedFiles = {
        ...(storeData.uploadedAppFiles || {}),
        ...(platform === 'android' ? { androidApk: null } : { iosApp: null }),
      };
      const msg =
        platform === 'android'
          ? lang === 'ar'
            ? 'تمت إزالة ملف الأندرويد (APK) من التنزيلات.'
            : 'Android APK removed from storefront downloads.'
          : lang === 'ar'
            ? 'تمت إزالة ملف الآيفون (IPA) من التنزيلات.'
            : 'iPhone IPA removed from storefront downloads.';
      await onSaveStoreData(
        {
          ...storeData,
          uploadedAppFiles: nextUploadedFiles,
        },
        msg
      );
      setNotice(msg);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to remove file');
    } finally {
      setUploadingPlatform(null);
    }
  };

  const uploadedAndroid = storeData.uploadedAppFiles?.androidApk || null;
  const uploadedIos = storeData.uploadedAppFiles?.iosApp || null;

  return (
    <div className="space-y-5" data-testid="admin-files-panel">
      {/* Header + Live Dynamic Manifest / SW / Firestore Status */}
      <div className="tech-surface rounded-2xl border p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <FolderArchive className="h-5 w-5 text-blue-500" />
              <span>
                {lang === 'ar'
                  ? 'قسم ملفات التطبيق (رفع APK & IPA + حزم النشر) — للمدير فقط'
                  : 'App Files Manager (Upload APK & IPA + Build Bundles) — Admin Only'}
              </span>
            </h3>
            <p className="tech-text-secondary text-xs mt-1">
              {lang === 'ar'
                ? 'ارفع ملف APK للأندرويد أو ملف IPA للآيفون ليظهر مباشرة في تنزيلات الموقع لجميع الزوار بدون قيود، أو أنشئ حزمة APK/AAB جاهزة.'
                : 'Upload Android APK or iPhone IPA files here to immediately add direct download buttons on the storefront, or export generated APK/AAB packages.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchStatus()}
            className="tech-surface-muted inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold hover:border-blue-500/40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{lang === 'ar' ? 'تحديث الحالة' : 'Refresh'}</span>
          </button>
        </div>

        {(notice || errorMsg) && (
          <div
            className={`rounded-xl border px-4 py-3 text-xs font-bold ${
              errorMsg
                ? 'border-rose-500/40 bg-rose-500/15 text-rose-500'
                : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-500'
            }`}
          >
            {errorMsg || notice}
          </div>
        )}

        {/* Admin Upload Section: Android APK & iPhone IPA published live to Storefront Downloads */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Upload Android APK */}
          <div className="tech-surface-muted rounded-xl border p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-extrabold text-sm">
                <Smartphone className="h-4 w-4 text-emerald-500" />
                <span>{lang === 'ar' ? 'رفع ملف الأندرويد (APK)' : 'Upload Android App (APK)'}</span>
              </div>
              {uploadedAndroid && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-extrabold text-emerald-500">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{lang === 'ar' ? 'متاح للزوار' : 'Live on Site'}</span>
                </span>
              )}
            </div>

            {uploadedAndroid ? (
              <div className="tech-surface rounded-xl border p-3 text-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold truncate" dir="ltr">
                    {uploadedAndroid.fileName}
                  </span>
                  <span className="tech-text-secondary font-mono-tabular shrink-0" dir="ltr">
                    {formatFileSizeLabel(uploadedAndroid.sizeBytes)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={uploadedAndroid.fileUrl}
                    download={uploadedAndroid.fileName}
                    data-testid="admin-test-apk-download"
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/15 px-2.5 py-1.5 font-bold text-emerald-500 hover:bg-emerald-600/25"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{lang === 'ar' ? 'تنزيل الملف' : 'Download'}</span>
                  </a>
                  <button
                    type="button"
                    disabled={uploadingPlatform !== null}
                    onClick={() => void handleRemoveStoreAppBinary('android')}
                    data-testid="admin-remove-apk-btn"
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2.5 py-1.5 font-bold text-rose-500 hover:bg-rose-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{lang === 'ar' ? 'حذف' : 'Remove'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="tech-text-secondary text-xs leading-relaxed">
                {lang === 'ar'
                  ? 'عند رفع ملف .apk هنا، يظهر زر تنزيل الأندرويد المباشر للزوار داخل الموقع فوراً.'
                  : 'Upload your .apk file here to enable the direct Android APK download button on the storefront.'}
              </p>
            )}

            <label className="tech-accent-btn inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition">
              {uploadingPlatform === 'android' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>
                {uploadingPlatform === 'android'
                  ? lang === 'ar'
                    ? 'جاري رفع ملف الأندرويد...'
                    : 'Uploading APK...'
                  : uploadedAndroid
                    ? lang === 'ar'
                      ? 'استبدال ملف الأندرويد (.apk)'
                      : 'Replace Android APK (.apk)'
                    : lang === 'ar'
                      ? 'اختيار ورفع ملف الأندرويد (.apk)'
                      : 'Choose & Upload Android (.apk)'}
              </span>
              <input
                type="file"
                accept=".apk,.aab"
                disabled={uploadingPlatform !== null}
                data-testid="upload-android-apk-input"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  void handleUploadStoreAppBinary('android', file);
                }}
              />
            </label>
          </div>

          {/* Upload iPhone IPA / Profile */}
          <div className="tech-surface-muted rounded-xl border p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-extrabold text-sm">
                <Smartphone className="h-4 w-4 text-blue-500" />
                <span>{lang === 'ar' ? 'رفع ملف الآيفون (IPA / Profile)' : 'Upload iPhone App (IPA)'}</span>
              </div>
              {uploadedIos && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 px-2 py-0.5 text-[11px] font-extrabold text-blue-500">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{lang === 'ar' ? 'متاح للزوار' : 'Live on Site'}</span>
                </span>
              )}
            </div>

            {uploadedIos ? (
              <div className="tech-surface rounded-xl border p-3 text-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold truncate" dir="ltr">
                    {uploadedIos.fileName}
                  </span>
                  <span className="tech-text-secondary font-mono-tabular shrink-0" dir="ltr">
                    {formatFileSizeLabel(uploadedIos.sizeBytes)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={uploadedIos.fileUrl}
                    download={uploadedIos.fileName}
                    data-testid="admin-test-ios-download"
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600/15 px-2.5 py-1.5 font-bold text-blue-500 hover:bg-blue-600/25"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{lang === 'ar' ? 'تنزيل الملف' : 'Download'}</span>
                  </a>
                  <button
                    type="button"
                    disabled={uploadingPlatform !== null}
                    onClick={() => void handleRemoveStoreAppBinary('ios')}
                    data-testid="admin-remove-ios-btn"
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2.5 py-1.5 font-bold text-rose-500 hover:bg-rose-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{lang === 'ar' ? 'حذف' : 'Remove'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="tech-text-secondary text-xs leading-relaxed">
                {lang === 'ar'
                  ? 'عند رفع ملف .ipa أو .mobileconfig هنا، يظهر زر تنزيل الآيفون المباشر للزوار داخل الموقع فوراً.'
                  : 'Upload your .ipa or .mobileconfig file here to enable the direct iPhone app download button on the storefront.'}
              </p>
            )}

            <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-500/40 bg-blue-600/15 px-4 py-2.5 text-xs font-extrabold text-blue-500 transition hover:bg-blue-600/25">
              {uploadingPlatform === 'ios' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>
                {uploadingPlatform === 'ios'
                  ? lang === 'ar'
                    ? 'جاري رفع ملف الآيفون...'
                    : 'Uploading iPhone File...'
                  : uploadedIos
                    ? lang === 'ar'
                      ? 'استبدال ملف الآيفون (.ipa / .mobileconfig)'
                      : 'Replace iPhone File (.ipa)'
                    : lang === 'ar'
                      ? 'اختيار ورفع ملف الآيفون (.ipa / .mobileconfig)'
                      : 'Choose & Upload iPhone (.ipa)'}
              </span>
              <input
                type="file"
                accept=".ipa,.mobileconfig"
                disabled={uploadingPlatform !== null}
                data-testid="upload-ios-ipa-input"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  void handleUploadStoreAppBinary('ios', file);
                }}
              />
            </label>
          </div>
        </div>

        {/* Dynamic Manifest, Service Worker, Firestore, & Origin Live Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="tech-surface-muted rounded-xl border p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 font-extrabold text-blue-500">
              <Cloud className="h-4 w-4" />
              <span>{lang === 'ar' ? 'الربط السحابي Firestore' : 'Firebase Firestore Sync'}</span>
            </div>
            <p className="font-mono-tabular font-bold" dir="ltr">
              ashraf-gold / computer_tech_store/main_data
            </p>
            <p className="tech-text-secondary truncate font-mono-tabular" dir="ltr" title={activeOrigin}>
              {activeOrigin}
            </p>
          </div>

          <div className="tech-surface-muted rounded-xl border p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 font-extrabold text-emerald-500">
              <Smartphone className="h-4 w-4" />
              <span>{lang === 'ar' ? 'Manifest و Service Worker ديناميكي' : 'Dynamic manifest.json & sw.js'}</span>
            </div>
            <p className="font-bold" dir="ltr">
              {englishAppName}
            </p>
            <div className="flex flex-wrap items-center gap-3 font-mono-tabular" dir="ltr">
              <a
                href="/manifest.json"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-500 hover:underline"
              >
                <span>/manifest.json</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="/sw.js"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-500 hover:underline"
              >
                <span>/sw.js</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="tech-surface-muted rounded-xl border p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 font-extrabold text-amber-500">
              <ShieldCheck className="h-4 w-4" />
              <span>
                {lang === 'ar' ? 'متطلبات قبول Google Play' : 'Google Play AAB Compliance'}
              </span>
            </div>
            <p className="font-bold" dir="ltr">
              Target SDK {status?.targetSdk || 35} • 64-bit • TWA + WebView
            </p>
            <a
              href="/.well-known/assetlinks.json"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-blue-500 hover:underline font-mono-tabular"
              dir="ltr"
            >
              <span>/.well-known/assetlinks.json</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Two One-Click Generated Ready Download Sections: APK & Play Store AAB */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Section 1: Direct Mobile APK */}
        <div className="tech-surface rounded-2xl border p-5 shadow-sm flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600/15 px-2.5 py-1 text-[11px] font-extrabold text-blue-500">
              <Smartphone className="h-3.5 w-3.5" />
              <span>Android APK • Direct Mobile Download</span>
            </span>
            <h4 className="text-sm font-extrabold">
              {lang === 'ar'
                ? `نسخة Android للتثبيت المباشر (${englishAppName})`
                : `Direct Android APK Package (${englishAppName})`}
            </h4>
            <p className="tech-text-secondary text-xs leading-relaxed">
              {lang === 'ar'
                ? `تُجهز تلقائياً باسم "${englishAppName}" وأيقونة المتجر الحالية ورابط الموقع الفعلي (${activeOrigin}) ومزامنة Firebase Firestore ليُحفظ مباشرة في التنزيلات على هاتف المدير.`
                : `Automatically built with "${englishAppName}", current Store Icon, live ${activeOrigin} origin, and Firebase Firestore sync straight into your Downloads folder.`}
            </p>
          </div>

          <button
            type="button"
            disabled={downloadingKind !== null}
            onClick={() => void handleGenerateAndDownload('apk')}
            data-testid="download-apk-btn"
            className="tech-accent-btn inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs sm:text-sm font-extrabold shadow-sm disabled:opacity-60"
          >
            {downloadingKind === 'apk' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>
              {downloadingKind === 'apk'
                ? lang === 'ar'
                  ? 'جاري تجهيز وتنزيل نسخة Android...'
                  : 'Generating Android APK...'
                : lang === 'ar'
                  ? 'تحميل نسخة Android (APK)'
                  : 'Download Android Version (APK)'}
            </span>
          </button>
        </div>

        {/* Section 2: Google Play Store AAB + PWABuilder API */}
        <div className="tech-surface rounded-2xl border p-5 shadow-sm flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/15 px-2.5 py-1 text-[11px] font-extrabold text-emerald-500">
              <PackageCheck className="h-3.5 w-3.5" />
              <span>Google Play Store AAB • Target SDK 35</span>
            </span>
            <h4 className="text-sm font-extrabold">
              {lang === 'ar'
                ? `حزمة النشر على Google Play (${englishAppName}.aab)`
                : `Google Play Store Package (${englishAppName}.aab)`}
            </h4>
            <p className="tech-text-secondary text-xs leading-relaxed">
              {lang === 'ar'
                ? 'حزمة Google Play الرسمية الجاهزة (Android App Bundle / TWA) مع manifest.json و assetlinks.json وربط الموقع الفعلي مع تصدير مباشر عبر PWABuilder API عند النشر العام.'
                : 'Play Console compliant Android App Bundle (AAB / TWA) configured with live manifest.json, assetlinks.json, and one-click PWABuilder CloudAPK packaging when publicly reachable.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={downloadingKind !== null}
              onClick={() => void handleGenerateAndDownload('aab')}
              data-testid="download-aab-btn"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs sm:text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {downloadingKind === 'aab' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>
                {downloadingKind === 'aab'
                  ? lang === 'ar'
                    ? 'جاري تجهيز حزمة Play Store...'
                    : 'Generating Play Store AAB...'
                  : lang === 'ar'
                    ? 'تحميل حزمة متجر Google Play (AAB)'
                    : 'Download Google Play Package (AAB)'}
              </span>
            </button>

            <button
              type="button"
              disabled={downloadingKind !== null}
              onClick={() => void handleGenerateAndDownload('aab', { includeKit: true })}
              data-testid="download-aab-kit-btn"
              className="tech-surface-muted inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-extrabold hover:border-emerald-500/50 disabled:opacity-60"
              title={
                lang === 'ar'
                  ? 'تحميل الحزمة الكاملة مع ملف التوقيع و assetlinks.json'
                  : 'Full bundle including signing info & assetlinks.json'
              }
            >
              {downloadingKind === 'aab-kit' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PackageCheck className="h-4 w-4 text-emerald-500" />
              )}
              <span>{lang === 'ar' ? 'الحزمة + التوقيع' : 'Full Kit'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Package Identity & Play Store Settings */}
      <form
        onSubmit={handleSaveBuildConfig}
        className="tech-surface rounded-2xl border p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <div>
          <label className="mb-1 block text-xs font-bold">
            {lang === 'ar' ? 'معرّف الحزمة (Package ID)' : 'Application Package ID'}
          </label>
          <input
            type="text"
            dir="ltr"
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-xs font-mono-tabular outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold">
            {lang === 'ar' ? 'رقم الإصدار (Version Code)' : 'Version Code'}
          </label>
          <input
            type="number"
            min={1}
            dir="ltr"
            value={versionCode}
            onChange={(e) => setVersionCode(e.target.value)}
            className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-xs font-mono-tabular outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold">
            {lang === 'ar' ? 'اسم الإصدار (Version Name)' : 'Version Name'}
          </label>
          <input
            type="text"
            dir="ltr"
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-xs font-mono-tabular outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold">
            {lang === 'ar' ? 'بصمة SHA-256 (Google Play Console)' : 'Play App Signing SHA-256'}
          </label>
          <input
            type="text"
            dir="ltr"
            placeholder="AA:BB:CC:..."
            value={sha256}
            onChange={(e) => setSha256(e.target.value)}
            className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-xs font-mono-tabular outline-none"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-inherit">
          <span className="tech-text-secondary text-[11px]">
            {lang === 'ar'
              ? 'يتم تلقائياً استدعاء PWABuilder CloudAPK عندما يكون المتجر منشوراً على HTTPS عام، أو تصدير مشروع TWA المربوط بالكامل عند التشغيل المحلي.'
              : 'Uses PWABuilder CloudAPK automatically on public HTTPS URLs to deliver signed APK/AAB binaries, or exports the synced Target SDK 35 TWA project bundle on local/private previews.'}
          </span>
          <button
            type="submit"
            disabled={savingConfig}
            className="tech-surface-muted rounded-xl border px-4 py-2 text-xs font-extrabold hover:border-blue-500/50"
          >
            {savingConfig
              ? lang === 'ar'
                ? 'جاري الحفظ...'
                : 'Saving...'
              : lang === 'ar'
                ? 'حفظ وتحديث إعدادات الحزمة'
                : 'Save Release Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
