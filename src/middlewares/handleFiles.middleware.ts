import { Request, Response, NextFunction } from "express";

export const handleFilesMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.files && Array.isArray(req.files)) {
    req.files.forEach((file) => {
      file.filename = file.filename.split(" ").join("");
      file.originalname = file.originalname
        .split(" ")
        .join("")
        .replace(/[^a-zA-Z0-9\-_.~]/g, "");
    });
  }
  next();
};
