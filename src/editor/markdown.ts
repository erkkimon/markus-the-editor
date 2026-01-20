/**
 * Markdown parsing and serialization for the editor.
 * Uses prosemirror-markdown with markdown-it for parsing markdown text into
 * ProseMirror documents and serializing documents back to markdown.
 * Supports GFM (GitHub Flavored Markdown) including tables.
 */
import { MarkdownParser, MarkdownSerializer, MarkdownSerializerState } from 'prosemirror-markdown'
import MarkdownIt from 'markdown-it'
import { schema } from './schema'
import { Mark, Node } from 'prosemirror-model'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const md = new (MarkdownIt as any)()

// Base parser without table support - we'll wrap it to add table handling
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const baseMarkdownParser = new MarkdownParser(schema, md as any, {
  blockquote: { block: 'blockquote' },
  paragraph: { block: 'paragraph' },
  list_item: { block: 'list_item' },
  bullet_list: { block: 'bullet_list' },
  ordered_list: { block: 'ordered_list', getAttrs: (tok) => ({ order: +(tok.attrGet('start') || 1) }) },
  heading: { block: 'heading', getAttrs: (tok) => ({ level: +tok.tag.slice(1) }) },
  code_block: { block: 'code_block', noCloseToken: true },
  fence: { block: 'code_block', getAttrs: (tok) => ({ language: tok.info || '' }), noCloseToken: true },
  hr: { node: 'horizontal_rule' },
  image: { node: 'image', getAttrs: (tok) => ({
    src: tok.attrGet('src'),
    title: tok.attrGet('title') || null,
    alt: tok.children?.[0]?.content || null
  })},
  hardbreak: { node: 'hard_break' },
  em: { mark: 'em' },
  strong: { mark: 'strong' },
  link: { mark: 'link', getAttrs: (tok) => ({
    href: tok.attrGet('href'),
    title: tok.attrGet('title') || null
  })},
  code_inline: { mark: 'code' },
  s: { mark: 'strikethrough' },
  // Tables need special handling - ignore here, handled in wrapper
  table: { ignore: true },
  thead: { ignore: true },
  tbody: { ignore: true },
  tr: { ignore: true },
  th: { ignore: true },
  td: { ignore: true },
  // Ignore other unsupported tokens
  html_block: { ignore: true, noCloseToken: true },
  html_inline: { ignore: true, noCloseToken: true }
})

/**
 * Parse table tokens from markdown-it into ProseMirror nodes.
 * Handles the complex nested structure of tables and wraps cell content in paragraphs.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTableTokens(tokens: any[]): Node | null {
  const rows: Node[] = []
  let currentRow: Node[] = []
  let currentCellType: string | null = null
  let currentCellContent: Node[] = []

  for (const token of tokens) {
    if (token.type === 'table_open') {
      rows.length = 0
    } else if (token.type === 'table_close') {
      if (rows.length > 0) {
        return schema.nodes.table.create(null, rows)
      }
    } else if (token.type === 'tr_open') {
      currentRow = []
    } else if (token.type === 'tr_close') {
      if (currentRow.length > 0) {
        rows.push(schema.nodes.table_row.create(null, currentRow))
      }
    } else if (token.type === 'th_open') {
      currentCellType = 'table_header'
      currentCellContent = []
    } else if (token.type === 'td_open') {
      currentCellType = 'table_cell'
      currentCellContent = []
    } else if (token.type === 'th_close' || token.type === 'td_close') {
      if (currentCellType) {
        // Wrap cell content in a paragraph
        const paragraph = schema.nodes.paragraph.create(
          null,
          currentCellContent.length > 0 ? currentCellContent : null
        )
        const cell = schema.nodes[currentCellType].create(null, paragraph)
        currentRow.push(cell)
      }
      currentCellType = null
      currentCellContent = []
    } else if (token.type === 'inline' && currentCellType) {
      // Parse inline content for cell
      if (token.children) {
        for (const child of token.children) {
          if (child.type === 'text') {
            currentCellContent.push(schema.text(child.content))
          } else if (child.type === 'strong_open') {
            // Handle nested marks - simplified for now
          } else if (child.type === 'em_open') {
            // Handle nested marks - simplified for now
          }
          // For simplicity, just handle plain text in table cells
        }
      } else if (token.content) {
        currentCellContent.push(schema.text(token.content))
      }
    }
  }

  return null
}

/**
 * Custom markdown parser that handles tables specially.
 * Tables require custom handling because prosemirror-markdown's standard
 * block handlers don't properly wrap inline cell content in paragraphs.
 */
