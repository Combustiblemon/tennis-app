import { Request, Response } from 'express';
import signale from 'signale';
import { z } from 'zod';

import Court, { CourtType } from '../models/Court';
import ReservationModel, {
  ReservationValidator,
  ReservationValidatorPartial,
} from '../models/Reservation';
import {
  authUserHelper,
  ERRORS,
  formatDate,
  isReservationTimeFree,
  onSuccess,
} from '../modules/common';
import { ServerError } from '../modules/error';
import { sendMessageToTopic, Topics } from '../modules/notifications';

const getOne = async (req: Request, res: Response) => {
  const { isAdmin, user } = authUserHelper(req);

  if (!user) {
    return;
  }

  const id =
    z.string().safeParse(req.query.id).data ||
    z.array(z.string()).safeParse(req.query.id).data;

  if (!!req.query.id && !id) {
    throw new ServerError({
      error: ERRORS.INVALID_QUERY,
      operation: req.method as 'GET',
      status: 400,
      endpoint: 'reservations',
      data: {
        query: 'id',
      },
    });
  }

  const ids = Array.isArray(id) ? id : id?.split(',');

  if (!ids || !ids.length) {
    return res.status(200).json(onSuccess([], 'reservations/id', 'GET'));
  }

  const reservations = await ReservationModel.find({
    id: { $in: ids },
  });

  if (reservations.length !== ids.length) {
    throw new ServerError({
      error: ERRORS.RESOURCE_NOT_FOUND,
      operation: req.method as 'GET',
      status: 404,
      endpoint: 'reservations',
      data: {
        resource: 'reservations',
      },
    });
  }

  if (
    !isAdmin &&
    reservations.some(
      (reservation) =>
        reservation.owner?.toString() !== user._id.toString() &&
        !reservation.people.includes(user._id.toString() || ''),
    )
  ) {
    throw new ServerError({
      error: ERRORS.UNAUTHORIZED,
      operation: req.method as 'GET',
      status: 401,
      endpoint: 'reservations',
    });
  }

  res.status(200).json(onSuccess(reservations, 'reservations/id', 'GET'));
};

const updateOne = async (req: Request, res: Response) => {
  const { isAdmin, user } = authUserHelper(req);

  if (!user) {
    return;
  }

  const id =
    z.string().safeParse(req.params.id).data ||
    z.array(z.string()).safeParse(req.params.id).data;

  if (!!req.params.id && !id) {
    throw new ServerError({
      error: ERRORS.INVALID_QUERY,
      operation: req.method as 'GET',
      status: 400,
      endpoint: 'reservations',
      data: {
        query: 'id',
      },
    });
  }

  let data: z.infer<typeof ReservationValidatorPartial>;

  try {
    data = ReservationValidatorPartial.parse(req.body);
  } catch (error) {
    throw new ServerError({
      error: ERRORS.INVALID_DATA,
      operation: req.method as 'PUT',
      status: 400,
      endpoint: 'reservations',
      data: {
        body: req.body,
        error,
      },
    });
  }

  const reservation = await ReservationModel.findById(id);
  const court = await Court.findById(reservation?.court);

  if (!reservation) {
    throw new ServerError({
      error: ERRORS.RESOURCE_NOT_FOUND,
      operation: req.method as 'GET',
      status: 404,
      endpoint: 'reservations',
      data: {
        resource: 'reservations',
        _id: id,
      },
    });
  }

  if (!court) {
    throw new ServerError({
      error: ERRORS.RESOURCE_NOT_FOUND,
      operation: req.method as 'GET',
      status: 404,
      endpoint: 'reservations',
      data: {
        resource: 'court',
        _id: reservation?.court,
      },
    });
  }

  if (reservation.owner !== user.id && !isAdmin) {
    throw new ServerError({
      error: ERRORS.UNAUTHORIZED,
      operation: req.method as 'GET',
      status: 401,
      endpoint: 'reservations',
    });
  }

  // check if the new reservation conflicts with an existing one
  if (data.datetime || data.duration) {
    const courtReservations = await ReservationModel.find({
      datetime: {
        $regex: `^${(data.datetime || reservation.datetime).split('T')[0]}`,
      },
      court: reservation.court,
    });

    if (
      !isReservationTimeFree(
        courtReservations,
        court.reservationsInfo.reservedTimes,
        data.datetime || reservation.datetime,
        data.duration || reservation.duration,
        reservation._id.toString(),
      )
    ) {
      throw new ServerError({
        error: ERRORS.RESERVATION_TIME_CONFLICT,
        status: 400,
        operation: req.method,
        endpoint: 'reservations',
      });
    }
  }

  reservation.set(data);

  try {
    sendMessageToTopic(Topics.ADMIN, {
      title: 'Αλλαγή κράτησης',
      body: `${reservation.datetime.split('T')[0]} - ${reservation.datetime.split('T')[1]}\nΓήπεδο: ${court.name}\nΌνομα: ${user.firstname || ''} ${user.lastname || ''}`,
      type: 'update',
      reservationid: reservation._id.toString(),
      datetime: reservation.datetime,
    });
  } catch (err: unknown) {
    signale.debug(
      'error sending notification',
      (err as Error).message,
      (err as Error).stack,
    );
  }

  await reservation.save();

  res.status(200).json(onSuccess(reservation, 'reservations/id', 'PUT'));
};

