import { onError } from './common';

export type ErrorResponse = ReturnType<typeof onError>;

// response types for all api routes
export type APIResponse<Data, Endpoint> = (
  | {
      success: true;
      errors?: never;
      data: Data;
    }
  | {
      success: false;
      errors: ErrorResponse['errors'];
      data?: Record<string, unknown>;
    }
) & {
  endpoint: Endpoint;
  operation?: 'POST' | 'GET' | 'PUT' | 'DELETE';
};