export const markdownParser = {
  parse(content: string): Node | null {
    // First, check if there are tables and parse them specially
    const tokens = md.parse(content, {})

    // Find table ranges and parse them separately
    const tableRanges: { start: number; end: number }[] = []
    let tableStart = -1
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === 'table_open') {
        tableStart = i
      } else if (tokens[i].type === 'table_close' && tableStart >= 0) {
        tableRanges.push({ start: tableStart, end: i })
        tableStart = -1
      }
    }

    // If no tables, use standard parser
    if (tableRanges.length === 0) {
      return baseMarkdownParser.parse(content)
    }

    // Build document with tables
    const children: Node[] = []

    // Process content before first table
    let lastEnd = 0
    for (const range of tableRanges) {
      // Parse content before this table
      if (range.start > lastEnd) {
        const beforeTokens = tokens.slice(lastEnd, range.start)
        if (beforeTokens.length > 0) {
          // Reconstruct markdown for non-table content
          const beforeContent = getContentFromTokens(content, tokens, lastEnd, range.start)
          if (beforeContent.trim()) {
            const doc = baseMarkdownParser.parse(beforeContent)
            if (doc) {
              doc.forEach((child) => children.push(child))
            }
          }
        }
      }

      // Parse the table
      const tableTokens = tokens.slice(range.start, range.end + 1)
      const table = parseTableTokens(tableTokens)
      if (table) {
        children.push(table)
      }

      lastEnd = range.end + 1
    }

    // Parse content after last table
    if (lastEnd < tokens.length) {
      const afterContent = getContentFromTokens(content, tokens, lastEnd, tokens.length)
      if (afterContent.trim()) {
        const doc = baseMarkdownParser.parse(afterContent)
        if (doc) {
          doc.forEach((child) => children.push(child))
        }
      }
    }

    if (children.length === 0) {
      return schema.nodes.doc.create(null, schema.nodes.paragraph.create())
    }

    return schema.nodes.doc.create(null, children)
  }
}

/**
 * Extract the original markdown content for a range of tokens.
 * Uses the token's map property to find the line range.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getContentFromTokens(content: string, tokens: any[], startIdx: number, endIdx: number): string {
  const lines = content.split('\n')
  let minLine = Infinity
  let maxLine = -1

  for (let i = startIdx; i < endIdx; i++) {
    const token = tokens[i]
    if (token.map) {
      minLine = Math.min(minLine, token.map[0])
      maxLine = Math.max(maxLine, token.map[1])
    }
  }

  if (minLine === Infinity || maxLine === -1) {
    return ''
  }

  return lines.slice(minLine, maxLine).join('\n')
}

export const markdownSerializer = new MarkdownSerializer({
  blockquote(state, node) {
    state.wrapBlock('> ', null, node, () => state.renderContent(node))
  },
  code_block(state, node) {
    const language = node.attrs.language || ''
    state.write('```' + language + '\n')
    state.text(node.textContent, false)
    state.ensureNewLine()
    state.write('```')
    state.closeBlock(node)
  },
  heading(state, node) {
    state.write(state.repeat('#', node.attrs.level) + ' ')
    state.renderInline(node)
    state.closeBlock(node)
  },
  horizontal_rule(state, node) {
    state.write(node.attrs.markup || '---')
    state.closeBlock(node)
  },
  bullet_list(state, node) {
    state.renderList(node, '  ', () => '- ')
  },
  ordered_list(state, node) {
    const start = node.attrs.order || 1
    const maxW = String(start + node.childCount - 1).length
    const space = state.repeat(' ', maxW + 2)
    state.renderList(node, space, (i) => {
      const nStr = String(start + i)
      return state.repeat(' ', maxW - nStr.length) + nStr + '. '
    })
  },
  list_item(state, node) {
    state.renderContent(node)
  },
  paragraph(state, node) {
    state.renderInline(node)
    state.closeBlock(node)
  },
  image(state, node) {
    state.write('![' + state.esc(node.attrs.alt || '') + '](' + node.attrs.src +
      (node.attrs.title ? ' "' + node.attrs.title.replace(/"/g, '\\"') + '"' : '') + ')')
  },
  hard_break(state, node, parent, index) {
    for (let i = index + 1; i < parent.childCount; i++) {
      if (parent.child(i).type !== node.type) {
        state.write('  \n')
        return
      }
    }
  },
  text(state, node) {
    state.text(node.text || '')
  },
  // Table serialization - outputs GFM pipe table syntax
  table(state, node) {
    serializeTable(state, node)
  },
  table_row(state, node) {
    // Row serialization is handled by the table serializer
    state.renderContent(node)
  },
  table_header(state, node) {
    // Cell serialization is handled by the table serializer
    state.renderContent(node)
  },
  table_cell(state, node) {
    // Cell serialization is handled by the table serializer
    state.renderContent(node)
  }
}, {
  em: {
    open: '*',
    close: '*',
    mixable: true,
    expelEnclosingWhitespace: true
  },
  strong: {
    open: '**',
    close: '**',
    mixable: true,
    expelEnclosingWhitespace: true
  },
  link: {
    open(_state, mark: Mark, parent: Node, index: number) {
      return isPlainURL(mark, parent, index, 1) ? '<' : '['
    },
    close(_state, mark: Mark, parent: Node, index: number) {
      return isPlainURL(mark, parent, index, -1)
        ? '>'
        : '](' + mark.attrs.href + (mark.attrs.title ? ' "' + mark.attrs.title.replace(/"/g, '\\"') + '"' : '') + ')'
    }
  },
  code: {
    open(_state, _mark: Mark, parent: Node, index: number) {
      return backticksFor(parent.child(index), -1)
    },
    close(_state, _mark: Mark, parent: Node, index: number) {
      return backticksFor(parent.child(index - 1), 1)
    },
    escape: false
  },
  strikethrough: {
    open: '~~',
    close: '~~',
    mixable: true,
    expelEnclosingWhitespace: true
  }
})

function backticksFor(node: Node, side: number) {
  const ticks = /`+/g
  let m: RegExpExecArray | null
  let len = 0
  if (node.isText && node.text) {
    while ((m = ticks.exec(node.text))) {
      len = Math.max(len, m[0].length)
    }
  }
  let result = len > 0 && side > 0 ? ' `' : '`'
  for (let i = 0; i < len; i++) result += '`'
  if (len > 0 && side < 0) result += ' '
  return result
}

function isPlainURL(link: Mark, parent: Node, index: number, side: number) {
  if (link.attrs.title || !/^\w+:/.test(link.attrs.href)) return false
  const content = parent.child(index + (side < 0 ? -1 : 0))
  if (!content.isText || content.text !== link.attrs.href || content.marks[content.marks.length - 1] !== link) return false
  if (index === (side < 0 ? 1 : parent.childCount - 1)) return true
  const next = parent.child(index + (side < 0 ? -2 : 1))
  return !link.isInSet(next.marks)
}

/**
 * Serialize a table node to GFM pipe table format.
 * Outputs:
 * | Header 1 | Header 2 |
 * | -------- | -------- |
 * | Cell 1   | Cell 2   |
 */
