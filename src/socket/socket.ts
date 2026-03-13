import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "@models/index.model";
import {
  JWT_SECRET,
  SOCKET_IO_CORS_ORIGIN,
  SOCKET_IO_PATH,
} from "@utils/enviromentVariablesCheck.util";
import { StatusCodes } from "http-status-codes";
import { AppError } from "@utils/AppError.util";
import { Status } from "src/generated/prisma";

interface UserData {
  id: string;
  email: string;
  roleId: string | null;
  departmentId: string | null;
}

declare module "socket.io" {
  interface SocketData {
    user: UserData;
  }
}

let io: Server | null = null;

async function authenticateSocket(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "") ||
      socket.handshake.query?.token;

    if (!token || typeof token !== "string") {
      return next(
        new AppError("error.auth.no_token", StatusCodes.UNAUTHORIZED)
      );
    }

    let decodedToken: jwt.JwtPayload;
    try {
      decodedToken = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return next(
          new AppError("error.auth.token_expired", StatusCodes.UNAUTHORIZED)
        );
      }
      return next(
        new AppError("error.auth.invalid_token", StatusCodes.UNAUTHORIZED)
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: decodedToken.userId },
      select: {
        id: true,
        email: true,
        status: true,
        roleId: true,
        departmentId: true,
        deactivatedUntil: true,
        passwordChangedAt: true,
      },
    });

    if (!user) {
      return next(
        new AppError("error.auth.user_not_found", StatusCodes.UNAUTHORIZED)
      );
    }

    if (user.status === Status.TERMINATED) {
      return next(
        new AppError("error.auth.account_not_active", StatusCodes.FORBIDDEN)
      );
    }

    if (user.deactivatedUntil && user.deactivatedUntil.getTime() > Date.now()) {
      throw new AppError(
        "error.auth.account_temporarily_not_active",
        StatusCodes.FORBIDDEN
      );
    }

    if (!decodedToken.iat) {
      return next(
        new AppError("error.auth.invalid_token", StatusCodes.UNAUTHORIZED)
      );
    }

    if (
      user.passwordChangedAt &&
      Math.floor(user.passwordChangedAt.getTime() / 1000) > decodedToken.iat
    ) {
      return next(
        new AppError("error.auth.password_changed", StatusCodes.UNAUTHORIZED)
      );
    }

    socket.data.user = {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      departmentId: user.departmentId,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(
        new AppError("error.auth.token_expired", StatusCodes.UNAUTHORIZED)
      );
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(
        new AppError("error.auth.invalid_token", StatusCodes.UNAUTHORIZED)
      );
    }
    console.error("[Socket.IO] Auth error:", error);
    return next(new Error("error.auth.socket_auth_error"));
  }
}

//TODO: Add Rooms as the app expands for say a permission or a custom group of users
function joinUserRooms(socket: Socket): void {
  const { user } = socket.data;

  socket.join(`user:${user.id}`);

  if (user.roleId) {
    socket.join(`role:${user.roleId}`);
  }

  if (user.departmentId) {
    socket.join(`dept:${user.departmentId}`);
  }

  socket.join("global");

  console.log(
    `[Socket.IO] User ${user.id} joined rooms:`,
    Array.from(socket.rooms)
  );

  console.log(`User: ${user.email} connected to sever via socket 🛜`);
}

function handleDisconnect(socket: Socket, reason: string): void {
  const userId = socket.data.user?.id;
  console.log(`[Socket.IO] User ${userId} disconnected. Reason: ${reason}`);
}

export function initializeSocketIO(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    path: SOCKET_IO_PATH || "/socket.io",
    cors: {
      origin: SOCKET_IO_CORS_ORIGIN?.split(",") || [
        "http://localhost:3000",
        "http://localhost:5173",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB
  });

  io.use(authenticateSocket);

  io.on("connection", async (socket: Socket) => {
    const { user } = socket.data;
    console.log(`[Socket.IO] User ${user.id} (${user.email}) connected`);

    joinUserRooms(socket);

    socket.emit("notification:count", { unread: 0 });

    socket.on("notification:sync", async ({ since }: { since: string }) => {
      console.log(`[Socket.IO] User ${user.id} requesting sync since ${since}`);
    });

    socket.on("notification:ack", async ({ id }: { id: string }) => {
      console.log(
        `[Socket.IO] User ${user.id} acknowledged notification ${id}`
      );
    });

    socket.on("notification:read", async ({ id }: { id: string }) => {
      console.log(`[Socket.IO] User ${user.id} read notification ${id}`);
    });

    socket.on("notification:read:all", async () => {
      console.log(`[Socket.IO] User ${user.id} marked all as read`);
    });

    socket.on("disconnect", (reason) => handleDisconnect(socket, reason));

    socket.on("error", (error) => {
      console.error(`[Socket.IO] Error for user ${user.id}:`, error);
    });
  });

  console.log("[Socket.IO] Server initialized");
  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error(
      "Socket.IO not initialized. Call initializeSocketIO first."
    );
  }
  return io;
}

export async function isUserOnline(userId: string): Promise<boolean> {
  if (!io) return false;
  const sockets = await io.in(`user:${userId}`).fetchSockets();
  return sockets.length > 0;
}

export async function getUserSockets(userId: string): Promise<string[]> {
  if (!io) return [];
  const sockets = await io.in(`user:${userId}`).fetchSockets();
  return sockets.map((s) => s.id);
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  if (!io) {
    console.warn("[Socket.IO] Cannot emit - server not initialized");
    return;
  }
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToRole(roleId: string, event: string, data: unknown): void {
  if (!io) {
    console.warn("[Socket.IO] Cannot emit - server not initialized");
    return;
  }
  io.to(`role:${roleId}`).emit(event, data);
}

export function emitToDepartment(
  departmentId: string,
  event: string,
  data: unknown
): void {
  if (!io) {
    console.warn("[Socket.IO] Cannot emit - server not initialized");
    return;
  }
  io.to(`dept:${departmentId}`).emit(event, data);
}

export function emitToAll(event: string, data: unknown): void {
  if (!io) {
    console.warn("[Socket.IO] Cannot emit - server not initialized");
    return;
  }
  io.to("global").emit(event, data);
}

export { io };
