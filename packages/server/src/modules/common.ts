import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ZodError, ZodIssue } from 'zod';

import { CourtDataType } from '../models/Court';
import { ReservationDataType } from '../models/Reservation';
import { User } from '../models/User';
import { ServerError } from './error';
import { APIResponse } from './responseTypes';

export const isProduction = process.env.PRODUCTION?.toLowerCase() === 'true';

export const formatZodError = (
  error: ZodError<unknown>,
): Array<
  ZodIssue & {
    message: string;
  }
> => {
  return error.issues.map((issue) => ({
    ...issue,
    message: issue.path.join('.'),
  }));
};

export const onError = (error: ServerError) => {
  return {
    success: false as const,
    endpoint: error.endpoint,
    errors: [{ message: error.error || error.message }],
    operation: error.operation,
    data: error.data,
  };
};

export const onSuccess = <Data, Endpoint extends string>(
  data: Data,
  endpoint: Endpoint,
  operation?: 'POST' | 'GET' | 'PUT' | 'DELETE',
): APIResponse<Data, Endpoint> => {
  return {
    success: true as const,
    endpoint,
    data: data ?? ({} as Data),
    ...(operation ? { operation } : {}),
  };
};

export const sessionCookie = {
  set: (res: Response, session: string) => {
    if (!session) {
      return;
    }

    res.cookie('session', session, {
      httpOnly: true,
    });
  },
  get: (req: Request): string | undefined => {
    return req.cookies.session || undefined;
  },
  clear: (res: Response) => {
    res.clearCookie('session');
  },
};

export enum ERRORS {
  INVALID_DATA = 'invalid_data',
  INVALID_QUERY = 'invalid_query',
  UNEXPECTED_ERROR = 'unexpected_error',
  INVALID_CREDENTIALS = 'invalid_credentials',
  LOGIN_ERROR = 'login_error',
  INTERNAL_SERVER_ERROR = 'internal_server_error',
  USER_EXISTS = 'user_exists',
  USER_NOT_FOUND = 'user_not_found',
  PASSWORDS_DO_NOT_MATCH = 'passwords_do_not_match',
  INVALID_EMAIL = 'invalid_email',
  INVALID_RESET_KEY = 'invalid_reset_key',
  RESET_KEY_EXPIRED = 'reset_key_expired',
  RESET_KEY_NOT_FOUND = 'reset_key_not_found',
  INVALID_RESET_REQUEST = 'invalid_reset_request',
  INVALID_PASSWORD = 'invalid_password',
  UNAUTHORIZED = 'unauthorized',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  RESERVATION_TIME_CONFLICT = 'reservation_time_conflict',
  DATE_IN_THE_PAST = 'date_in_the_past',
}

export const addMinutesToTime = (time: string, minutes: number) =>
  new Date(
    new Date(`1970/01/01 ${time}`).getTime() + minutes * 60000,
  ).toLocaleTimeString('el-GR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

export const formatDate = (date: Date) =>
  `${date
    .toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })
    .substring(0, 10)}T${date
    .toLocaleTimeString('el', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Athens',
      hour12: false,
    })
    .substring(0, 5)}`;

export const weekDayMap = {
  '1': 'MONDAY',
  '2': 'TUESDAY',
  '3': 'WEDNESDAY',
  '4': 'THURSDAY',
  '5': 'FRIDAY',
  '6': 'SATURDAY',
  '0': 'SUNDAY',
} as const;

const isTimeOverlapping = (
  reservation: { startTime: string; endTime: string; duration: number },
  against: { startTime: string; endTime: string; duration: number },
) => {
  return (
    // if start time is within the reservation time
    (against.startTime < reservation.startTime &&
      reservation.startTime < against.endTime) ||
    // or end time is within the reservation time
    (against.startTime < reservation.endTime &&
      reservation.endTime < against.endTime) ||
    // or if the times are the same
    (against.startTime === reservation.startTime &&
      reservation.duration === against.duration)
  );
};

export const isReservationTimeFree = (
  courtReservations: Array<ReservationDataType>,
  courtReservedTimes: CourtDataType['reservationsInfo']['reservedTimes'],
  datetime: string,
  duration: number,
  reservationId?: string,
): boolean => {
  let reservationCheck = true;

  const startTime = datetime.split('T')[1];
  const endTime = addMinutesToTime(startTime, duration);

  if (courtReservations.length) {
    const reservationsToCheck = courtReservations.filter((r) => {
      const dateCheck = r.datetime.split('T')[0] === datetime.split('T')[0];

      if (reservationId) {
        return r._id.toString() !== reservationId.toString() && dateCheck;
      }

      return dateCheck;
    });

    reservationCheck = !reservationsToCheck.length
      ? true
      : !reservationsToCheck.some((r) => {
          const rstartTime = r.datetime.split('T')[1];

          return isTimeOverlapping(
            {
              duration,
              endTime,
              startTime,
            },
            {
              duration: r.duration,
              endTime: addMinutesToTime(rstartTime, r.duration),
              startTime: rstartTime,
            },
          );
        });
  }

  if (!reservationCheck) {
    return false;
  }

  if (!courtReservedTimes.length) {
    return reservationCheck;
  }

  const weekDay =
    weekDayMap[
      new Date(datetime).getDay().toString() as keyof typeof weekDayMap
    ];

  const reservedCheck = !courtReservedTimes
    .filter((r) => r.days?.includes(weekDay))
    .some((r) => {
      return isTimeOverlapping(
        {
          duration,
          endTime,
          startTime,
        },
        {
          duration: r.duration,
          endTime: addMinutesToTime(r.startTime, r.duration),
          startTime: r.startTime,
        },
      );
    });

  return reservationCheck && reservedCheck;
};

type AuthUserHelpersReturnType = (
  | {
      isLoggedIn: true;
      user: NonNullable<User>;
    }
  | {
      isLoggedIn: false;
      user: undefined;
    }
) & {
  isAdmin: boolean;
  isUser: boolean;
};

export const authUserHelper = (req: Request) => {
  const user = req.user;

  const isLoggedIn = !!user;
  return {
    isLoggedIn,
    isAdmin: isLoggedIn && user?.role === 'ADMIN',
    isUser: isLoggedIn && user?.role === 'USER',
    user: isLoggedIn ? user : undefined,
  } as AuthUserHelpersReturnType;
};

export const zodObjectId = (val: string) => Types.ObjectId.isValid(val);

export const weekDays = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;