const postOne = async (req: Request, res: Response) => {
  const { isAdmin, user } = authUserHelper(req);

  if (!user) {
    return;
  }

  const validator = ReservationValidator.pick({
    type: true,
    court: true,
    datetime: true,
    people: true,
    duration: true,
    notes: true,
    ...(isAdmin ? { owner: true } : {}),
  });

  let data: z.infer<typeof validator>;

  try {
    data = validator.parse(req.body);
  } catch (error) {
    throw new ServerError({
      error: ERRORS.INVALID_DATA,
      operation: req.method as 'PUT',
      status: 400,
      endpoint: 'reservations',
      data: {
        body: req.body,
        error,
      },
    });
  }

  const court = await Court.findOne({ _id: data.court });

  if (!court) {
    throw new ServerError({
      error: ERRORS.RESOURCE_NOT_FOUND,
      operation: req.method as 'GET',
      status: 404,
      endpoint: 'reservations',
      data: {
        resource: 'court',
        _id: data.court,
      },
    });
  }

  const courtReservations = await ReservationModel.find({
    datetime: { $regex: `^${data.datetime.split('T')[0]}` },
    court: court._id,
  });

  // check if the new reservation conflicts with an existing one
  if (
    !isReservationTimeFree(
      courtReservations,
      court.reservationsInfo.reservedTimes,
      data.datetime,
      data.duration,
    )
  ) {
    throw new ServerError({
      error: ERRORS.RESERVATION_TIME_CONFLICT,
      status: 400,
      operation: req.method,
      endpoint: 'reservations',
    });
  }

  const reservation = await ReservationModel.create({
    ...data,
    owner: isAdmin ? data.owner || user._id : user._id,
  });

  try {
    sendMessageToTopic(Topics.ADMIN, {
      title: 'Νέα κράτηση',
      body: `${reservation.datetime.split('T')[0]} - ${reservation.datetime.split('T')[1]}\nΓήπεδο: ${court.name}\nΌνομα: ${user.firstname || ''} ${user.lastname || ''}`,
      type: 'new',
      reservationid: reservation._id.toString(),
      datetime: reservation.datetime,
    });
  } catch (err: unknown) {
    signale.debug(
      'error sending notification',
      (err as Error).message,
      (err as Error).stack,
    );
  }

  res.status(201).json(onSuccess(reservation, 'reservations', 'POST'));
};

