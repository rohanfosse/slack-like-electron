import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

const apiMock = vi.fn()
vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ api: apiMock }),
}))

import { useAgendaStore } from '@/stores/agenda'

const getGanttDataMock = vi.fn()
const getRemindersMock = vi.fn()
const createReminderMock = vi.fn()
const updateReminderMock = vi.fn()
const deleteReminderMock = vi.fn()

;(window as unknown as { api: Record<string, unknown> }).api = {
  getGanttData: getGanttDataMock,
  getReminders: getRemindersMock,
  createReminder: createReminderMock,
  updateReminder: updateReminderMock,
  deleteReminder: deleteReminderMock,
}

describe('agenda store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMock.mockReset()
  })

  it('has empty initial state', () => {
    const s = useAgendaStore()
    expect(s.reminders).toEqual([])
    expect(s.ganttRows).toEqual([])
    expect(s.events).toEqual([])
    expect(s.loading).toBe(false)
  })

  it('events computed aggregates deadlines, start_dates, and reminders sorted by date', () => {
    const s = useAgendaStore()
    s.ganttRows = [
      { id: 1, title: 'TP1', deadline: '2026-04-10T00:00:00Z', start_date: '2026-04-01T00:00:00Z', category: 'dev' },
      { id: 2, title: 'TP2', deadline: '2026-04-05T00:00:00Z', start_date: null },
    ]
    s.reminders = [
      { id: 10, title: 'Rappel', date: '2026-04-03T00:00:00Z', bloc: 'info', created_at: '' },
    ]

    expect(s.events.length).toBe(4) // 2 deadlines + 1 start + 1 reminder
    // Should be sorted by start date
    expect(s.events[0].start).toBe('2026-04-01')
    expect(s.events[0].eventType).toBe('start_date')
    expect(s.events[1].start).toBe('2026-04-03')
    expect(s.events[1].eventType).toBe('reminder')
    expect(s.events[2].start).toBe('2026-04-05')
    expect(s.events[3].start).toBe('2026-04-10')
  })

  it('flags deadline/start_date/date-only reminders as allDay for vue-cal top bar', () => {
    const s = useAgendaStore()
    s.ganttRows = [
      { id: 1, title: 'TP1', deadline: '2026-04-10T00:00:00Z', start_date: '2026-04-01T00:00:00Z' },
    ]
    s.reminders = [
      { id: 10, title: 'Date pure',  date: '2026-04-03',                  created_at: '' },
      { id: 11, title: 'Midnight Z', date: '2026-04-04T00:00:00Z',        created_at: '' },
      { id: 12, title: 'Timed',      date: '2026-04-05T14:30:00Z',        created_at: '' },
    ]
    const byId = (id: string) => s.events.find(e => e.id === id)
    expect(byId('deadline-1')?.allDay).toBe(true)
    expect(byId('start-1')?.allDay).toBe(true)
    expect(byId('reminder-10')?.allDay).toBe(true)
    expect(byId('reminder-11')?.allDay).toBe(true) // T00:00:00Z est traite comme date pure
    expect(byId('reminder-12')?.allDay).toBe(false) // horodatage explicite
  })

  it('flags Outlook all-day multi-day events and adjusts end inclusivity', () => {
    const s = useAgendaStore()
    // Stage : 6 avril 00:00 UTC -> 18 avril 00:00 UTC (exclusif) = du 6 au 17 inclus
    s.outlookEvents = [{
      id: 'stage-1',
      subject: 'Stage',
      start: '2026-04-06T00:00:00Z',
      end: '2026-04-18T00:00:00Z',
      isAllDay: true,
      location: null, bodyPreview: null, teamsJoinUrl: null, organizer: null,
      showAs: 'free', categories: [],
    }] as any
    s.outlookEnabled = true

    const ev = s.events.find(e => e.id === 'outlook-stage-1')
    expect(ev?.allDay).toBe(true)
    expect(ev?.start).toBe('2026-04-06')
    expect(ev?.end).toBe('2026-04-17') // 18 exclusif -> 17 inclusif
  })

  it('fetchEvents calls api for gantt and reminders', async () => {
    const ganttData = [{ id: 1, title: 'TP1', deadline: '2026-04-10T00:00:00Z' }]
    const remindersData = [{ id: 10, title: 'R1', date: '2026-04-01T00:00:00Z' }]
    let callCount = 0
    apiMock.mockImplementation(async (fn: () => Promise<unknown>) => {
      callCount++
      if (callCount === 1) return ganttData
      return remindersData
    })

    const s = useAgendaStore()
    await s.fetchEvents(7)
    expect(s.ganttRows).toEqual(ganttData)
    expect(s.reminders).toEqual(remindersData)
    expect(s.loading).toBe(false)
  })

  it('createReminder adds reminder to state sorted by date', async () => {
    const s = useAgendaStore()
    s.reminders = [
      { id: 1, title: 'Early', date: '2026-03-01T00:00:00Z', created_at: '' },
    ]
    const newReminder = { id: 2, title: 'Later', date: '2026-04-01T00:00:00Z', created_at: '' }
    apiMock.mockResolvedValue(newReminder)

    const ok = await s.createReminder({ title: 'Later', date: '2026-04-01T00:00:00Z' } as any)
    expect(ok).toBe(true)
    expect(s.reminders.length).toBe(2)
    expect(s.reminders[1].id).toBe(2)
  })

  it('createReminder returns false when api fails', async () => {
    apiMock.mockResolvedValue(null)
    const s = useAgendaStore()
    const ok = await s.createReminder({ title: 'Test', date: '2026-04-01' } as any)
    expect(ok).toBe(false)
  })

  it('updateReminder replaces the reminder in state', async () => {
    const s = useAgendaStore()
    s.reminders = [
      { id: 1, title: 'Old', date: '2026-03-01T00:00:00Z', created_at: '' },
    ]
    const updated = { id: 1, title: 'New', date: '2026-03-01T00:00:00Z', created_at: '' }
    apiMock.mockResolvedValue(updated)

    const ok = await s.updateReminder(1, { title: 'New' })
    expect(ok).toBe(true)
    expect(s.reminders[0].title).toBe('New')
  })

  it('deleteReminder removes the reminder from state', async () => {
    const s = useAgendaStore()
    s.reminders = [
      { id: 1, title: 'R1', date: '2026-03-01', created_at: '' },
      { id: 2, title: 'R2', date: '2026-03-02', created_at: '' },
    ]
    apiMock.mockResolvedValue({})

    const ok = await s.deleteReminder(1)
    expect(ok).toBe(true)
    expect(s.reminders.length).toBe(1)
    expect(s.reminders[0].id).toBe(2)
  })

  it('deleteReminder returns false when api returns null', async () => {
    const s = useAgendaStore()
    s.reminders = [{ id: 1, title: 'R1', date: '2026-03-01', created_at: '' }]
    apiMock.mockResolvedValue(null)

    const ok = await s.deleteReminder(1)
    expect(ok).toBe(false)
    expect(s.reminders.length).toBe(1)
  })
})
