<p align="center">
  <img src="extension/icons/icon128.png" alt="unInsta logo" width="128">
</p>

<h1 align="center">unInsta</h1>

<p align="center">Bulk unsend your messages in Instagram DM conversations.</p>

<p align="center">
  <img src="docs/screenshots/simple.png" alt="unInsta panel" width="45%">
  &nbsp;
  <img src="docs/screenshots/expanded.png" alt="unInsta in action" width="45%">
</p>

unInsta uses Instagram's internal API to iterate through all your messages in a conversation and unsend them one by one, with built-in rate limiting to avoid triggering Instagram's abuse detection.

## Features

- Unsend all your messages in the currently open DM conversation
- Set a boundary to only unsend messages newer than a specific date or message
- Auto-detects authentication from your active Instagram session
- Proactive rate limiting with jittered delays
- Floating panel with real-time log and progress tracking
- Works with Instagram's light and dark themes

## Install

Pick **one** of the two methods below -- you don't need both.

### Browser Extension (Chrome / Edge / Firefox) -- Recommended

1. Go to the [latest release](../../releases/latest)
2. Download `uninsta-extension.zip`
3. Unzip the file

**Chrome / Edge:**
- Navigate to `chrome://extensions`
- Enable "Developer mode"
- Click "Load unpacked" and select the unzipped folder

**Firefox:**
- Navigate to `about:debugging#/runtime/this-firefox`
- Click "Load Temporary Add-on"
- Select any file inside the unzipped folder

### Tampermonkey

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser
2. Go to the [latest release](../../releases/latest)
3. Download `uninsta.user.js`
4. Open Tampermonkey dashboard, click the "Utilities" tab
5. Under "Import from file", select the downloaded file

## Usage

1. Open Instagram and navigate to a DM conversation
2. Click the unInsta trigger button in the chat header (or the extension icon in the toolbar)
3. Optionally set a boundary (date or pick a specific message)
4. Click "Unsend All"
5. Watch the progress in the log panel

## How It Works

unInsta runs as a content script on `instagram.com/direct/*`. On load, it intercepts Instagram's own API requests to capture authentication credentials. When you click "Unsend All", it:

1. Reads your user ID from cookies
2. Extracts the thread ID from the URL
3. Fetches messages page by page via Instagram's REST API
4. Filters to only your own messages
5. Sends a delete request for each message with a ~3.5s jittered delay between requests
6. Handles rate limits (HTTP 429) automatically by backing off and retrying

## Building from Source

```bash
git clone https://github.com/dustfeather/uninsta.git
cd uninsta
npm install
npm run build
```

Outputs:
- `dist/uninsta.user.js` -- Tampermonkey userscript
- `dist/uninsta-extension.zip` -- Browser extension
- `dist/extension/` -- Unpacked extension directory

## Acknowledgements

Inspired by [Undiscord](https://github.com/victornpb/undiscord) by victornpb, which does the same thing for Discord messages.

## License

[GPL-3.0](LICENSE)
