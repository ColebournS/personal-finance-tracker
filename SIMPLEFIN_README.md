# SimpleFin Integration

This app now supports automatic account syncing via SimpleFin, with manual entry as a backup.

## Setup Instructions

### 1. Run Database Migrations

Open Supabase SQL Editor and run `supabase-migrations.sql` to add required columns.

### 2. Deploy Edge Function

The app requires a Supabase Edge Function to handle SimpleFin API requests (due to CORS restrictions).

**Via Dashboard (Recommended):**
1. Go to your Supabase Functions dashboard
2. Create new function named `simplefin-proxy`
3. Copy code from `supabase/functions/simplefin-proxy/index.ts`
4. Deploy

**Via CLI:**
```bash
supabase functions deploy simplefin-proxy
```

### 3. Connect SimpleFin

1. Get setup token from https://beta-bridge.simplefin.org/
2. In the app, go to Accounts page
3. Click "Connect SimpleFin"
4. Paste your setup token
5. Accounts will sync automatically!

## Features

- **Auto-sync on page load** - Accounts update when you open the page
- **Manual sync** - Sync button in Settings menu
- **Per-user connections** - Each user has independent SimpleFin integration
- **Manual backup** - Add accounts manually if not supported
- **Smart account types** - Auto-detects checking, savings, credit, investment, loan
- **Secure** - Access URLs and values are encrypted per-user

## Usage

**Accounts Page:**
- Shows all accounts (SimpleFin + manual)
- Green dot indicates SimpleFin-synced accounts
- SimpleFin account balances are read-only (synced from bank)
- Interest rates and contributions can be edited manually
- "Connect SimpleFin" button appears if not connected

**Settings Menu:**
- "Sync Now" button - Manual refresh of accounts
- "Disconnect SimpleFin" - Remove SimpleFin connection
- Last sync timestamp displayed

## Account Types

- **Checking/Savings** - Regular bank accounts (assets)
- **Credit Card** - Credit accounts (liabilities, shown as positive debt)
- **Investment** - Brokerage, 401k, IRA (assets with projections)
- **Loan** - Mortgages, loans (liabilities with projections)
- **Other** - Misc accounts

**Note:** Only Investment and Loan accounts show interest rate, monthly contribution, and future projections.

## Files Created/Modified

**New Files:**
- `src/utils/simplefinService.js` - SimpleFin API integration
- `src/components/SimpleFinSetup.js` - Setup modal
- `src/utils/encryption.js` - Added `decryptString` function
- `supabase/functions/simplefin-proxy/index.ts` - Edge Function
- `supabase-migrations.sql` - Database schema updates

**Modified Files:**
- `src/components/Accounts.js` - SimpleFin integration, expanded account types
- `src/components/SettingsButton.js` - Added sync/disconnect controls
- `src/components/SettingsMobile.js` - Added sync/disconnect controls

## Security

- SimpleFin access URLs are encrypted before storage
- Each user has isolated SimpleFin connection
- Account values encrypted per-user
- Edge Function validates only SimpleFin URLs

## Troubleshooting

**No accounts appearing:**
- Check browser console for errors
- Verify database migrations ran successfully
- Ensure Edge Function is deployed
- Get a new setup token (they're single-use)

**Connection issues:**
- Verify Edge Function is deployed and accessible
- Check Supabase function logs
- Ensure you ran migrations

**Accounts not syncing:**
- Use "Sync Now" in Settings menu
- Check that institutions are connected in SimpleFin Bridge

