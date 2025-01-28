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
  Errors,
  formatDate,
  isReservationTimeFree,
  onError,
  onSuccess,
} from '../modules/common';
import { sendMessageToTopic, Topics } from '../modules/notifications';

const getOne = async (req: Request, res: Response) => {
  const { isAdmin, user } = authUserHelper(req);

  if (!user) {
    return;
  }

  try {
    const id =
      z.string().safeParse(req.query.id).data ||
      z.array(z.string()).safeParse(req.query.id).data;

    if (!!req.query.id && !id) {
      return res.status(400).json(
        onError(new Error(Errors.INVALID_QUERY), 'reservation', 'GET', {
          query: 'id',
        }),
      );
    }

    const ids = Array.isArray(id) ? id : id?.split(',');

    if (!ids || !ids.length) {
      return res.status(200).json(onSuccess([], 'reservations/id', 'GET'));
    }

    const reservations = await ReservationModel.find({
      id: { $in: ids },
    });

    if (reservations.length !== ids.length) {
      return res
        .status(404)
        .json(
          onError(new Error('No reservation found'), 'reservations/id', 'GET'),
        );
    }

    if (
      !isAdmin &&
      reservations.some(
        (reservation) =>
          reservation.owner?.toString() !== user._id.toString() &&
          !reservation.people.includes(user._id.toString() || ''),
      )
    ) {
      return res
        .status(401)
        .json(onError(new Error('Unauthorized'), 'reservations/id', 'GET'));
    }

    res.status(200).json(onSuccess(reservations, 'reservations/id', 'GET'));
  } catch (error) {
    res.status(400).json(onError(error as Error, 'reservations/id', 'GET'));
  }
};

const updateOne = async (req: Request, res: Response) => {
  const { isAdmin, user } = authUserHelper(req);

  if (!user) {
    return;
  }

  try {
    const id =
      z.string().safeParse(req.query.id).data ||
      z.array(z.string()).safeParse(req.query.id).data;

    if (!!req.query.id && !id) {
      return res.status(400).json(
        onError(new Error(Errors.INVALID_QUERY), 'reservation', 'GET', {
          query: 'id',
        }),
      );
    }

    let data: z.infer<typeof ReservationValidatorPartial>;

    try {
      data = ReservationValidatorPartial.parse(req.body);
    } catch (error) {
      return res
        .status(400)
        .json(onError(error as Error, 'reservations/id', 'PUT'));
    }

    const reservation = await ReservationModel.findOne({ _id: id });
    const court = await Court.findOne({ _id: reservation?.court });

    if (!court) {
      return res.status(404).json(
        onError(new Error('No court found'), 'reservations/id', 'PUT', {
          _id: id,
        }),
      );
    }

    if (!reservation) {
      return res.status(404).json(
        onError(new Error('No reservation found'), 'reservations/id', 'PUT', {
          _id: id,
        }),
      );
    }

    if (reservation.owner !== user.id && !isAdmin) {
      return res
        .status(401)
        .json(onError(new Error('Unauthorized'), 'reservations/id', 'PUT'));
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
        return res.status(400).json(
          onError(new Error('time_conflict'), 'reservations', 'POST', {
            _id: data.court,
          }),
        );
      }
    }

    reservation.set(data);

    sendMessageToTopic(Topics.ADMIN, {
      title: 'Αλλαγή κράτησης',
      body: `${reservation.datetime.split('T')[0]} - ${reservation.datetime.split('T')[1]}\nΓήπεδο: ${court.name}\nΌνομα: ${user.name || ''}`,
    });

    await reservation.save();

    res.status(200).json(onSuccess(reservation, 'reservations/id', 'PUT'));
  } catch (error) {
    res.status(400).json(onError(error as Error, 'reservations/id', 'PUT'));
  }
};