function serializeTable(state: MarkdownSerializerState, table: Node) {
  // Collect all rows and their cell contents
  const rows: string[][] = []
  let hasHeaderRow = false

  table.forEach((row) => {
    const cells: string[] = []
    row.forEach((cell) => {
      // Serialize cell content as inline markdown
      // We need to capture the text without block-level formatting
      const cellContent = getCellTextContent(cell)
      cells.push(cellContent)

      // Check if this is a header cell
      if (cell.type.name === 'table_header') {
        hasHeaderRow = true
      }
    })
    rows.push(cells)
  })

  if (rows.length === 0) return

  // Determine column widths for alignment
  const colCount = Math.max(...rows.map(r => r.length))
  const colWidths: number[] = []
  for (let col = 0; col < colCount; col++) {
    let maxWidth = 3 // Minimum width for separator
    for (const row of rows) {
      if (row[col]) {
        maxWidth = Math.max(maxWidth, row[col].length)
      }
    }
    colWidths.push(maxWidth)
  }

  // Write the table
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    // Write cells
    state.write('|')
    for (let col = 0; col < colCount; col++) {
      const content = row[col] || ''
      state.write(' ' + content.padEnd(colWidths[col]) + ' |')
    }
    state.write('\n')

    // Write separator after header row (first row if it has headers, or first row anyway)
    if (i === 0 && (hasHeaderRow || rows.length > 1)) {
      state.write('|')
      for (let col = 0; col < colCount; col++) {
        state.write(' ' + '-'.repeat(colWidths[col]) + ' |')
      }
      state.write('\n')
    }
  }

  state.closeBlock(table)
}

/**
 * Extract plain text content from a cell node.
 * This handles the case where cells contain paragraph nodes.
 */
function getCellTextContent(cell: Node): string {
  let text = ''
  cell.forEach((child) => {
    if (child.isText) {
      text += child.text || ''
    } else if (child.type.name === 'paragraph') {
      // Paragraphs in cells - get their text content
      child.forEach((inline) => {
        if (inline.isText) {
          text += inline.text || ''
        }
      })
    } else {
      // For other block types, just get text content
      text += child.textContent
    }
  })
  return text.trim()
}
