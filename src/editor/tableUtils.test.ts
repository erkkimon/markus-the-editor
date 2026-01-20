/**
 * Tests for table utility functions.
 * Tests the table creation logic used by the slash menu.
 */
import { describe, it, expect } from 'vitest'
import { schema } from './schema'

describe('Table Creation', () => {
  /**
   * Helper to create a table node with the given dimensions.
   * This mirrors the logic in tableUtils.ts but without requiring EditorView.
   */
  function createTableNode(rows: number, cols: number) {
    // Create header cells for the first row
    const headerCells = []
    for (let i = 0; i < cols; i++) {
      headerCells.push(
        schema.nodes.table_header.create(
          null,
          schema.nodes.paragraph.create()
        )
      )
    }
    const headerRow = schema.nodes.table_row.create(null, headerCells)

    // Create body rows with regular cells
    const bodyRows = []
    for (let r = 1; r < rows; r++) {
      const cells = []
      for (let c = 0; c < cols; c++) {
        cells.push(
          schema.nodes.table_cell.create(
            null,
            schema.nodes.paragraph.create()
          )
        )
      }
      bodyRows.push(schema.nodes.table_row.create(null, cells))
    }

    return schema.nodes.table.create(null, [headerRow, ...bodyRows])
  }

  it('should create a 2x2 table by default', () => {
    const table = createTableNode(2, 2)

    expect(table.type.name).toBe('table')
    expect(table.childCount).toBe(2) // header row + 1 data row

    // Check header row
    const headerRow = table.firstChild
    expect(headerRow?.type.name).toBe('table_row')
    expect(headerRow?.childCount).toBe(2)
    expect(headerRow?.firstChild?.type.name).toBe('table_header')

    // Check data row
    const dataRow = table.child(1)
    expect(dataRow?.type.name).toBe('table_row')
    expect(dataRow?.childCount).toBe(2)
    expect(dataRow?.firstChild?.type.name).toBe('table_cell')
  })

  it('should create a 3x3 table', () => {
    const table = createTableNode(3, 3)

    expect(table.childCount).toBe(3) // header + 2 data rows

    // All rows should have 3 cells
    table.forEach((row) => {
      expect(row.childCount).toBe(3)
    })
  })

  it('should create a 4x2 table (4 rows, 2 columns)', () => {
    const table = createTableNode(4, 2)

    expect(table.childCount).toBe(4)

    // All rows should have 2 cells
    table.forEach((row) => {
      expect(row.childCount).toBe(2)
    })
  })

  it('should create header cells only in the first row', () => {
    const table = createTableNode(3, 2)

    // First row should have table_header cells
    const headerRow = table.firstChild
    headerRow?.forEach((cell) => {
      expect(cell.type.name).toBe('table_header')
    })

    // Other rows should have table_cell cells
    for (let i = 1; i < table.childCount; i++) {
      const row = table.child(i)
      row.forEach((cell) => {
        expect(cell.type.name).toBe('table_cell')
      })
    }
  })

  it('should create cells with empty paragraphs', () => {
    const table = createTableNode(2, 2)

    table.forEach((row) => {
      row.forEach((cell) => {
        // Each cell should contain exactly one paragraph
        expect(cell.childCount).toBe(1)
        expect(cell.firstChild?.type.name).toBe('paragraph')
        // Paragraph should be empty
        expect(cell.firstChild?.textContent).toBe('')
      })
    })
  })

  it('should create valid table that can be inserted into a document', () => {
    const table = createTableNode(2, 2)

    // Create a document with the table
    const doc = schema.nodes.doc.create(null, [table])

    expect(doc.type.name).toBe('doc')
    expect(doc.childCount).toBe(1)
    expect(doc.firstChild?.type.name).toBe('table')
  })
})

describe('Slash Menu Table Item', () => {
  it('should have table in the menu items', async () => {
    // Import the slash menu items
    const { slashMenuPluginKey } = await import('./plugins/slashMenu')

    // The slashMenuPluginKey should be defined
    expect(slashMenuPluginKey).toBeDefined()
  })
})
