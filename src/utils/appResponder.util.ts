import { Response } from "express";

export const appResponder = (
  statusCode: number,
  data: object,
  res: Response
) => {
  res.status(statusCode).json({ ok: true, status: "success", data });
};
