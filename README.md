# Markus the Writer

**Markus the Writer** is a clean, snappy, and elegant Markdown editor built natively for the desktop. Designed with the GNOME/Linux environment in mind and cross-platform by nature, Markus provides a modern writing experience while respecting your system resources and file structure.

> 📝 A writer-first Markdown editor with real-time WYSIWYG rendering
> ⚡ Built using Electron and React for fast iteration and reliable local file access
> 📁 Supports direct opening of `.md` files via double-click (e.g., from Nautilus)
> 🔒 Works entirely offline with your local filesystem

---

## ✨ Features

* Real-time Markdown rendering with intuitive editing behavior
* WYSIWYG interface with clean, distraction-free layout
* Native file access: open, save, and edit `.md` files directly on disk
* Change detection: warns when files are modified outside the app
* Registerable as the default application for `.md` files
* Cross-platform support: GNOME/Linux, macOS, and Windows

---

## 🧱 Technology Stack

* **Electron** – Provides system integration and desktop container
* **React + TypeScript** – Power the UI and component logic
* **Vite** – Fast frontend bundler for smooth development
* **Marked** – For Markdown parsing and rendering

---

## 📁 Project Structure

```
markus/
├── electron/         # Electron main & preload scripts
├── src/              # React UI components and logic
├── public/           # Static assets (e.g., icons)
├── dist/             # Production output
├── package.json      # Root project config
├── vite.config.ts    # Build tool configuration
```

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
pnpm install
```

Or use `npm` or `yarn` if preferred.

### 2. Start development mode

```bash
pnpm dev
```

This will:

* Launch the Vite dev server for the frontend
* Start Electron with hot reload

### 3. Build the application

```bash
pnpm build
```

### 4. Package the app for distribution

```bash
pnpm package
```

This uses `electron-builder` to create native installers and binaries.

---

## 📦 File Handling

* Launch `markus` with a file path to open it directly:

```bash
markus ~/Documents/notes.md
```

* Register Markus as the default app for `.md` files to enable double-click opening from your file manager.