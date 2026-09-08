import type { ErrorRequestHandler } from "express";

type PublicError = Error & {
  statusCode?: number;
  publicMessage?: string;
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);

  const publicError = error as PublicError;
  const statusCode = publicError.statusCode ?? 500;

  res.status(statusCode).json({
    error: publicError.publicMessage ?? "Internal server error",
  });
};
