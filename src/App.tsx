import { useState, useEffect } from 'react'
import { marked } from 'marked'
import './App.css'

declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<{ filePath: string; content: string } | null>;
      saveFile: (args: { filePath: string | null, content: string }) => Promise<string | null>;
      onFileChanged: (callback: (value: { content: string }) => void) => void;
    };
  }
}

function App() {
  const [markdown, setMarkdown] = useState('# Hello, Markus!')
  const [filePath, setFilePath] = useState<string | null>(null)
  const [fileChanged, setFileChanged] = useState(false)

  useEffect(() => {
    window.electronAPI.onFileChanged(({ content }) => {
      setMarkdown(content)
      setFileChanged(true)
    })
  }, [])

  const handleMarkdownChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMarkdown(event.target.value)
    setFileChanged(false)
  }

  const handleOpenFile = async () => {
    const result = await window.electronAPI.openFile()
    if (result) {
      setMarkdown(result.content)
      setFilePath(result.filePath)
      setFileChanged(false)
    }
  }

  const handleSaveFile = async () => {
    const savedFilePath = await window.electronAPI.saveFile({ filePath, content: markdown })
    if (savedFilePath) {
      setFilePath(savedFilePath)
      setFileChanged(false)
    }
  }

  const handleSaveFileAs = async () => {
    const savedFilePath = await window.electronAPI.saveFile({ filePath: null, content: markdown })
    if (savedFilePath) {
      setFilePath(savedFilePath)
      setFileChanged(false)
    }
  }

  const handleReloadFile = async () => {
    const result = await window.electronAPI.openFile()
    if (result) {
      setMarkdown(result.content)
      setFilePath(result.filePath)
      setFileChanged(false)
    }
  }

  return (
    <div className="app-container">
      <div className="toolbar">
        <button onClick={handleOpenFile}>Open File</button>
        <button onClick={handleSaveFile}>Save</button>
        <button onClick={handleSaveFileAs}>Save As</button>
        {filePath && <span className="file-path">{filePath}</span>}
        {fileChanged && (
          <div className="file-changed-warning">
            File has been changed externally.
            <button onClick={handleReloadFile}>Reload</button>
          </div>
        )}
      </div>
      <div className="editor-preview-container">
        <textarea
          className="editor"
          value={markdown}
          onChange={handleMarkdownChange}
        ></textarea>
        <div
          className="preview"
          dangerouslySetInnerHTML={{ __html: marked(markdown) }}
        ></div>
      </div>
    </div>
  )
}

export default App
