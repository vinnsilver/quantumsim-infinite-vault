<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/7569bcb8-eab4-4220-a50e-9ca23ce3b75a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## USB / offline use

Run `npm run build:usb` to create a self-contained `usb-release` folder. Copy its `QuantumSIM.html`, `Start-QuantumSIM.bat`, and `USB-README.txt` files to a USB drive. On Windows laptops, double-click the batch file to open the page in the default browser. The HTML file can also be opened directly in a modern browser without Node.js or an internet connection.

USB insertion cannot automatically launch a browser on modern computers, and many smart TVs do not support running local HTML from USB. For TV viewing, use a supported browser and a hosted copy or serve it from a computer on the same network.

Uploaded files and vault changes are automatically saved in the current browser's local database and survive closing and reopening the page. Saved data belongs to that browser/device. Use **Download All Saved Data** and **Import Backup** to transfer a backup manually. This demo has no shared backend, and its unlock screen is a front-end gate rather than encryption; do not store sensitive data in it.
