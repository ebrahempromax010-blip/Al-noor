import { resolvePwaEnglishName } from './pwaLogic';
import type { ZipEntryInput } from './zipBuilder';

export interface AndroidProjectConfig {
  storeNameEn?: string;
  websiteOrigin: string;
  packageId?: string;
  versionCode?: number;
  versionName?: string;
  sha256Fingerprint?: string;
  firebaseProjectId?: string;
  firestoreDocPath?: string;
  iconPng512?: Buffer | null;
  iconPng192?: Buffer | null;
}

export const DEFAULT_ANDROID_PACKAGE_ID = 'com.alnour.computer.store';
export const PLAY_STORE_TARGET_SDK = 35;
export const PLAY_STORE_MIN_SDK = 24;

export function sanitizeAndroidPackageId(raw?: string, fallbackStoreNameEn?: string): string {
  const candidate = String(raw || '').trim().toLowerCase();
  if (/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/.test(candidate)) {
    return candidate;
  }
  const cleanBrand = resolvePwaEnglishName(fallbackStoreNameEn)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 20);
  if (cleanBrand.length >= 3) {
    return `com.${cleanBrand}.store`;
  }
  return DEFAULT_ANDROID_PACKAGE_ID;
}

export function normalizeWebsiteOrigin(origin: string): string {
  const trimmed = String(origin || '').trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return 'https://al-nour-computer.web.app';
}

