# Pace: a calmer way to money

Pace is a budgeting app for iOS and Android, built for Pakistan. You plan your month in **pockets**, see one number each morning (**safe to spend today**), save towards **goals**, and track **bills**, **taxes** and **spending trends**. Transactions come from bank SMS, bank statements (Excel or CSV), or quick manual entry. Data syncs to your account and works offline.

Built with **Expo (React Native, SDK 57)**, **Expo Router**, **TypeScript** and **Supabase**.

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Running on a device](#running-on-a-device)
- [Project structure](#project-structure)
- [Backend (Supabase)](#backend-supabase)
- [Authentication](#authentication)
- [Sync model](#sync-model)
- [Importing transactions](#importing-transactions)
- [Home-screen widgets](#home-screen-widgets)
- [Testing](#testing)
- [Building and releasing](#building-and-releasing)
- [Deep links](#deep-links)
- [Troubleshooting](#troubleshooting)
- [Production checklist](#production-checklist)

---

## Features

| Area | What it does |
| --- | --- |
| **Today** | Safe to spend today (your flexible pockets divided by the days left), pace against your plan, upcoming bills, insights and a setup checklist for new users |
| **Pockets** | Monthly budget categories. Add, edit, delete and rebalance them ("Move money"). Mark fixed costs so they're excluded from safe-to-spend. Browse past months. |
| **Transactions** | Add expenses or income, edit, delete, search, filter. Uncategorised items land in **Needs review**; once you file a merchant, Pace remembers it. |
| **Bank SMS import** | Paste or share alerts from HBL, Meezan, UBL, MCB, JazzCash, Easypaisa and others. It reads the amount, merchant and date, ignores OTPs and balance notices, and skips duplicates. |
| **Statement import** | Excel (`.xlsx`, `.xls`) or CSV. Detects Date, Description and Amount, or Debit/Credit (or a Dr/Cr column). Skips title rows above the table. |
| **Bills** | Due dates, monthly repeats, "Mark paid" (logs the expense and rolls the due date forward), overdue flags, reminders |
| **Goals** | Target and deadline, add or withdraw money, auto-save on payday, and a projected "ready by" date |
| **Taxes & charges** | WHT, FED, other taxes, zakat and bank fees, detected automatically, totalled by Pakistan tax year (1 Jul to 30 Jun), with CSV export for filing |
| **Progress & review** | Streaks, days under budget, dining trend, net for the month, weekly spending chart, and a monthly review |
| **Widgets** | Home-screen widgets for one pocket or all pockets: Liquid Glass on iOS, glass-style on Android |
| **Reminders** | A daily check-in and a reminder the day before each bill (local notifications) |
| **Account** | Sign in with Apple, Google or an email link. Cloud sync, sign out, erase data, and delete account. |

## Tech stack

- **App:** Expo SDK 57, React Native 0.86, React 19, Expo Router (file-based routes in `src/app`), TypeScript (strict)
- **UI:** a custom design system in `src/theme` (sage canvas, 8-pt spacing, Inter type) and SVG illustrations via `react-native-svg`
- **Backend:** Supabase (Postgres with row-level security, Auth)
- **Native:** `expo-widgets` (iOS SwiftUI widgets), `react-native-android-widget`, `expo-notifications`, `expo-sharing` (Android share target), `expo-apple-authentication`, `expo-file-system`
- **Parsing:** SheetJS (`xlsx`) for spreadsheets; custom SMS and CSV parsers
- **Tests:** Jest (`jest-expo`)

## Getting started

### Prerequisites

- Node.js 20 or later, and npm
- The [Supabase CLI](https://supabase.com/docs/guides/cli), to manage the backend
- For device builds: an [Expo account](https://expo.dev/signup) and `eas-cli`
- Optional: Android Studio and/or Xcode, for local native builds

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in the values from **Supabase → Project Settings → API**:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
```

> Only variables prefixed with `EXPO_PUBLIC_` are bundled into the app. Server-only secrets (`SUPABASE_SECRET_KEY`, `SUPABASE_DB_PASSWORD`) must **never** use that prefix. They're used only by the scripts in `scripts/`. `.env.local` is git-ignored and is never uploaded to EAS.

### 3. Run

```bash
npx expo start           # Expo Go, or press i / a for a simulator
npx expo start --web     # quick preview in a browser
```

Expo Go supports most of the app. Widgets, the Android share target and notifications on Android need a **development build** (see below).

## Running on a device

### Development build (needed for widgets and native features)

```bash
npx eas-cli build --profile development --platform android   # or ios
npx expo start --dev-client --lan
```

Install the build from the link EAS prints, then open **Pace** (not Expo Go) and choose your server. You only need to rebuild when native dependencies or native config change. JavaScript changes load from the dev server.

**Connecting to the dev server:**
- **Same Wi-Fi:** use `--lan`. If your network isolates devices (common on office Wi-Fi), put the Mac on your phone's hotspot.
- **Tunnel:** use `--tunnel`. This needs `@expo/ngrok`, and some networks block it.
- **USB (Android, most reliable):** run `adb reverse tcp:8081 tcp:8081`, then `npx expo start --dev-client --localhost`.

## Project structure

```
src/
  app/                 Screens (Expo Router). Every file is a route.
    (tabs)/            Today, Plan, Goals, Progress
    onboarding/        Welcome → name → tracking → budget
    auth/callback.tsx  Finishes email-link / OAuth sign-in
    sign-in.tsx, settings.tsx, transactions.tsx, taxes.tsx, …
  auth/                AuthProvider (Apple, Google, email, sign-out, delete account)
  store/               App state (types, store, selectors, recurring automation, seed data, migrations)
  sync/                Mapping between app state and database rows, diffing, Supabase reads and writes
  lib/                 Parsers (SMS, CSV, spreadsheet), categoriser, tax rules, reminders, export, formatting
  components/          Shared UI (buttons, cards, forms, charts, tab bar, logo)
  widgets/             Widget snapshot plus iOS (SwiftUI) and Android (SVG) widget renderers
  theme/               Colours, spacing, type scale, shadows
  illustrations/       SVG artwork
  __tests__/           Unit tests
supabase/
  migrations/          Database schema (tables and row-level security)
  config.toml          Auth settings (redirects, providers, email)
  templates/           Branded sign-in email (requires custom SMTP)
plugins/               Local Expo config plugins
scripts/               Dev and admin helpers (use the server-only secret key)
assets/                App icon, adaptive icon, splash, brand SVGs
index.ts               App entry (Expo Router plus Android widget task registration)
```

## Backend (Supabase)

There's one table per entity: `profiles`, `pockets`, `transactions`, `goals`, `contributions` and `bills`. Each has a `user_id` column and **row-level security**, so a user can only read and write their own rows. IDs are generated on the device so the app works offline. `delete_account()` removes the user and everything they own.

```bash
supabase link --project-ref <project-ref>
supabase db push             # apply migrations
supabase config push         # apply auth settings from supabase/config.toml
node --env-file=.env.local scripts/verify-rls.mjs   # check users can't see each other's data
```

**Helper scripts** (these use the server-only key in `.env.local`):

| Script | Purpose |
| --- | --- |
| `scripts/verify-rls.mjs` | Creates two throwaway users and checks isolation, spoofing and account deletion |
| `scripts/dev-magic-link.mjs <email> [redirect]` | Prints a sign-in link without sending an email |
| `scripts/inspect-user.mjs <email>` | Shows a user's profile and row counts |

## Authentication

Sign-in is **required**. Signed-out users can only reach `/sign-in` and `/auth/callback`; this is enforced with `Stack.Protected` in `src/app/_layout.tsx`. A test fails if a new route is added without protection.

| Method | How it works | Setup |
| --- | --- | --- |
| **Email link / code** | `signInWithOtp` using PKCE. The link opens the app at `/auth/callback`. | Works out of the box. For real users, configure custom SMTP (e.g. Resend) in `config.toml`; the built-in sender only reaches your Supabase org. |
| **Google** | Supabase OAuth in an in-app browser (works in Expo Go and in builds) | Create a Google Cloud OAuth *Web* client with the redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`. Put the client ID and secret in `.env.local` as `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `_SECRET`, enable it in `config.toml`, then run `supabase config push`. |
| **Apple** (iOS) | Native Sign in with Apple, exchanged with `signInWithIdToken` | A paid Apple Developer account. The capability is enabled via `ios.usesAppleSignIn`. |

React Native has no WebCrypto, so `src/lib/crypto-polyfill.ts` provides SHA-256 and secure random numbers (via `expo-crypto`) for PKCE.

## Sync model

- **Local first:** each user's data is cached on the device (AsyncStorage), so the app opens instantly and works offline.
- **Push:** changes are diffed against the last synced snapshot and pushed about a second later: upserts for changed rows, deletes for removed ones (`src/sync`).
- **Pull:** on launch and whenever the app returns to the foreground. Server data is adopted only if nothing changed locally during the download.
- **First sign-in on a device:** if the account already has data, it's downloaded. Otherwise the device's data is uploaded, including any data from before accounts existed.
- **Conflicts:** last write wins.

## Importing transactions

- **SMS:** `src/lib/sms-parser.ts` handles debits, credits, wallet transfers, salary, tax and fee alerts, and day-first dates.
  - Android: long-press the SMS → Share → Pace.
  - iPhone: create a Shortcuts automation (Message contains "PKR" → open `pace://import-sms?text=<URL-encoded message>`).
- **Statements:** `src/lib/csv-statement.ts` and `src/lib/spreadsheet.ts`. On native, files are picked with `File.pickFileAsync` (expo-file-system). In Expo Go, the document picker's cache copy can't be read.
- **Categorising:** `src/lib/categorize.ts` uses learned merchant rules first, then built-in keywords. Taxes, zakat and bank fees go to Essentials. Generic labels like "POS" are never learned.

## Home-screen widgets

| Widget | Sizes | Shows | Tap opens |
| --- | --- | --- | --- |
| **Pocket** | Small (iOS); 2×2, resizable (Android) | One pocket (left, budget, progress) or "Safe to spend today" | That pocket |
| **Pockets** | Medium/large (iOS); 4×2, resizable (Android) | Safe to spend, plus your pockets | Plan |

- **How data reaches the widgets:** the app builds a pre-formatted snapshot (`src/widgets/snapshot.ts`) and publishes it when data changes and when the app returns to the foreground. On sign-out, widgets switch to "Sign in to Pace".
- **iOS:** `expo-widgets` (SwiftUI). The widget background is a frosted system material and the icon chips use Liquid Glass. Long-press → Edit Widget to choose a pocket.
- **Android:** each widget is drawn as one SVG at its exact size (`src/widgets/svg.ts`), glass-style with light and dark variants, and a pocket chooser when you add the widget. A background task is registered in `index.ts`.
- **Builds:** widgets need a development or store build. On iOS, the widget extension and the app group `group.com.pace.money` need an Apple Developer account.

## Testing

```bash
npm test            # Jest unit tests
npx tsc --noEmit    # type check
npx expo-doctor     # dependency and config health check
```

Tests cover the SMS, CSV and spreadsheet parsers, categorisation, tax detection and tax years, payday automation, data migration, selectors, sync mapping and diffing, widget snapshots and SVG output, and route protection.

To preview the widget designs as SVG files:

```bash
WIDGET_PREVIEW_DIR=/tmp/widgets npx jest widget-svg
```

## Building and releasing

Build profiles live in `eas.json`:

| Profile | Use |
| --- | --- |
| `development` | Dev client APK or IPA for testing native features |
| `preview` | Internal-distribution APK |
| `production` | Store builds (Android App Bundle) with auto-incremented versions |

```bash
npx eas-cli build --profile production --platform all
npx eas-cli submit --platform android   # or ios
```

Production builds don't read `.env.local`. Set the Supabase variables as EAS environment variables first:

```bash
npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co --visibility plaintext
npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <publishable-key> --visibility plaintext
```

`plugins/with-workmanager-fix.js` aligns AndroidX WorkManager versions. Without it, Android builds fail with a duplicate-class error.

## Deep links

| Link | Opens |
| --- | --- |
| `pace://add-expense?amount=1250&merchant=KFC` | Add Expense, prefilled |
| `pace://add-expense?type=income` | Add Income |
| `pace://import-sms?text=…` | SMS import, already parsed |
| `pace://pocket/<id>` | A pocket |
| `pace://plan` | Plan tab |

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `Android internal error` / `Invalid input to toASCII` when connecting | The tunnel hostname contains an underscore, which Android rejects. Delete `urlRandomness` from `.expo/settings.json` (or set it to letters and numbers only) and restart Expo. |
| `failed to start tunnel: remote gone away` | ngrok is blocked or flaky on this network. Use `--lan` on a hotspot, or the USB `adb reverse` route. |
| "Missing READ permission" importing a file | The file was read from the document picker's cache in Expo Go. The app uses `File.pickFileAsync` on native to avoid this. |
| App crashes on Android in Expo Go at startup | Importing `expo-notifications` in Expo Go on Android throws. The app loads it lazily (`src/lib/notifications.ts`); keep it that way. |
| Sign-in email never arrives | The built-in Supabase sender only delivers to org members and is rate-limited. Configure custom SMTP. |
| Widgets show "Sign in to Pace" | Open the app once while signed in; the widgets refresh within a few seconds. |

## Production checklist

- [ ] Apple Developer Program and Google Play Console accounts
- [ ] Supabase **Pro** (free projects pause after inactivity), and a separate dev project
- [ ] Custom SMTP plus the branded email template; Google OAuth credentials
- [ ] Remove `exp://**` and `localhost` from the production redirect allowlist
- [ ] EAS production environment variables (Supabase URL and publishable key)
- [ ] Privacy policy, terms, and a web page for account-deletion requests (required by Google Play)
- [ ] Play Data safety and Apple App Privacy forms
- [ ] Google Play closed test (12+ testers for 14 days, for new personal accounts)
- [ ] Crash reporting (Sentry) and over-the-air updates (EAS Update)
- [ ] Real-device QA on iOS and Android
