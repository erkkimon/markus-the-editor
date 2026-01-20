/**
 * Comment popover component.
 * Shows contextual UI for comments:
 * - When text is selected: "Add Comment" button
 * - When cursor is in commented text: Shows comment, edit and delete buttons
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { EditorView } from 'prosemirror-view'
import { CommentState, addComment, updateComment, removeComment } from '../editor/plugins/commentPlugin'

interface CommentPopoverProps {
  /** Comment state from the plugin */
  state: CommentState
  /** The editor view */
  view: EditorView | null
  /** Container ref for positioning (must be the scroll container) */
  containerRef: React.RefObject<HTMLDivElement>
}

export function CommentPopover({ state, view, containerRef }: CommentPopoverProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newCommentText, setNewCommentText] = useState('')
  const popoverRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Reset state when comment changes
  useEffect(() => {
    if (!state.active && !state.hasSelection) {
      setIsEditing(false)
      setIsAddingNew(false)
      setNewCommentText('')
    }
    if (state.active) {
      setEditText(state.commentText)
    }
  }, [state.active, state.hasSelection, state.commentText])

  // Focus textarea when editing starts
  useEffect(() => {
    if ((isEditing || isAddingNew) && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing, isAddingNew])

  // Calculate position relative to scroll container
  const getPosition = useCallback((): { top: number; left: number } | null => {
    if (!state.rect || !containerRef.current) return null

    const container = containerRef.current
    const containerRect = container.getBoundingClientRect()

    // Convert viewport coords to content coords
    const top = state.rect.bottom - containerRect.top + container.scrollTop + 8
    const left = state.rect.left - containerRect.left

    return { top, left }
  }, [state.rect, containerRef])

  // Close popover on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEditing(false)
        setIsAddingNew(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Handle adding a new comment
  const handleAddComment = useCallback(() => {
    setIsAddingNew(true)
    setNewCommentText('')
  }, [])

  // Handle saving new comment
  const handleSaveNewComment = useCallback(() => {
    if (!view || !newCommentText.trim()) return

    addComment(view, newCommentText.trim(), state.from, state.to)
    setIsAddingNew(false)
    setNewCommentText('')
  }, [view, newCommentText, state.from, state.to])

  // Handle editing existing comment
  const handleStartEdit = useCallback(() => {
    setIsEditing(true)
    setEditText(state.commentText)
  }, [state.commentText])

  // Handle saving edited comment
  const handleSaveEdit = useCallback(() => {
    if (!view || !editText.trim()) return

    updateComment(view, state.from, state.to, editText.trim())
    setIsEditing(false)
  }, [view, editText, state.from, state.to])

  // Handle deleting comment
  const handleDelete = useCallback(() => {
    if (!view) return

    removeComment(view, state.from, state.to)
    setIsEditing(false)
  }, [view, state.from, state.to])

  // Handle key events in textarea
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (isAddingNew) {
        handleSaveNewComment()
      } else if (isEditing) {
        handleSaveEdit()
      }
    }
  }, [isAddingNew, isEditing, handleSaveNewComment, handleSaveEdit])

  const position = getPosition()

  // Don't show if no position or no active state
  if (!position || (!state.active && !state.hasSelection)) {
    return null
  }

  return (
    <div
      ref={popoverRef}
      className="comment-popover"
      style={{
        position: 'absolute',
        top: position.top,
        left: Math.max(8, Math.min(position.left, (containerRef.current?.clientWidth || 300) - 280)),
        zIndex: 50
      }}
    >
      {/* Selection mode - offer to add comment */}
      {state.hasSelection && !isAddingNew && (
        <button
          className="comment-add-btn"
          onClick={handleAddComment}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <line x1="12" y1="8" x2="12" y2="14" />
            <line x1="9" y1="11" x2="15" y2="11" />
          </svg>
          Add Comment
        </button>
      )}

      {/* Adding new comment */}
      {isAddingNew && (
        <div className="comment-edit-form">
          <textarea
            ref={textareaRef}
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your comment..."
            className="comment-textarea"
            rows={3}
          />
          <div className="comment-actions">
            <button
              className="comment-btn comment-btn-primary"
              onClick={handleSaveNewComment}
              disabled={!newCommentText.trim()}
            >
              Save
            </button>
            <button
              className="comment-btn"
              onClick={() => setIsAddingNew(false)}
            >
              Cancel
            </button>
          </div>
          <div className="comment-hint">Ctrl+Enter to save</div>
        </div>
      )}

      {/* Viewing existing comment */}
      {state.active && !isEditing && (
        <div className="comment-view">
          <div className="comment-text">{state.commentText}</div>
          <div className="comment-actions">
            <button
              className="comment-btn"
              onClick={handleStartEdit}
              title="Edit comment"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
            <button
              className="comment-btn comment-btn-danger"
              onClick={handleDelete}
              title="Delete comment"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Editing existing comment */}
      {state.active && isEditing && (
        <div className="comment-edit-form">
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="comment-textarea"
            rows={3}
          />
          <div className="comment-actions">
            <button
              className="comment-btn comment-btn-primary"
              onClick={handleSaveEdit}
              disabled={!editText.trim()}
            >
              Save
            </button>
            <button
              className="comment-btn"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
          </div>
          <div className="comment-hint">Ctrl+Enter to save</div>
        </div>
      )}
    </div>
  )
}
