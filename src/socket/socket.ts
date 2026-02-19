import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import * as jwt from "jsonwebtoken";
import prisma from "@models/index.model";
import getUserPermissions from "src/modules/users/utilites/getUserPermissions.util";

let io: Server;

interface AuthenticatedSocket extends Socket {
  userId: string;
  user: {
    id: string;
    email: string;
    name: string;
    surname: string;
    departmentId: string;
    roleId: string;
    permissions: string[];
  };
}

export const initializeSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error("error.auth.no_token"));
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return next(new Error("error.config.jwt_secret_missing"));
      }

      const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
          surname: true,
          departmentId: true,
          roleId: true,
          status: true,
        },
      });

      if (!user || user.status !== "ACTIVE") {
        return next(new Error("error.auth.user_not_found"));
      }

      const permissions = await getUserPermissions(user.id);

      (socket as AuthenticatedSocket).userId = user.id;
      (socket as AuthenticatedSocket).user = {
        ...user,
        permissions,
      };

      next();
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return next(new Error("error.auth.token_expired"));
      }
      return next(new Error("error.auth.invalid_token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const { userId, user } = authSocket;

    console.log(`✅ User connected: ${user.email} (${userId})`);

    socket.join(`user:${userId}`);
    socket.join(`department:${user.departmentId}`);
    socket.join(`role:${user.roleId}`);
    user.permissions.forEach((permission) => {
      socket.join(`permission:${permission}`);
    });

    socket.on("join:room", (room: string) => {
      socket.join(room);
      console.log(`User ${userId} joined room: ${room}`);
    });
    socket.on("leave:room", (room: string) => {
      socket.leave(room);
      console.log(`User ${userId} left room: ${room}`);
    });
    socket.on("disconnect", (reason) => {
      console.log(`❌ User disconnected: ${user.email} - ${reason}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};
