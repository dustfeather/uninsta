# Privacy Policy

**Last updated:** April 11, 2026

## Overview

unInsta is a browser extension that helps users unsend their own messages in Instagram DM conversations. This privacy policy explains what data the extension accesses, how it is used, and how it is stored.

## Data Collection

unInsta does **not** collect, transmit, or share any user data with external servers, third parties, or the extension developer. There are no analytics, telemetry, tracking, or advertising of any kind.

## Data Access

To function, unInsta accesses the following data locally within your browser:

- **Instagram session cookies** (`csrftoken`, `sessionid`, `ds_user_id`): Used to authenticate API requests to Instagram on your behalf. These are read from your browser's cookie store and sent only to `instagram.com`.
- **Instagram API tokens** (`fb_dtsg`, `lsd`, `x-ig-app-id`): Extracted from the Instagram web page to authenticate GraphQL requests. Sent only to `instagram.com`.
- **DM message data** (message IDs, timestamps, sender IDs, message text previews): Fetched from Instagram's API to identify your messages. Temporarily stored in your browser's IndexedDB during processing.

## Data Storage

- **IndexedDB**: Message IDs and metadata are temporarily stored in your browser's IndexedDB during the unsend process. This data is automatically deleted after all messages are processed. If the process is interrupted, the data persists locally until the next run completes.
- **localStorage**: A pagination cursor string is saved to resume interrupted operations. Cleared on completion.
- No data is ever written to external storage, cloud services, or remote servers.

## Data Transmission

All network requests are made exclusively to `instagram.com` using your existing browser session. unInsta does not communicate with any other server, domain, or endpoint. The extension has no backend, no API server, and no external dependencies at runtime.

## Permissions

- **Host permission** (`https://www.instagram.com/direct/*`): Required to inject the extension UI and make API requests to Instagram's DM endpoints on the user's behalf.

No other permissions are requested.

## Third-Party Services

unInsta does not integrate with, send data to, or receive data from any third-party services.

## Changes to This Policy

Updates to this privacy policy will be posted in the extension's GitHub repository at [github.com/dustfeather/uninsta](https://github.com/dustfeather/uninsta).

## Contact

For questions about this privacy policy, open an issue at [github.com/dustfeather/uninsta/issues](https://github.com/dustfeather/uninsta/issues).
