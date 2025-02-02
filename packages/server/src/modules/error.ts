/* eslint-disable @typescript-eslint/no-unused-vars */
import { ErrorRequestHandler } from 'express';
import signale from 'signale';

import { ERRORS, onError } from './common';

export class ServerError extends Error {
  public status: number;
  public error: ERRORS;
  public endpoint: string;
  public operation: 'POST' | 'GET' | 'PUT' | 'DELETE' | string;
  public data: Record<string, unknown>;

  constructor({
    data,
    endpoint,
    error,
    message,
    operation,
    status,
  }: {
    error: ERRORS;
    status: number;
    operation: 'POST' | 'GET' | 'PUT' | 'DELETE' | string;
    message?: string;
    endpoint?: string;
    data?: Record<string, unknown>;
  }) {
    super(message || error);
    this.status = status;
    this.error = error;
    this.data = data || {};
    this.endpoint = endpoint || '';
    this.operation = operation;
  }
}

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req,
  res,
  _next,
) => {
  if (err instanceof ServerError) {
    if (err.status >= 500) {
      signale.error(err);
    }

    res.status(err.status).json(onError(err));
    return;
  }

  const error = new ServerError({
    error: ERRORS.INTERNAL_SERVER_ERROR,
    operation: req.method as 'GET',
    status: 500,
  });

  if (err instanceof Error) {
    signale.error(err);
    res.status(500).json(onError(error));
    return;
  }

  signale.error(err);
  res.status(500).json(onError(error));
};
