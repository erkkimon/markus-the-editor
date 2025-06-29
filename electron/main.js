const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const isDev = require('electron-is-dev')
const { readFileSync, writeFileSync, watch } = require('fs')

let fileWatcher = null
let mainWindow = null

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, '../dist/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  })

  win.loadURL(
    isDev
      ? process.env.VITE_DEV_SERVER_URL
      : `file://${path.join(__dirname, '../dist/index.html')}`
  )

  if (isDev) {
    win.webContents.openDevTools()
  }

  win.on('closed', () => {
    mainWindow = null
    if (fileWatcher) {
      fileWatcher.close()
    }
  })

  return win
}

app.whenReady().then(() => {
  mainWindow = createWindow()

  ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Markdown Files', extensions: ['md'] }],
    })
    if (canceled) {
      return null
    } else {
      const filePath = filePaths[0]
      const content = readFileSync(filePath, 'utf-8')

      if (fileWatcher) {
        fileWatcher.close()
      }

      fileWatcher = watch(filePath, (eventType) => {
        if (eventType === 'change' && mainWindow) {
          const newContent = readFileSync(filePath, 'utf-8')
          mainWindow.webContents.send('file-changed', { filePath, content: newContent })
        }
      })

      return { filePath, content }
    }
  })

  ipcMain.handle('dialog:saveFile', async (event, { filePath, content }) => {
    if (filePath) {
      writeFileSync(filePath, content)
      return filePath
    } else {
      const { canceled, filePath: newFilePath } = await dialog.showSaveDialog({
        filters: [{ name: 'Markdown Files', extensions: ['md'] }],
      })
      if (canceled) {
        return null
      } else {
        writeFileSync(newFilePath, content)
        return newFilePath
      }
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
