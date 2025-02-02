import { Request, Response } from 'express';
import { z } from 'zod';

import Court from '../../models/Court';
import ReservationModel, {
  ReservationValidator,
} from '../../models/Reservation';
import {
  authUserHelper,
  ERRORS,
  formatDate,
  isReservationTimeFree,
  onSuccess,
} from '../../modules/common';
import { ServerError } from '../../modules/error';
import { sendMessageToTopic, Topics } from '../../modules/notifications';

const getMany = async (req: Request, res: Response) => {
  const date = z.string().safeParse(req.query.date).data;

  if (!date) {
    throw new ServerError({
      error: ERRORS.INVALID_QUERY,
      operation: req.method as 'GET',
      status: 400,
      endpoint: 'reservations',
      data: {
        query: 'date',
      },
    });
  }

  const offset = z.string().safeParse(req.query.offset).data;

  if (!offset) {
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

  let lookupDate: string;
  let lookupDate2: string | undefined;

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

  const reservationsData = await ReservationModel.find({
    ...(date ? dateQuery : {}),
  })
    .populate('owner', 'name email _id role')
    .populate('court')
    .lean();

  return res
    .status(200)
    .json(onSuccess(reservationsData, 'reservations', 'GET'));
};

const getOne = async (req: Request, res: Response) => {
  const { user } = authUserHelper(req);

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
      endpoint: 'reservation',
      data: {
        resource: 'reservation',
        _id: ids,
      },
    });
  }

  res.status(200).json(onSuccess(reservations, 'reservations/id', 'GET'));
};

const createOne = async (req: Request, res: Response) => {
  const { user } = authUserHelper(req);

  if (!user) {
    return;
  }

  const validator = ReservationValidator.pick({
    type: true,
    court: true,
    datetime: true,
    people: true,
    duration: true,
    owner: true,
  });

  let data: z.infer<typeof validator>;

  try {
    data = validator.parse(req.body);
  } catch (error) {
    throw new ServerError({
      error: ERRORS.INVALID_DATA,
      operation: req.method as 'GET',
      status: 400,
      endpoint: 'reservations',
      data: {
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
    owner: data.owner || user._id,
  });

  sendMessageToTopic(Topics.ADMIN, {
    title: 'Νέα κράτηση',
    body: `${reservation.datetime.split('T')[0]} - ${reservation.datetime.split('T')[1]}\nΓήπεδο: ${court.name}\nΌνομα: ${user.name || ''}`,
  });

  res.status(201).json(onSuccess(reservation, 'reservations', 'POST'));
};

const deleteMany = async (req: Request, res: Response) => {
  const { user } = authUserHelper(req);

  if (!user) {
    return;
  }

  const id = z.string().safeParse(req.query.id).data;

  if (!id) {
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

  if (id.length === 0) {
    return res.status(200).json(onSuccess([], 'reservations', 'DELETE'));
  }

  const reservations = await ReservationModel.find({
    _id: { $in: id },
    owner: user._id.toString(),
  });

  const deletedCount = await ReservationModel.deleteMany({
    _id: { $in: reservations.map((r) => r._id) },
  });

  res.status(200).json(onSuccess(deletedCount, 'reservations', 'DELETE'));
};

export default {
  getMany,
  createOne,
  deleteMany,
  getOne,
};
