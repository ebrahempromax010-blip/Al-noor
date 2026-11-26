import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Download,
  ExternalLink,
  FileArchive,
  FolderArchive,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
} from 'lucide-react';
import { Language, StoreData } from '../types/store';
import { resolvePwaEnglishName } from '../utils/pwaLogic';
import { sanitizeAndroidPackageId } from '../utils/androidProjectGenerator';

interface ReleaseBinaryInfo {
  exists: boolean;
  sizeBytes: number;
  updatedAt: string | null;
  downloadUrl: string;
}

interface FilesStatusResponse {
  storeNameEn: string;
  liveOrigin: string;
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
  apk: ReleaseBinaryInfo;
  aab: ReleaseBinaryInfo;
}

interface AdminFilesPanelProps {
  lang: Language;
  storeData: StoreData;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const AdminFilesPanel: React.FC<AdminFilesPanelProps> = ({ lang, storeData }) => {
  const [status, setStatus] = useState<FilesStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingKind, setUploadingKind] = useState<'apk' | 'aab' | null>(null);
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
          siteUrlOverride:
            typeof window !== 'undefined' ? window.location.origin : storeData.settings.siteUrl,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      await fetchStatus();
      setNotice(
        lang === 'ar'
          ? 'تم حفظ وتحديث إعدادات حزمة الأندرويد وربطها بالمتجر وFirestore.'
          : 'Android build configuration saved & linked to live store + Firestore.'
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

  const handleUploadReleaseBinary = async (kind: 'apk' | 'aab', file?: File) => {
    if (!file) return;
    setUploadingKind(kind);
    setErrorMsg('');
    setNotice('');
    try {
      const buf = await file.arrayBuffer();
      const res = await fetch(`/api/admin/files/upload/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: buf,
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || 'Upload error');
      }
      await fetchStatus();
      setNotice(
        lang === 'ar'
          ? `تم تخزين ملف ${kind.toUpperCase()} بنجاح وأصبح جاهزاً للتحميل المباشر.`
          : `${kind.toUpperCase()} package stored cleanly and ready for download.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingKind(null);
    }
  };

  const handleDeleteReleaseBinary = async (kind: 'apk' | 'aab') => {
    setErrorMsg('');
    setNotice('');
    await fetch(`/api/admin/files/${kind}`, { method: 'DELETE' });
    await fetchStatus();
    setNotice(
      lang === 'ar'
        ? `تم حذف ملف ${kind.toUpperCase()} المخزن.`
        : `Removed stored ${kind.toUpperCase()} file.`
    );
  };

  const activeOrigin =
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    status?.liveOrigin ||
    storeData.settings.siteUrl;

  const projectZipUrl = `/api/admin/files/android-project.zip?packageId=${encodeURIComponent(
    packageId
  )}&versionCode=${encodeURIComponent(versionCode)}&versionName=${encodeURIComponent(
    versionName
  )}&siteUrl=${encodeURIComponent(activeOrigin)}&sha256=${encodeURIComponent(sha256)}`;

  return (
    <div className="space-y-5" data-testid="admin-files-panel">
      {/* Header + Live Website & Firestore Sync Summary */}
      <div className="tech-surface rounded-2xl border p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <FolderArchive className="h-5 w-5 text-blue-500" />
              <span>
                {lang === 'ar'
                  ? 'قسم الملفات — حزم الأندرويد (APK) ومتجر جوجل بلاي (AAB / App Bundle)'
                  : 'Files — Mobile APK & Google Play AAB Packages'}
              </span>
            </h3>
            <p className="tech-text-secondary text-xs mt-1">
              {lang === 'ar'
                ? 'مرتبط لحظياً بالموقع الرئيسي وبيانات Firebase Firestore ومزامن مع الاسم الإنجليزي والأيقونة الحالية.'
                : 'Dynamically synced with the live website URL, Firebase Firestore document, English launcher name, and Store icon.'}
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

        {/* Live Cloud & Manifest Synchronization Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="tech-surface-muted rounded-xl border p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 font-extrabold text-blue-500">
              <Cloud className="h-4 w-4" />
              <span>{lang === 'ar' ? 'الربط السحابي Firestore' : 'Firebase Firestore Sync'}</span>
            </div>
            <p className="font-mono-tabular font-bold" dir="ltr">
              ashraf-gold / computer_tech_store/main_data
            </p>
            <p className="tech-text-secondary">
              {lang === 'ar'
                ? 'أي تغيير في المنتجات أو الاسم يظهر لحظياً في التطبيق.'
                : 'Product, price & branding edits reflect live in-app.'}
            </p>
          </div>

          <div className="tech-surface-muted rounded-xl border p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 font-extrabold text-emerald-500">
              <Smartphone className="h-4 w-4" />
              <span>{lang === 'ar' ? 'اسم وأيقونة التطبيق' : 'Live App Name & Icon'}</span>
            </div>
            <p className="font-bold" dir="ltr">
              {englishAppName}
            </p>
            <a
              href="/manifest.json"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-blue-500 hover:underline font-mono-tabular"
              dir="ltr"
            >
              <span>/manifest.json</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="tech-surface-muted rounded-xl border p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 font-extrabold text-amber-500">
              <ShieldCheck className="h-4 w-4" />
              <span>
                {lang === 'ar' ? 'متطلبات قبول Google Play' : 'Google Play AAB Compliance'}
              </span>
            </div>
            <p className="font-bold" dir="ltr">
              Target SDK {status?.targetSdk || 35} • 64-bit • HTTPS TWA
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

      {/* Live-Linked Android TWA + Firebase Build Package (APK + Play Store AAB Generator) */}
      <div className="tech-surface rounded-2xl border p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h4 className="text-sm font-extrabold flex items-center gap-2">
              <FileArchive className="h-4 w-4 text-blue-500" />
              <span>
                {lang === 'ar'
                  ? 'حزمة بناء التطبيق المربوطة بالموقع وFirebase (تنتج APK + AAB لـ Google Play)'
                  : 'Live-Linked Android TWA + Firebase Project Bundle (Builds APK & Play Store AAB)'}
              </span>
            </h4>
            <p className="tech-text-secondary text-xs leading-relaxed">
              {lang === 'ar'
                ? 'تتضمن كود أندرويد المتكامل بـ Target SDK 35 وملف GitHub Actions وسكربت Gradle لإنتاج ملف APK للتثبيت المباشر على الموبايل وملف AAB مطابق لشروط النشر على Google Play، مع سحب الاسم الإنجليزي والأيقونة الحالية وربط Firebase تلقائياً.'
                : 'Contains full API 35 Android TWA + WebView project, Play Store bundle split config, live Firestore sync metadata, dynamic app name/icon, Digital Asset Links, and automated GitHub Actions build.'}
            </p>
          </div>
          <a
            href={projectZipUrl}
            download
            data-testid="download-android-project-zip"
            className="tech-accent-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold shadow-sm shrink-0"
          >
            <Download className="h-4 w-4" />
            <span>
              {lang === 'ar'
                ? 'تحميل مشروع الأندرويد المتكامل (.ZIP)'
                : 'Download Linked Android Bundle (.ZIP)'}
            </span>
          </a>
        </div>

        <form onSubmit={handleSaveBuildConfig} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-inherit">
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
              {lang === 'ar' ? 'بصمة التوقيع SHA-256 (لـ Play Console)' : 'Play App Signing SHA-256'}
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
          <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="tech-text-secondary text-[11px]">
              {lang === 'ar'
                ? 'ملاحظة تقنية: الخادم الويب الحالي لا يحتوي على Android SDK/JDK لترجمة ملفات APK/AAB الثنائية مباشرة، لذا يمكنك توليد المشروع من هنا وترجمته عبر Android Studio أو GitHub Actions ثم رفعه في البطاقات أدناه.'
                : 'Note: This web runtime does not include Android SDK/JDK for direct binary compilation; export the synced project ZIP to build signed APK/AAB via Android Studio or GitHub Actions, then host the compiled binaries below.'}
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
                  ? 'حفظ إعدادات الإصدار'
                  : 'Save Release Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Stored Binary Cards: APK for Mobile & AAB for Google Play Store */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Direct Mobile APK */}
        <div className="tech-surface rounded-2xl border p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1 rounded-lg bg-blue-600/15 px-2.5 py-1 text-[11px] font-extrabold text-blue-500">
                <Smartphone className="h-3.5 w-3.5" />
                <span>APK • Android Direct Install</span>
              </span>
              <h4 className="mt-2 text-sm font-extrabold">
                {lang === 'ar'
                  ? `ملف تحميل الموبايل (${englishAppName}.apk)`
                  : `Mobile Install File (${englishAppName}.apk)`}
              </h4>
              <p className="tech-text-secondary text-xs mt-1">
                {lang === 'ar'
                  ? 'للتثبيت المباشر على هواتف أندرويد خارج متجر Google Play.'
                  : 'Direct APK package for downloading and installing on Android phones.'}
              </p>
            </div>
            {status?.apk.exists && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{formatBytes(status.apk.sizeBytes)}</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="tech-accent-btn inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold">
              <Upload className="h-3.5 w-3.5" />
              <span>
                {uploadingKind === 'apk'
                  ? lang === 'ar'
                    ? 'جاري الرفع...'
                    : 'Uploading...'
                  : lang === 'ar'
                    ? 'رفع وتخزين ملف APK'
                    : 'Upload & Store .APK'}
              </span>
              <input
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                className="hidden"
                onChange={(e) => {
                  void handleUploadReleaseBinary('apk', e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>

            {status?.apk.exists && (
              <>
                <a
                  href={status.apk.downloadUrl}
                  download
                  className="tech-surface-muted inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-extrabold hover:border-blue-500/40"
                >
                  <Download className="h-3.5 w-3.5 text-blue-500" />
                  <span>{lang === 'ar' ? 'تحميل APK للموبايل' : 'Download APK'}</span>
                </a>
                <button
                  type="button"
                  onClick={() => void handleDeleteReleaseBinary('apk')}
                  aria-label="Delete stored APK"
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 text-rose-500 hover:bg-rose-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Google Play Store AAB */}
        <div className="tech-surface rounded-2xl border p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/15 px-2.5 py-1 text-[11px] font-extrabold text-emerald-500">
                <PackageCheck className="h-3.5 w-3.5" />
                <span>AAB • Google Play App Bundle</span>
              </span>
              <h4 className="mt-2 text-sm font-extrabold">
                {lang === 'ar'
                  ? `ملف النشر على Google Play (${englishAppName}.aab)`
                  : `Play Store Upload File (${englishAppName}.aab)`}
              </h4>
              <p className="tech-text-secondary text-xs mt-1">
                {lang === 'ar'
                  ? 'صيغة Android App Bundle (AAB) المعتمدة من Google Play مع دعم Target SDK 35 و64-bit.'
                  : 'Google Play Console AAB bundle compliant with Target SDK 35, 64-bit & Play App Signing.'}
              </p>
            </div>
            {status?.aab.exists && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{formatBytes(status.aab.sizeBytes)}</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="tech-accent-btn inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold">
              <Upload className="h-3.5 w-3.5" />
              <span>
                {uploadingKind === 'aab'
                  ? lang === 'ar'
                    ? 'جاري الرفع...'
                    : 'Uploading...'
                  : lang === 'ar'
                    ? 'رفع وتخزين ملف AAB'
                    : 'Upload & Store .AAB'}
              </span>
              <input
                type="file"
                accept=".aab"
                className="hidden"
                onChange={(e) => {
                  void handleUploadReleaseBinary('aab', e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>

            {status?.aab.exists && (
              <>
                <a
                  href={status.aab.downloadUrl}
                  download
                  className="tech-surface-muted inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-extrabold hover:border-emerald-500/40"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{lang === 'ar' ? 'تحميل AAB لـ Play Store' : 'Download AAB'}</span>
                </a>
                <button
                  type="button"
                  onClick={() => void handleDeleteReleaseBinary('aab')}
                  aria-label="Delete stored AAB"
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 text-rose-500 hover:bg-rose-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
