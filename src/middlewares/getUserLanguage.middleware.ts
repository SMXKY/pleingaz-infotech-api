import { Request, Response, NextFunction } from "express";
import prisma from "@models/index.model";
import { User } from "src/generated/prisma";
import { Language } from "@appTypes/preferences.type";

const getUserLanguage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user: User | undefined = res.locals.user;

  try {
    if (user) {
      const preference = await prisma.userPreference.findUnique({
        where: { userId: user.id },
      });

      res.locals.lang = (preference?.language as Language) || Language.FR;

      return next();
    }

    const headerLang = req.headers["x-lang"] as string;
    const isValidLang = Object.values(Language).includes(
      headerLang as Language
    );

    res.locals.lang = isValidLang ? (headerLang as Language) : Language.FR;

    next();
  } catch (err) {
    res.locals.lang = Language.FR;
    next();
  }
};

export default getUserLanguage;