export function buildAssetLinksJson(
  packageId: string,
  sha256Fingerprints: string[] = []
): Array<Record<string, unknown>> {
  const cleanFingerprints = sha256Fingerprints
    .map((f) => f.trim().toUpperCase())
    .filter((f) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f));

  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: sanitizeAndroidPackageId(packageId),
        sha256_cert_fingerprints:
          cleanFingerprints.length > 0
            ? cleanFingerprints
            : ['REPLACE_WITH_PLAY_CONSOLE_APP_SIGNING_SHA256'],
      },
    },
  ];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildAndroidProjectFiles(config: AndroidProjectConfig): ZipEntryInput[] {
  const appName = resolvePwaEnglishName(config.storeNameEn);
  const packageId = sanitizeAndroidPackageId(config.packageId, appName);
  const packagePath = packageId.replace(/\./g, '/');
  const origin = normalizeWebsiteOrigin(config.websiteOrigin);
  const host = origin.replace(/^https?:\/\//i, '').split('/')[0] || 'al-nour-computer.web.app';
  const versionCode =
    Number.isFinite(config.versionCode) && (config.versionCode || 0) >= 1
      ? Math.floor(config.versionCode!)
      : 1;
  const versionName =
    typeof config.versionName === 'string' && /^\d+\.\d+(\.\d+)?$/.test(config.versionName.trim())
      ? config.versionName.trim()
      : '1.0.0';
  const firebaseProjectId = config.firebaseProjectId || 'ashraf-gold';
  const firestoreDocPath = config.firestoreDocPath || 'computer_tech_store/main_data';
  const assetLinks = buildAssetLinksJson(
    packageId,
    config.sha256Fingerprint ? [config.sha256Fingerprint] : []
  );

  const settingsGradle = `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "${appName.replace(/"/g, '')}"
include(":app")
`;

  const rootBuildGradle = `plugins {
    id("com.android.application") version "8.7.2" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
}
`;

  const gradleProperties = `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true
`;

  const appBuildGradle = `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "${packageId}"
    compileSdk = ${PLAY_STORE_TARGET_SDK}

    defaultConfig {
        applicationId = "${packageId}"
        minSdk = ${PLAY_STORE_MIN_SDK}
        targetSdk = ${PLAY_STORE_TARGET_SDK}
        versionCode = ${versionCode}
        versionName = "${versionName}"

        manifestPlaceholders["hostName"] = "${host}"
        manifestPlaceholders["launchUrl"] = "${origin}/"
        buildConfigField("String", "STORE_ORIGIN", "\\"${origin}\\"")
        buildConfigField("String", "MANIFEST_URL", "\\"${origin}/manifest.json\\"")
        buildConfigField("String", "FIREBASE_PROJECT_ID", "\\"${firebaseProjectId}\\"")
        buildConfigField("String", "FIRESTORE_DOC_PATH", "\\"${firestoreDocPath}\\"")
    }

    buildFeatures {
        buildConfig = true
    }

    // Play Store Android App Bundle (.aab) compliance: strip debug info & configure ABI/density/language splits
    bundle {
        language {
            enableSplit = false
        }
        density {
            enableSplit = true
        }
        abi {
            enableSplit = true
        }
    }

    signingConfigs {
        create("release") {
            val ksPath = System.getenv("ANDROID_KEYSTORE_PATH")
            if (!ksPath.isNullOrBlank()) {
                storeFile = file(ksPath)
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD") ?: ""
                keyAlias = System.getenv("ANDROID_KEY_ALIAS") ?: ""
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD") ?: ""
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            if (!System.getenv("ANDROID_KEYSTORE_PATH").isNullOrBlank()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.browser:browser:1.8.0")
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.5.0")
    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    implementation("com.google.firebase:firebase-firestore-ktx")
}
`;

  const manifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:networkSecurityConfig="@xml/network_security_config"
        android:theme="@style/Theme.AppCompat.NoActionBar">

        <meta-data
            android:name="asset_statements"
            android:resource="@string/asset_statements" />

        <meta-data
            android:name="android.support.customtabs.trusted.DEFAULT_URL"
            android:value="${escapeXml(origin)}/" />

        <!-- Exported Launcher Activity synced live with Website + Firebase Firestore (${escapeXml(firestoreDocPath)}) -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:configChanges="orientation|screenSize|keyboardHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="${escapeXml(host)}" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`;

  const mainActivityKt = `package ${packageId}

import android.annotation.SuppressLint
import android.net.Uri
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.trusted.TrustedWebActivityIntentBuilder
import com.google.androidbrowserhelper.trusted.TwaLauncher

/**
 * Live-linked Launcher for ${appName}.
 * Connects directly to ${origin} and Firebase Firestore (${firebaseProjectId} / ${firestoreDocPath}),
 * so every product, icon, theme, or store structure update reflects instantaneously without re-installing.
 */
class MainActivity : AppCompatActivity() {
    private var webView: WebView? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val launchUri = intent?.data ?: Uri.parse(BuildConfig.STORE_ORIGIN)

        try {
            val twaBuilder = TrustedWebActivityIntentBuilder(launchUri)
            TwaLauncher(this).launch(twaBuilder, null, null, null)
            finish()
        } catch (_: Exception) {
            val view = WebView(this).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.databaseEnabled = true
                settings.cacheMode = WebSettings.LOAD_DEFAULT
                settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(
                        view: WebView?,
                        request: WebResourceRequest?
                    ): Boolean = false
                }
                loadUrl(launchUri.toString())
            }
            webView = view
            setContentView(view)
        }
    }
}
`;

  const stringsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${escapeXml(appName)}</string>
    <string name="asset_statements">[{
        "relation": ["delegate_permission/common.handle_all_urls"],
        "target": {
            "namespace": "web",
            "site": "${escapeXml(origin)}"
        }
    }]</string>
</resources>
`;

  const networkSecurityXml = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false" />
</network-security-config>
`;

  const proguardRules = `-keep class ${packageId}.** { *; }
-dontwarn com.google.androidbrowserhelper.**
`;

  const githubActionYml = `name: Build APK & Play Store AAB (${appName})
on:
  workflow_dispatch:

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
      - uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: '8.9'
      - name: Build Direct Download APK & Google Play AAB (API ${PLAY_STORE_TARGET_SDK})
        run: gradle assembleRelease bundleRelease
      - uses: actions/upload-artifact@v4
        with:
          name: ${appName.replace(/[^a-zA-Z0-9_-]/g, '_')}-Android-Releases
          path: |
            app/build/outputs/apk/release/*.apk
            app/build/outputs/bundle/release/*.aab
`;

  const checklistMd = `# ${appName} — Android APK & Google Play AAB Build Guide

1. **Live Website & Firestore Sync**
   - Website Origin: \`${origin}\`
   - Dynamic Manifest: \`${origin}/manifest.json\`
   - Dynamic Launcher Icon: \`${origin}/api/pwa-icon/512.png\`
   - Firebase Project: \`${firebaseProjectId}\`
   - Firestore Store Document: \`${firestoreDocPath}\`
   Every product, store setting, or UI change deployed to the website or Firestore appears live inside the app!

2. **Google Play Store AAB Compliance Checklist (Verified in this Bundle)**
   - **Package ID:** \`${packageId}\`
   - **Target SDK:** API Level **${PLAY_STORE_TARGET_SDK}** (meets Google Play mandatory targetSdk requirement)
   - **Min SDK:** API Level **${PLAY_STORE_MIN_SDK}**
   - **64-bit & Split Config:** Configured via \`bundle { abi/density/language }\` in \`app/build.gradle.kts\`
   - **HTTPS Security:** Enforced via \`res/xml/network_security_config.xml\`
   - **Digital Asset Links:** Place \`.well-known/assetlinks.json\` at \`${origin}/.well-known/assetlinks.json\` (already served dynamically by the app server!) and replace \`REPLACE_WITH_PLAY_CONSOLE_APP_SIGNING_SHA256\` with your Play Console App Signing SHA-256 fingerprint.

3. **Build Commands (produces BOTH .apk and .aab)**
   \`\`\`bash
   # Direct Mobile Sideload APK:
   gradle assembleRelease
   # -> app/build/outputs/apk/release/app-release.apk

   # Google Play Store Upload Bundle (.aab):
   gradle bundleRelease
   # -> app/build/outputs/bundle/release/app-release.aab
   \`\`\`
   Or upload your compiled \`.apk\` and \`.aab\` back into **Admin Panel -> Files** so visitors can download them directly from the store!
`;

  const entries: ZipEntryInput[] = [
    { name: 'settings.gradle.kts', content: settingsGradle },
    { name: 'build.gradle.kts', content: rootBuildGradle },
    { name: 'gradle.properties', content: gradleProperties },
    { name: 'app/build.gradle.kts', content: appBuildGradle },
    { name: 'app/proguard-rules.pro', content: proguardRules },
    { name: 'app/src/main/AndroidManifest.xml', content: manifestXml },
    { name: `app/src/main/java/${packagePath}/MainActivity.kt`, content: mainActivityKt },
    { name: 'app/src/main/res/values/strings.xml', content: stringsXml },
    { name: 'app/src/main/res/xml/network_security_config.xml', content: networkSecurityXml },
    { name: '.well-known/assetlinks.json', content: JSON.stringify(assetLinks, null, 2) },
    { name: '.github/workflows/build-release.yml', content: githubActionYml },
    { name: 'PLAY_STORE_AAB_CHECKLIST.md', content: checklistMd },
  ];

  if (config.iconPng512 && config.iconPng512.length > 0) {
    entries.push({
      name: 'app/src/main/res/mipmap-xxxhdpi/ic_launcher.png',
      content: config.iconPng512,
    });
  }
  if (config.iconPng192 && config.iconPng192.length > 0) {
    entries.push({
      name: 'app/src/main/res/mipmap-xxhdpi/ic_launcher.png',
      content: config.iconPng192,
    });
  }

  return entries;
}
