const { contextBridge, ipcRenderer } = require('electron');

// Expose safe Electron APIs to renderer process if needed
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true
});
