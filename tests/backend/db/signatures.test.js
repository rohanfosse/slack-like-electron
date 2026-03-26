const { setupTestDb, teardownTestDb, getTestDb } = require('../helpers/setup')

let queries

beforeAll(() => {
  setupTestDb()
  // Seed a DM message for signature tests
  const db = getTestDb()
  db.prepare(`
    INSERT INTO messages (id, channel_id, dm_student_id, author_name, author_type, content, created_at)
    VALUES (100, NULL, 1, 'Jean Dupont', 'student', '[📎 convention.pdf](/uploads/test.pdf)', datetime('now'))
  `).run()
  queries = require('../../../server/db/models/signatures')
})
afterAll(() => teardownTestDb())

describe('signatures model', () => {
  let sigId

  it('createSignatureRequest inserts a pending request', () => {
    const result = queries.createSignatureRequest(100, 1, '/uploads/test.pdf', 'convention.pdf')
    expect(result.changes).toBe(1)
    sigId = Number(result.lastInsertRowid)
    expect(sigId).toBeGreaterThan(0)
  })

  it('getSignatureRequests returns all requests', () => {
    const list = queries.getSignatureRequests({})
    expect(list.length).toBe(1)
    expect(list[0].file_name).toBe('convention.pdf')
    expect(list[0].status).toBe('pending')
  })

  it('getSignatureRequests filters by status', () => {
    const pending = queries.getSignatureRequests({ status: 'pending' })
    expect(pending.length).toBe(1)
    const signed = queries.getSignatureRequests({ status: 'signed' })
    expect(signed.length).toBe(0)
  })

  it('getSignatureRequests filters by studentId', () => {
    const mine = queries.getSignatureRequests({ studentId: 1 })
    expect(mine.length).toBe(1)
    const other = queries.getSignatureRequests({ studentId: 999 })
    expect(other.length).toBe(0)
  })

  it('getSignatureById returns the correct request', () => {
    const req = queries.getSignatureById(sigId)
    expect(req).toBeTruthy()
    expect(req.file_name).toBe('convention.pdf')
    expect(req.dm_student_id).toBe(1)
  })

  it('getSignatureByMessageId returns the correct request', () => {
    const req = queries.getSignatureByMessageId(100)
    expect(req).toBeTruthy()
    expect(req.id).toBe(sigId)
  })

  it('getPendingCount returns correct count', () => {
    expect(queries.getPendingCount()).toBe(1)
  })

  it('signDocument updates status to signed', () => {
    const result = queries.signDocument(sigId, 'Prof Test', '/uploads/signed_test.pdf')
    expect(result.changes).toBe(1)
    const req = queries.getSignatureById(sigId)
    expect(req.status).toBe('signed')
    expect(req.signer_name).toBe('Prof Test')
    expect(req.signed_file_url).toBe('/uploads/signed_test.pdf')
    expect(req.signed_at).toBeTruthy()
  })

  it('getPendingCount returns 0 after signing', () => {
    expect(queries.getPendingCount()).toBe(0)
  })

  it('rejectDocument updates status to rejected', () => {
    // Create another request to test rejection
    const r2 = queries.createSignatureRequest(100, 1, '/uploads/test2.pdf', 'attestation.pdf')
    const id2 = Number(r2.lastInsertRowid)
    queries.rejectDocument(id2, 'Document incomplet')
    const req = queries.getSignatureById(id2)
    expect(req.status).toBe('rejected')
    expect(req.rejection_reason).toBe('Document incomplet')
  })

  it('getSignatureRequests returns requests sorted by date DESC', () => {
    const list = queries.getSignatureRequests({})
    expect(list.length).toBe(2)
    // Most recent (higher id) first
    expect(list[0].id).toBeGreaterThan(list[1].id)
  })
})
