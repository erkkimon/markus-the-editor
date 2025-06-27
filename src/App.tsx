import { useState } from 'react'
import { marked } from 'marked'
import './App.css'

declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<{ filePath: string; content: string } | null>;
    };
  }
}

function App() {
  const [markdown, setMarkdown] = useState('# Hello, Markus!')
  const [filePath, setFilePath] = useState<string | null>(null)

  const handleMarkdownChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMarkdown(event.target.value)
  }

  const handleOpenFile = async () => {
    const result = await window.electronAPI.openFile()
    if (result) {
      setMarkdown(result.content)
      setFilePath(result.filePath)
    }
  }

  return (
    <div className="app-container">
      <div className="toolbar">
        <button onClick={handleOpenFile}>Open File</button>
        {filePath && <span className="file-path">{filePath}</span>}
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