const getMany = async (req: Request, res: Response) => {
  const { user } = authUserHelper(req);

  if (!user) {
    return;
  }

  let lookupDate: string;
  let lookupDate2: string | undefined;
  const date =
    z.string().safeParse(req.query.date).data ||
    z.array(z.string()).safeParse(req.query.date).data;

  if (!!req.query.date && !date) {
    throw new ServerError({
      error: ERRORS.INVALID_QUERY,
      operation: req.method as 'GET',
      status: 400,
      endpoint: 'reservations',
      data: {
        query: 'id',
      },
    });
  }

  const offset = z.number().min(0).safeParse(Number(req.query.offset)).data;

  if (!!req.query.offset && offset !== 0 && !offset) {
    signale.debug({ offset, off: req.query.offset });
    throw new ServerError({
      error: ERRORS.INVALID_QUERY,
      operation: req.method as 'GET',
      status: 400,
      endpoint: 'reservations',
      data: {
        query: 'offset',
      },
    });
  }

  try {
    if (date) {
      if (Array.isArray(date)) {
        [lookupDate, lookupDate2] = date;
      } else {
        lookupDate = date;
      }
    } else {
      lookupDate = formatDate(new Date());
    }
  } catch {
    lookupDate = formatDate(new Date());
  }

  const dateQuery = {
    $and: [
      {
        datetime: {
          $gt: `${lookupDate.split('T')[0]}T00:00`,
        },
      },
      {
        datetime: {
          $lt: `${(lookupDate2 || lookupDate).split('T')[0]}T23:59`,
        },
      },
    ],
  };

  const offsetNumber = Number(offset);

  if (offset && !isNaN(offsetNumber)) {
    const reservations = await ReservationModel.find({
      owner: user._id,
      ...(Array.isArray(date)
        ? dateQuery
        : {
            datetime: {
              $gte: formatDate(new Date(new Date().getTime() - 20 * 60 * 1000)),
            },
          }),
    })
      .sort({
        datetime: -1,
      })
      .skip(offsetNumber >= 0 ? offsetNumber : 0)
      .limit(10);

    return res.status(200).json(onSuccess(reservations, 'reservations', 'GET'));
  }

  /* find all the data in our database */
  const reservationsData = await ReservationModel.find({
    ...(date ? dateQuery : {}),
    owner: user._id.toString(),
  }).lean();

  const reservationsSanitized = reservationsData.map((r) => {
    if (r.owner?.toString() === user._id.toString()) {
      return r;
    }

    return r.sanitize();
  });

  return res
    .status(200)
    .json(onSuccess(reservationsSanitized, 'reservations', 'GET'));
};

const deleteMany = async (req: Request, res: Response) => {
  const { isAdmin, user } = authUserHelper(req);

  if (!user) {
    return;
  }

  const ids = req.body.ids as Array<string>;

  if (!ids || !Array.isArray(ids)) {
    throw new ServerError({
      error: ERRORS.INVALID_QUERY,
      operation: req.method as 'GET',
      status: 400,
      endpoint: 'reservations',
      data: {
        query: 'ids',
      },
    });
  }

  if (ids.length === 0) {
    return res.status(200).json(onSuccess([], 'reservations', 'DELETE'));
  }

  const reservations = await ReservationModel.find({
    _id: { $in: ids },
    ...(isAdmin ? {} : { owner: user.id }),
  }).populate('court');

  for (let i = 0; i < reservations.length; i += 1) {
    const reservation = reservations[i];

    if (!isAdmin && reservation.owner !== user.id) {
      throw new ServerError({
        error: ERRORS.UNAUTHORIZED,
        operation: req.method as 'GET',
        status: 401,
        endpoint: 'reservations',
      });
    }

    if (new Date(reservation.datetime) < new Date()) {
      throw new ServerError({
        error: ERRORS.DATE_IN_THE_PAST,
        operation: req.method as 'GET',
        status: 400,
        endpoint: 'reservations',
        data: {
          datetime: reservation.datetime,
        },
      });
    }

    const deletedCount = await ReservationModel.deleteMany({
      _id: { $in: reservations.map((r) => r._id) },
    });

    try {
      reservations.forEach((reservation) => {
        sendMessageToTopic(Topics.ADMIN, {
          title: 'Διαγραφή κράτησης',
          body: `${reservation.datetime.split('T')[0]} - ${reservation.datetime.split('T')[1]}\nΓήπεδο: ${(reservation.court as unknown as CourtType).name}\nΌνομα: ${user.firstname || ''} ${user.lastname || ''}`,
          type: 'delete',
          datetime: reservation.datetime,
        });
      });
    } catch (err: unknown) {
      signale.debug(
        'error sending notification',
        (err as Error).message,
        (err as Error).stack,
      );
    }

    res.status(200).json(onSuccess(deletedCount, 'reservations', 'DELETE'));
  }
};

export default {
  getOne,
  postOne,
  updateOne,
  getMany,
  deleteMany,
};
