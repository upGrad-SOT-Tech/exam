import { io, type Socket } from "socket.io-client"
import { getAccessToken } from "@/lib/auth"
import type { ProctorEvent } from "@/lib/proctoring/types"

const API_BASE = import.meta.env.VITE_API_BASE_URL || window.location.origin

export function createAttemptSocket(attemptId: string): Socket {
  const socket = io(API_BASE, {
    transports: ["websocket"],
    auth: { token: getAccessToken() },
  })

  socket.on("connect", () => {
    socket.emit("attempt:join", { attemptId })
  })

  return socket
}

export function emitProctorEvent(socket: Socket | null, attemptId: string, event: ProctorEvent) {
  if (!socket?.connected) return
  socket.emit("proctor:event", {
    attemptId,
    type: event.type,
    occurredAt: event.occurredAt,
    details: event.details ?? {},
  })
}
