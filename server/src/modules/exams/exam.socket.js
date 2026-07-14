import { Server } from "socket.io";
import { ObjectId } from "mongodb";
import { env } from "../../config/env.js";
import { getExamDb } from "../../db/mongo.js";
import { verifyAccessToken } from "../auth/token.service.js";

function attempts() {
  return getExamDb().collection("attempts");
}

function events() {
  return getExamDb().collection("proctor_events");
}

export function registerExamSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== "string") return next(new Error("UNAUTHORIZED"));

    try {
      socket.user = verifyAccessToken(token);
      return next();
    } catch {
      return next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("attempt:join", async ({ attemptId }, ack) => {
      try {
        if (!ObjectId.isValid(attemptId)) throw new Error("INVALID_ATTEMPT");
        const attempt = await attempts().findOne({
          _id: new ObjectId(attemptId),
          userId: socket.user.sub,
        });
        if (!attempt) throw new Error("ATTEMPT_NOT_FOUND");
        socket.join(`attempt:${attemptId}`);
        await attempts().updateOne(
          { _id: attempt._id },
          { $set: { socketConnectedAt: new Date(), lastSeenAt: new Date() } },
        );
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, message: err instanceof Error ? err.message : "JOIN_FAILED" });
      }
    });

    socket.on("attempt:heartbeat", async ({ attemptId }) => {
      if (!ObjectId.isValid(attemptId)) return;
      await attempts().updateOne(
        { _id: new ObjectId(attemptId), userId: socket.user.sub },
        { $set: { lastSeenAt: new Date() } },
      );
    });

    socket.on("proctor:event", async ({ attemptId, type, occurredAt, details }, ack) => {
      try {
        if (!ObjectId.isValid(attemptId)) throw new Error("INVALID_ATTEMPT");
        const attempt = await attempts().findOne({
          _id: new ObjectId(attemptId),
          userId: socket.user.sub,
        });
        if (!attempt) throw new Error("ATTEMPT_NOT_FOUND");

        const event = {
          attemptId: attempt._id,
          examId: attempt.examId,
          userId: socket.user.sub,
          type,
          occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
          details: details ?? {},
          createdAt: new Date(),
          source: "socket",
        };

        await events().insertOne(event);
        io.to(`attempt:${attemptId}`).emit("proctor:event:stored", {
          type: event.type,
          occurredAt: event.occurredAt,
        });
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, message: err instanceof Error ? err.message : "EVENT_FAILED" });
      }
    });
  });

  return io;
}
