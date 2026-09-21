# dear you

A small confession app with device-native camera/gallery selection and a secure multipart upload endpoint.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm start` and open `http://localhost:3000`.

Camera permissions require a secure context in production. `localhost` is treated as secure by modern browsers; deploy behind HTTPS and set `NODE_ENV=production` so the API rejects non-HTTPS requests.

The frontend never reads the camera or gallery without a user action. The browser's native picker controls whether the user grants full, limited, or no photo access; web browsers do not expose an API to enumerate a device's entire library or deep-link into device settings. The gallery renders every photo the user authorizes in the current picker session, and the user taps exactly one photo to attach. Photos are held in browser memory and only sent as the `photo` multipart field when the user presses **Send confession**. The API accepts JPG, PNG, and WebP files up to 8 MB, verifies the detected file signature, and does not write uploads to disk.