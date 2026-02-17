import * as jwt from "jsonwebtoken";

const signToken = (userId: string) => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined in environment variables.");
  }

  const options: jwt.SignOptions = {
    expiresIn: jwtExpiresIn as jwt.SignOptions["expiresIn"],
  };

  return jwt.sign({ id: userId }, jwtSecret, options);
};
