# Editor Conventions

This document describes the UX conventions and patterns used in Markus editor.

## Double-Backspace Deletion Pattern

Certain block elements require a double-backspace to delete, preventing accidental loss of content. This pattern applies to:

- **Tables** - when cursor is in the top-left cell (first cell) and the cell is empty
- **Blockquotes** - when cursor is at the start of an empty blockquote
- **Code blocks** - when cursor is at the start of an empty code block

### How It Works

1. **First backspace**: Shows a toast notification "Press backspace again to delete [element]"
2. **Second backspace within 2 seconds**: Deletes the element
3. **Timeout or cursor movement**: Cancels the pending deletion

### Why This Pattern?

Block elements like tables can contain significant content and are structurally complex. Accidental deletion would be frustrating for users. The double-backspace pattern provides a safety net while keeping deletion quick for intentional actions.

### Implementation Details

- The `deletionConfirm` plugin (`src/editor/plugins/deletionConfirm.ts`) tracks pending deletion state
- Toast notifications are handled by `src/lib/toast.ts` and `src/components/Toast.tsx`
- The keymap integrates the deletion handler as the first check in the backspace chain

## Table Controls

When editing a table, floating control buttons appear around it:

- **Add row button (+)**: Left side of current row - adds a row below
- **Add column button (+)**: Above current column - adds a column to the right
- **Delete row button (×)**: Right side of current row - removes the row (hidden when only 1 row)
- **Delete column button (×)**: Below current column - removes the column (hidden when only 1 column)
- **Delete table button (trash icon)**: Top-right corner - deletes the entire table

These controls appear only when the cursor is inside a table.

### Implementation Details

- The `tableControls` plugin (`src/editor/plugins/tableControls.ts`) tracks cursor position in tables
- The `TableControls` component (`src/components/TableControls.tsx`) renders the floating buttons
- Table operations are in `src/editor/tableUtils.ts`

## Collapsible Sections

Content can be collapsed to hide portions of the document while keeping the structure visible.

### Headings

Headings can be collapsed to hide all content until the next heading of the same or higher level:

- **H1** collapses everything until the next H1
- **H2** collapses everything until the next H1 or H2
- And so on for H3-H6

A collapse indicator (▼/▶) appears in the left margin when hovering over a heading. Click the indicator to toggle collapse state.

### List Items

List items that contain nested content (sub-lists or other blocks) can be collapsed:

- **Bullet points** with sub-bullets show a collapse indicator
- **Numbered lists** with nested content show a collapse indicator

Click the indicator to collapse/expand the nested content. Only the first paragraph of the list item remains visible when collapsed.

### Visual Feedback

- Expanded: ▼ indicator
- Collapsed: ▶ indicator (highlighted)
- Collapsed items show a left border accent to indicate hidden content

### Implementation Details

- The `collapse` plugin (`src/editor/plugins/collapse.ts`) manages collapse state and decorations
- Collapse state is tracked per-session (not persisted to the document)
- Uses ProseMirror decorations to add indicators and hide content
