# Markus the Editor implementation plan

Below is a **“Markus the Editor” specification**. This is the initial plan and initial hypotheses and iinitial choices can be overriden but this document should provide preferences to start from. In a nutshell, this project outputs 100 % local cross-platform markdown editor which edits markdown files 100 % locally with WYSIWYG experience familiar from Obsidian and Notion. 

IMPORTANT: Use test-driven development best practices for confirming functionalities and bind them to automatic test so that it will be easy to always find out if there are regressions in previously implemented features. Also, do not run server commands or try to run the Electron app before absolutely necessary, preferably do not do it earlier than in final testing, so you should do all programming ready and double check everything before we test if the whole software in its all entirety works. Utilize build commands, linters and tests for verifying code quality and that the code compiles. 

---

### 1. Do you have to start from zero?
- **No**, but you will still write a fair amount of glue code.  
- A ready-made **WYSIWYG markdown surface** that already stores clean markdown under-the-hood is **ProseMirror**.  
  - It is the engine Obsidian, Notion-clones and many CMSs use.  
  - It is MIT, gives you full schema control, and has an **“input rules”** plugin that turns `*bold*` into **bold** while you type.  
- To get a Notion-like slash menu, drag-handle, embeds, etc. there are open-source ProseMirror packages (see “ProseMirror tables”, “prosemirror-slash-menu”, “prosemirror-codemark”).  
- The rest (window wrapper, native menus, file I/O, OS integration) is classic Electron work.

So the plan is:  
**Electron + React + ProseMirror + your favourite stack (bun, pnpm, tailwind, shadcn, radix)**.

---

### 2. Technology map
| Layer | Tech | Why |
|---|---|---|
| Runtime | **Bun** | Fast cold start, built-in TS, still works with almost every npm package. |
| Package manager | **pnpm** | Disk efficient, works with Bun. |
| Desktop shell | **Electron 28+** | One code-base → Win / macOS / Linux (Arch + GNOME first). |
| UI toolkit | **React 18** | We use React with strict TypeScript |
| Styling | **Tailwind CSS 3** | Rapid UI; shadcn components are Tailwind first. |
| Component lib | **shadcn/ui + Radix** | Headless, accessible, theme-able; copy-source model keeps bundle small. |
| Editor surface | **ProseMirror** | Real WYSIWYG, serialises to plain markdown, modular. |
| Markdown serialiser | `prosemirror-markdown` | Loss-less to / from CommonMark. |
| File I/O | Node `fs/promises` + `chokidar` | Watch for external changes. |
| Storage (meta) | `electron-store` | Tiny JSON k-v for recent files, window state, prefs. |
| Builder | `electron-builder` | PKGBUILD based installer for AUR and Cross-platform installer, AppImage / deb / rpm for Arch & friends, DMG, NSIS. |
| Update mechanism | `electron-updater` | Optional but one-liner, works with GitHub releases. |

---

### 3. Functional specification (MVP)
| # | Feature | Description | Notion parity |
|---|---|---|---|
| 1 | **Open / Save / Save-as** | Native system dialogs; writes `*.md`; encoding UTF-8. | ✔ |
| 2 | **Git-support** | If Git folder is detected, there should be a way to commit latest saved versions to current branch and push them. Or to pull latest changes. Also switching branch should be possible. Possible merge conflicts can be resolved in text version of markdown file or using external Git interface. | ✔ |
| 3 | **WYSIWYG editing** | Type `#` → instant heading; `**` → bold; `/` → slash menu. | ✔ |
| 4 | **Live preview toggle** | Optional split pane (side-by-side) if user wants classic view. | ✔ |
| 5 | **Draggable blocks** | Paragraph, list, image, code fence can be re-ordered via handle. | ✔ |
| 6 | **Syntax highlighting** | Code fences get prism highlight in preview; editor shows subtle background tint. | ✔ |
| 7 | **Light / Dark theme** | Tailwind classes + CSS variables; follow system by default. | ✔ |
| 8 | **Command palette** | `Ctrl/Cmd + P` → quick switch file / command search. | ✔ |
| 9 | **Recent files** | Sub-menu in “File”; store absolute paths, survive restarts. | ✔ |
|10 | **Word counter** | Status-bar item; updates on transaction. | ✔ |
|11 | **Print → PDF** | Use Electron `webContents.printToPDF`; respects preview theme. | ✔ |
|12 | **Drag-and-drop** | Drop `.md` into window → opens file. | ✔ |
|13 | **Desktop entry** | Register as default for `text/markdown` mime; double-click opens. | ✔ |

---

### 4. Project skeleton
```
markus-the-editor/
├─ electron/               # main-process code
│  ├─ main.ts              # window life-cycle, menus, IPC
│  ├─ preload.ts           # secure expose of fs APIs to renderer
│  └─ menu.ts              # Application menu (File, Edit, View …)
├─ src/
│  ├─ app.tsx              # React root
│  ├─ editor/
│  │  ├─ ProseMirrorEditor.tsx
│  │  ├─ schema.ts         # ProseMirror nodes/marks ↔ markdown
│  │  ├─ plugins/          # slashMenu, inputRules, keymap
│  │  └─ styles.css
│  ├─ components/          # shadcn wrappers (Button, Dialog…)
│  ├─ lib/                 # utils, types, constants
│  └─ assets/
├─ resources/
│  ├─ icons/512x512.png    # Electron builder will pick these
│  └─ linux/markus.desktop # Desktop entry template
├─ package.json
├─ tsconfig.json
├─ tailwind.config.js
├─ vite.config.ts          # Build renderer bundle (fast HMR)
└─ electron-builder.yml    # Single file config for all OS
```

---

### 5. Desktop integration (Linux focus)
1. **Desktop entry** (`markus.desktop`)
   ```ini
   [Desktop Entry]
   Name=Markus
   Comment=WYSIWYG Markdown editor
   Exec=markus %F
   Icon=markus
   MimeType=text/markdown;text/x-markdown;
   Categories=TextEditor;Utility;
   ```
2. **electron-builder** creates AppImage / pacman / deb / rpm.  
3. **mime** registration handled by installer; Electron’s `setAsDefaultProtocolClient` for `markdown` extension.  
4. **Flatpak** can be added later via `flatpak-builder` manifest.

---

### 6. Build & dev scripts (package.json excerpt)
```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "electron": "electron .",
  "dev:full": "concurrently -k \"bun run dev\" \"wait-on http://localhost:5173 && electron .\"",
  "dist": "electron-builder --publish=never"
}
```

---

### 7. High-level implementation plan (milestones)
| Milestone | Goal | Days |
|---|---|---|
| M1 | Boilerplate + Hello-Electron window + React renderer | 1 |
| M2 | ProseMirror wired in; can type markdown and see live render | 2 |
| M3 | Schema finished: headings, bold, italic, lists, code fence, image | 2 |
| M4 | File open / save + menu bar + keyboard shortcuts | 2 |
| M5 | Basic Git functionalities: pull, commit and push | 2 |
| M6 | Split-pane toggle, light/dark theme, word counter | 2 |
| M7 | Drag-handle blocks, slash menu, command palette | 3 |
| M8 | Packaging for Linux (AppImage), .desktop entry, file association | 2 |
| M9 | QA on Arch + GNOME, performance pass, documentation | 2 |

---

