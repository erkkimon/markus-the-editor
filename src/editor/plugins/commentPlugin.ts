/**
 * Comment plugin for the editor.
 * Handles:
 * - Detecting when cursor is inside commented text
 * - Creating new comments from text selection
 * - Deleting existing comments
 *
 * Comments are stored as marks on text nodes with a 'text' attribute
 * containing the comment content. In markdown, they serialize to:
 * <!-- COMMENT: "escaped text" -->highlighted text<!-- /COMMENT -->
 */
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'

/** State for the active comment (cursor is inside commented text) */
export interface CommentState {
  /** Whether there's an active comment at cursor position */
  active: boolean
  /** The comment text content */
  commentText: string
  /** Start position of the commented text in the document */
  from: number
  /** End position of the commented text in the document */
  to: number
  /** Whether there's a text selection that can be commented */
  hasSelection: boolean
  /** DOM rect of the commented text for positioning popover */
  rect: DOMRect | null
}

export const commentPluginKey = new PluginKey<CommentState>('comment')

const emptyCommentState: CommentState = {
  active: false,
  commentText: '',
  from: 0,
  to: 0,
  hasSelection: false,
  rect: null
}


/**
 * Get the bounding rect for a range of text in the editor.
 */
function getRangeRect(view: EditorView, from: number, to: number): DOMRect | null {
  try {
    const start = view.coordsAtPos(from)
    const end = view.coordsAtPos(to)
    return new DOMRect(
      start.left,
      start.top,
      end.right - start.left,
      Math.max(end.bottom - start.top, 20)
    )
  } catch {
    return null
  }
}

/**
 * Create the comment plugin.
 * @param onStateChange - Callback when comment state changes
 */
export function createCommentPlugin(
  onStateChange: (state: CommentState) => void
): Plugin<CommentState> {
  return new Plugin<CommentState>({
    key: commentPluginKey,

    state: {
      init(): CommentState {
        return emptyCommentState
      },

      apply(_tr, _value, _oldState, newState): CommentState {
        // Recalculate state based on new selection
        const { selection } = newState
        const { empty, from, to } = selection

        // Check for text selection
        const hasSelection = !empty && selection instanceof TextSelection

        // Check if cursor is in commented text
        if (empty) {
          // No selection - check if cursor is in a comment
          const $from = selection.$from
          const marks = $from.marks()
          const commentMark = marks.find(m => m.type.name === 'comment')

          if (commentMark) {
            // Find the full extent of this comment
            let markFrom = from
            let markTo = to

            // Walk backwards
            let pos = from
            while (pos > 0) {
              const $pos = newState.doc.resolve(pos - 1)
              if (!$pos.marks().some(m => m.eq(commentMark))) break
              pos--
            }
            markFrom = pos

            // Walk forwards
            pos = from
            while (pos < newState.doc.content.size) {
              const node = newState.doc.nodeAt(pos)
              if (!node || !node.marks.some(m => m.eq(commentMark))) break
              pos++
            }
            markTo = pos

            return {
              active: true,
              commentText: commentMark.attrs.text || '',
              from: markFrom,
              to: markTo,
              hasSelection: false,
              rect: null // Will be updated by view
            }
          }
        }

        return {
          active: false,
          commentText: '',
          from,
          to,
          hasSelection,
          rect: null
        }
      }
    },

    view(view) {
      // Update state with DOM rect when needed
      function updateRect() {
        const state = commentPluginKey.getState(view.state)
        if (state && (state.active || state.hasSelection)) {
          const rect = getRangeRect(view, state.from, state.to)
          if (rect) {
            const newState = { ...state, rect }
            onStateChange(newState)
            return
          }
        }
        if (state) {
          onStateChange(state)
        }
      }

      // Initial state
      updateRect()

      return {
        update() {
          updateRect()
        },
        destroy() {
          onStateChange(emptyCommentState)
        }
      }
    }
  })
}

/**
 * Add a comment to the current selection.
 * @param view - The editor view
 * @param commentText - The comment text
 * @param from - Start of selection (optional, uses current selection if not provided)
 * @param to - End of selection (optional, uses current selection if not provided)
 */
export function addComment(
  view: EditorView,
  commentText: string,
  from?: number,
  to?: number
): void {
  const { state } = view
  const { schema } = state
  const selFrom = from ?? state.selection.from
  const selTo = to ?? state.selection.to

  if (selFrom === selTo) return // No selection

  const commentMark = schema.marks.comment.create({ text: commentText })
  const tr = state.tr.addMark(selFrom, selTo, commentMark)
  view.dispatch(tr)
}

/**
 * Update an existing comment's text.
 * @param view - The editor view
 * @param from - Start of the commented range
 * @param to - End of the commented range
 * @param newText - The new comment text
 */
export function updateComment(
  view: EditorView,
  from: number,
  to: number,
  newText: string
): void {
  const { state } = view
  const { schema } = state

  // Remove old comment mark and add new one
  const tr = state.tr
    .removeMark(from, to, schema.marks.comment)
    .addMark(from, to, schema.marks.comment.create({ text: newText }))
  view.dispatch(tr)
}

/**
 * Remove a comment from a range.
 * @param view - The editor view
 * @param from - Start of the commented range
 * @param to - End of the commented range
 */
export function removeComment(
  view: EditorView,
  from: number,
  to: number
): void {
  const { state } = view
  const { schema } = state

  const tr = state.tr.removeMark(from, to, schema.marks.comment)
  view.dispatch(tr)
}
