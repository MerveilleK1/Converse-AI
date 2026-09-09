import type { ErrorRequestHandler } from "express";

type PublicError = Error & {
  statusCode?: number;
  publicMessage?: string;
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const publicError = error as PublicError;
  const statusCode = publicError.statusCode ?? 500;

  if (publicError.publicMessage) {
    console.error(publicError.publicMessage);
  } else {
    console.error(error);
  }

  res.status(statusCode).json({
    error: publicError.publicMessage ?? "Internal server error",
  });
};
