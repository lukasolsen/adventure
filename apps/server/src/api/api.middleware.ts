import type { Request, Response, NextFunction } from "express";

export const apiMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey === process.env.SERVER_API_KEY) {
    next();
  } else {
    res.status(403).json({ message: "Unauthorized API Access" });
  }
};
