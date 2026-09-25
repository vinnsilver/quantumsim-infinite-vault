QuantumSIM Infinite Vault — USB edition

1. Copy QuantumSIM.html and Start-QuantumSIM.bat to the USB drive.
2. On a Windows laptop, double-click Start-QuantumSIM.bat. If that does not work, open QuantumSIM.html in a modern browser.
3. Tap/click UNLOCK and enter the configured access key.

The HTML is self-contained and does not require Node.js or an internet connection to launch. Uploaded files and vault changes are automatically saved by the browser on that device and remain after closing/reopening the page. Browser support varies: many smart TVs do not open local HTML files from USB. On those TVs, use a supported browser and a hosted website or open the page from a computer on the same network.

Important limitations:
- USB insertion cannot automatically launch a browser on modern Windows, macOS, Linux, or most TVs; this is blocked for security. Start it manually with the batch file on Windows.
- Saved items are stored separately by each browser/device. To move the vault data, unlock it, choose Download All Saved Data, then import that JSON backup on the other device. Large backups may exceed browser storage limits.
- This demo's unlock screen is only a front-end gate. It is not real encryption or strong access control; do not put sensitive data in it.
- To view the same live data simultaneously on multiple devices, deploy the app with a secure shared backend. A static USB page alone cannot synchronize devices.

Build the USB edition in the project using: npm run build:usb
The generated folder is usb-release.
