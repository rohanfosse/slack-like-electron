/**
 * socketEvents : registre centralise des callbacks Socket.io du preload.
 *
 * Chaque "channel" expose :
 *   - la liste des callbacks enregistres (consommee par le binder)
 *   - un helper `add()` qui retourne une fonction d'unsubscribe
 *
 * `bindSocketEvents(socket)` attache tous les listeners d'un coup quand
 * une nouvelle instance socket.io est creee (typiquement apres login).
 */
import type { Socket } from 'socket.io-client'
import type {
  MsgNewPayload, PresenceEntry, TypingPayload,
  LiveActivityPushedPayload, LiveActivityClosedPayload, LiveResultsUpdatePayload,
  LiveSessionStartedPayload, LiveSessionEndedPayload, LiveInvitePayload, LiveScoresUpdatePayload,
  LiveCodeUpdatePayload, LiveBoardUpdatePayload, LiveConfusionUpdatePayload, LiveSelfPacedPayload,
  BookingNewPayload, BookingCancelledPayload,
  RexActivityPushedPayload, RexActivityClosedPayload, RexResultsUpdatePayload,
  RexSessionStartedPayload, RexSessionEndedPayload, RexInvitePayload,
  GradeNewPayload, SignatureUpdatePayload, DocumentNewPayload, AssignmentNewPayload,
} from './socketTypes'

function createChannel<T>() {
  const callbacks: Array<(data: T) => void> = []
  return {
    callbacks,
    add(cb: (data: T) => void): () => void {
      callbacks.push(cb)
      return () => {
        const i = callbacks.indexOf(cb)
        if (i >= 0) callbacks.splice(i, 1)
      }
    },
    emit(data: T): void {
      callbacks.forEach((cb) => cb(data))
    },
  }
}

// ── Messages / presence / typing ───────────────────────────────────────────
export const msgNew = createChannel<MsgNewPayload>()
export const presenceUpdate = createChannel<PresenceEntry[]>()
export const typing = createChannel<TypingPayload>()

// ── Socket state (connected / disconnected) ────────────────────────────────
export const socketState = createChannel<boolean>()

// ── Live ───────────────────────────────────────────────────────────────────
export const liveActivityPushed = createChannel<LiveActivityPushedPayload>()
export const liveActivityClosed = createChannel<LiveActivityClosedPayload>()
export const liveResultsUpdate  = createChannel<LiveResultsUpdatePayload>()
export const liveSessionStarted = createChannel<LiveSessionStartedPayload>()
export const liveSessionEnded   = createChannel<LiveSessionEndedPayload>()
export const liveInvite         = createChannel<LiveInvitePayload>()
export const liveScoresUpdate   = createChannel<LiveScoresUpdatePayload>()
export const liveCodeUpdate     = createChannel<LiveCodeUpdatePayload>()
export const liveBoardUpdate    = createChannel<LiveBoardUpdatePayload>()
export const liveConfusion      = createChannel<LiveConfusionUpdatePayload>()
export const liveSelfPaced      = createChannel<LiveSelfPacedPayload>()

// ── Booking ────────────────────────────────────────────────────────────────
export const bookingNew       = createChannel<BookingNewPayload>()
export const bookingCancelled = createChannel<BookingCancelledPayload>()

// ── REX ────────────────────────────────────────────────────────────────────
export const rexActivityPushed = createChannel<RexActivityPushedPayload>()
export const rexActivityClosed = createChannel<RexActivityClosedPayload>()
export const rexResultsUpdate  = createChannel<RexResultsUpdatePayload>()
export const rexSessionStarted = createChannel<RexSessionStartedPayload>()
export const rexSessionEnded   = createChannel<RexSessionEndedPayload>()
export const rexInvite         = createChannel<RexInvitePayload>()

// ── Notifications ──────────────────────────────────────────────────────────
export const gradeNew        = createChannel<GradeNewPayload>()
export const signatureUpdate = createChannel<SignatureUpdatePayload>()
export const documentNew     = createChannel<DocumentNewPayload>()
export const assignmentNew   = createChannel<AssignmentNewPayload>()

/**
 * Attache tous les listeners au socket. A rappeler a chaque reconnexion /
 * creation d'un nouveau Socket (le caller gere le disconnect de l'ancien).
 */
export function bindSocketEvents(socket: Socket): void {
  socket.on('msg:new',               (data: MsgNewPayload) => msgNew.emit(data))
  socket.on('presence:update',       (data: PresenceEntry[]) => presenceUpdate.emit(data))
  socket.on('typing',                (data: TypingPayload) => typing.emit(data))

  socket.on('live:activity-pushed',  (data: LiveActivityPushedPayload) => liveActivityPushed.emit(data))
  socket.on('live:activity-closed',  (data: LiveActivityClosedPayload) => liveActivityClosed.emit(data))
  socket.on('live:results-update',   (data: LiveResultsUpdatePayload) => liveResultsUpdate.emit(data))
  socket.on('live:session-started',  (data: LiveSessionStartedPayload) => liveSessionStarted.emit(data))
  socket.on('live:session-ended',    (data: LiveSessionEndedPayload) => liveSessionEnded.emit(data))
  socket.on('live:invite',           (data: LiveInvitePayload) => liveInvite.emit(data))
  socket.on('live:scores-update',    (data: LiveScoresUpdatePayload) => liveScoresUpdate.emit(data))
  socket.on('live:code-update',      (data: LiveCodeUpdatePayload) => liveCodeUpdate.emit(data))
  socket.on('live:board-update',     (data: LiveBoardUpdatePayload) => liveBoardUpdate.emit(data))
  socket.on('live:confusion-update', (data: LiveConfusionUpdatePayload) => liveConfusion.emit(data))
  socket.on('live:self-paced-update', (data: LiveSelfPacedPayload) => liveSelfPaced.emit(data))

  socket.on('booking:new',           (data: BookingNewPayload) => bookingNew.emit(data))
  socket.on('booking:cancelled',     (data: BookingCancelledPayload) => bookingCancelled.emit(data))

  socket.on('rex:activity-pushed',   (data: RexActivityPushedPayload) => rexActivityPushed.emit(data))
  socket.on('rex:activity-closed',   (data: RexActivityClosedPayload) => rexActivityClosed.emit(data))
  socket.on('rex:results-update',    (data: RexResultsUpdatePayload) => rexResultsUpdate.emit(data))
  socket.on('rex:session-started',   (data: RexSessionStartedPayload) => rexSessionStarted.emit(data))
  socket.on('rex:session-ended',     (data: RexSessionEndedPayload) => rexSessionEnded.emit(data))
  socket.on('rex:invite',            (data: RexInvitePayload) => rexInvite.emit(data))

  socket.on('grade:new',             (data: GradeNewPayload) => gradeNew.emit(data))
  socket.on('signature:update',      (data: SignatureUpdatePayload) => signatureUpdate.emit(data))
  socket.on('document:new',          (data: DocumentNewPayload) => documentNew.emit(data))
  socket.on('assignment:new',        (data: AssignmentNewPayload) => assignmentNew.emit(data))

  socket.on('connect', () => {
    if (process.env.NODE_ENV === 'development') console.log('[Socket.io] Connecte')
    socketState.emit(true)
  })
  socket.on('disconnect', () => socketState.emit(false))
  socket.on('connect_error', (err: Error) => {
    console.warn('[Socket.io] Erreur connexion:', err.message)
    socketState.emit(false)
  })
}
