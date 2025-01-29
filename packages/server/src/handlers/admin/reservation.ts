import { Request, Response } from 'express';
import signale from 'signale';
import { z } from 'zod';

import Court from '../../models/Court';
import ReservationModel, {
  ReservationValidator,
} from '../../models/Reservation';
import {
  authUserHelper,
  Errors,
  formatDate,
  isReservationTimeFree,
  onError,
  onSuccess,
} from '../../modules/common';
import { sendMessageToTopic, Topics } from '../../modules/notifications';

const getMany = async (req: Request, res: Response) => {
  try {
    const date = z.string().safeParse(req.query.date).data;

    if (!date) {
      return res.status(400).json(
        onError(new Error(Errors.INVALID_QUERY), 'reservation', 'GET', {
          query: 'date',
        }),
      );
    }

    const offset = z.string().safeParse(req.query.offset).data;

    if (!offset) {
      return res.status(400).json(
        onError(new Error(Errors.INVALID_QUERY), 'reservation', 'GET', {
          query: 'offset',
        }),
      );
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

    const reservationsData = await ReservationModel.find({
      ...(date ? dateQuery : {}),
    })
      .populate('owner', 'name email _id role')
      .populate('court')
      .lean();

    return res
      .status(200)
      .json(onSuccess(reservationsData, 'reservations', 'GET'));
  } catch (error) {
    signale.error(error);
    return res.status(500).json(onError(error as Error, 'reservations', 'GET'));
  }
};

const getOne = async (req: Request, res: Response) => {
  const { user } = authUserHelper(req);

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

    res.status(200).json(onSuccess(reservations, 'reservations/id', 'GET'));
  } catch (error) {
    res.status(400).json(onError(error as Error, 'reservations/id', 'GET'));
  }
};

const createOne = async (req: Request, res: Response) => {
  const { user } = authUserHelper(req);

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
      owner: true,
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
      owner: data.owner || user._id,
    });

    sendMessageToTopic(Topics.ADMIN, {
      title: 'Νέα κράτηση',
      body: `${reservation.datetime.split('T')[0]} - ${reservation.datetime.split('T')[1]}\nΓήπεδο: ${court.name}\nΌνομα: ${user.name || ''}`,
    });

    res.status(201).json(onSuccess(reservation, 'reservations', 'POST'));
  } catch (error) {
    res.status(500).json(onError(error as Error, 'reservations', 'POST'));
  }
};

const deleteMany = async (req: Request, res: Response) => {
  const { user } = authUserHelper(req);

  if (!user) {
    return;
  }

  try {
    const id = z.string().safeParse(req.query.id).data;

    if (!id) {
      return res.status(400).json(
        onError(new Error(Errors.INVALID_QUERY), 'reservation', 'GET', {
          query: 'id',
        }),
      );
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
  } catch (error) {
    res.status(500).json(onError(error as Error, 'reservations', 'DELETE'));
  }
};

export default {
  getMany,
  createOne,
  deleteMany,
  getOne,
};
