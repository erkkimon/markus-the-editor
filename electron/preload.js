const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (args) => ipcRenderer.invoke('dialog:saveFile', args),
  onFileChanged: (callback) => ipcRenderer.on('file-changed', (_event, value) => callback(value))
})