const postOne = async (req: Request, res: Response) => {
  const { isAdmin, user } = authUserHelper(req);

  if (!user) {
    return;
  }

  try {
    const validator = ReservationValidator.pick({
      type: true,
      court: true,
      datetime: true,
      people: true,
      duration: true,
      ...(isAdmin ? { owner: true } : {}),
    });

    let data: z.infer<typeof validator>;

    try {
      data = validator.parse(req.body);
    } catch (error) {
      return res
        .status(400)
        .json(onError(error as Error, 'reservations', 'POST'));
    }

    const court = await Court.findOne({ _id: data.court });

    if (!court) {
      return res
        .status(404)
        .json(
          onError(
            new Error(Errors.RESOURCE_NOT_FOUND),
            'reservations',
            'POST',
            { _id: data.court },
          ),
        );
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
      return res.status(400).json(
        onError(new Error('time_conflict'), 'reservations', 'POST', {
          _id: data.court,
        }),
      );
    }

    const reservation = await ReservationModel.create({
      ...data,
      owner: isAdmin ? data.owner || user._id : user._id,
    });

    sendMessageToTopic(Topics.ADMIN, {
      title: 'Νέα κράτηση',
      body: `${reservation.datetime.split('T')[0]} - ${reservation.datetime.split('T')[1]}\nΓήπεδο: ${court.name}\nΌνομα: ${user.name || ''}`,
    });

    res.status(201).json(onSuccess(reservation, 'reservations', 'POST'));
  } catch (error) {
    res.status(400).json(onError(error as Error, 'reservations', 'POST'));
  }
};

const getMany = async (req: Request, res: Response) => {
  const { isAdmin, user } = authUserHelper(req);

  if (!user) {
    return;
  }

  try {
    let lookupDate: string;
    let lookupDate2: string | undefined;
    const date =
      z.string().safeParse(req.query.date).data ||
      z.array(z.string()).safeParse(req.query.date).data;

    if (!!req.query.date && !date) {
      return res.status(400).json(
        onError(new Error(Errors.INVALID_QUERY), 'reservation', 'GET', {
          query: 'date',
        }),
      );
    }

    const offset = z.number().min(0).safeParse(req.query.offset).data;

    if (!!req.query.offset && !offset) {
      return res.status(400).json(
        onError(new Error(Errors.INVALID_QUERY), 'reservation', 'GET', {
          query: 'offset',
        }),
      );
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
                $gte: formatDate(
                  new Date(new Date().getTime() - 20 * 60 * 1000),
                ),
              },
            }),
      })
        .sort({
          datetime: -1,
        })
        .skip(offsetNumber >= 0 ? offsetNumber : 0)
        .limit(10);

      return res
        .status(200)
        .json(onSuccess(reservations, 'reservations', 'GET'));
    }
    /* find all the data in our database */
    const reservationsData = await ReservationModel.find({
      ...dateQuery,
      ...(user.role !== 'ADMIN' ? { owner: user._id } : {}),
    }).lean();

    const reservationsSanitized = isAdmin
      ? reservationsData
      : reservationsData.map((r) => {
          if (r.owner?.toString() === user._id.toString()) {
            return r;
          }

          return r.sanitize();
        });

    return res
      .status(200)
      .json(onSuccess(reservationsSanitized, 'reservations', 'GET'));
  } catch (error) {
    signale.error(error);
    return res.status(400).json(onError(error as Error, 'reservations', 'GET'));
  }
};

const deleteMany = async (req: Request, res: Response) => {
  const { isAdmin, user } = authUserHelper(req);

  if (!user) {
    return;
  }

  try {
    const ids = req.body.ids as Array<string>;

    if (!ids || !Array.isArray(ids)) {
      return res
        .status(400)
        .json(
          onError(
            new Error('Please provide an array of reservation IDs'),
            'reservations',
            'DELETE',
          ),
        );
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
        return res
          .status(401)
          .json(
            onError(new Error(Errors.UNAUTHORIZED), 'reservations', 'DELETE'),
          );
      }

      if (new Date(reservation.datetime) < new Date()) {
        return res
          .status(400)
          .json(
            onError(
              new Error('Cannot delete past reservations'),
              'reservations',
              'DELETE',
            ),
          );
      }
    }

    const deletedCount = await ReservationModel.deleteMany({
      _id: { $in: reservations.map((r) => r._id) },
    });

    reservations.forEach((reservation) => {
      sendMessageToTopic(Topics.ADMIN, {
        title: 'Διαγραφή κράτησης',
        body: `${reservation.datetime.split('T')[0]} - ${reservation.datetime.split('T')[1]}\nΓήπεδο: ${(reservation.court as unknown as CourtType).name}\nΌνομα: ${user.name || ''}`,
      });
    });

    res.status(200).json(onSuccess(deletedCount, 'reservations', 'DELETE'));
  } catch (error) {
    res.status(400).json(onError(error as Error, 'reservations', 'DELETE'));
  }
};

export default {
  getOne,
  postOne,
  updateOne,
  getMany,
  deleteMany,
};
