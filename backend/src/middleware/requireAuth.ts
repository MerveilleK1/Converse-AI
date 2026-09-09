import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";

type JwtPayload = {
  sub?: string;
  email?: string;
};

export const requireAuth: RequestHandler = (req, res, next) => {
  const authorization = req.header("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();
  const jwtSecret = process.env.JWT_SECRET;

  if (!token || !jwtSecret) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as JwtPayload;

    if (!payload.sub) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    req.auth = {
      userId: payload.sub,
      email: payload.email,
    };

    next();
  } catch (_error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
