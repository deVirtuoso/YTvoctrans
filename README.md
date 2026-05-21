# VoiceTranslate Lite

VoiceTranslate Lite is a streamlined Chrome extension for real-time dubbed voice translation and captioning on YouTube, coupled with a serverless user subscription management backend.

## Structure

- **Extension Root**: Contains the unpacked Chrome Extension assets (`manifest.json`, `popup.html`, content scripts, background worker, assets, etc.).
- **`backend/`**: A serverless Next.js web application designed to run on Vercel. It processes translation jobs, serves audio segments from a Turso SQLite database, manages Stripe subscription states, handles Google OAuth 2.0 logins, and sends automated transactional emails.
- **`webstore-assets/`**: High-quality promotional images, screenshots, tiles, and thumbnails for Chrome Web Store publishing.
- **`stripe-branding/`**: Official 128x128 and 512x512 logo icons prepared for Stripe Dashboard checkout branding.

## Load the Extension

1. Open Google Chrome.
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** (top-left button).
5. Select this project root folder.

## Deployment & Setup

For instructions on deploying the authentication and translation serverless backend, refer to the [backend README](file:///h:/NETWORKPEN/AI%20Works/YTvoctrans-main/backend/README.md).
