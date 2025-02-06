import { Request, Response } from 'express';
import signale from 'signale';
import { z } from 'zod';

import Court, {
  CourtValidator,
  CourtValidatorPartial,
} from '../../models/Court';
import { ERRORS, formatDate, onSuccess } from '../../modules/common';
import { ServerError } from '../../modules/error';

const getMany = async (req: Request, res: Response) => {
  const ids =
    // should never split, just making it an array easily
    z.string().safeParse(req.query.id).data?.split('&a!asd') ||
    z.array(z.string()).safeParse(req.query.id).data;

  if (req.query.id && !ids) {
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

  const filter: Record<string, unknown> = {};

  if (ids) {
    filter._id = { $in: ids };
  }

  const courts = await Court.find({}).lean();

  res.status(200).json(onSuccess(courts, 'courts', 'GET'));
};

const postOne = async (req: Request, res: Response) => {
  let courtData: z.infer<typeof CourtValidator>;

  try {
    courtData = CourtValidator.parse(req.body);
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

  const court = await Court.create(courtData);

  res.status(201).json(onSuccess(court, 'courts', 'POST'));
};

const updateOne = async (req: Request, res: Response) => {
  const id = z.string().safeParse(req.params.id).data;

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

  let data: z.infer<typeof CourtValidatorPartial>;

  try {
    data = CourtValidatorPartial.parse(req.body);
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

  if (data.reservationsInfo?.reservedTimes?.length) {
    const today = formatDate(new Date()).split('T')[0];

    data.reservationsInfo.reservedTimes =
      data.reservationsInfo.reservedTimes.map((reser) => {
        if (reser.datesNotApplied) {
          reser.datesNotApplied = reser.datesNotApplied.filter(
            (d) => d >= today,
          );
        }

        return reser;
      });
  }

  const court = await Court.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!court) {
    throw new ServerError({
      error: ERRORS.RESOURCE_NOT_FOUND,
      operation: req.method as 'GET',
      status: 404,
      endpoint: 'courts',
      data: {
        resource: 'court',
        _id: id,
      },
    });
  }

  res.status(200).json(onSuccess(court, 'courts/id', 'PUT'));
};

const deleteOne = async (req: Request, res: Response) => {
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

  const deletedCourt = await Court.deleteOne({ _id: id });

  if (!deletedCourt) {
    throw new ServerError({
      error: ERRORS.RESOURCE_NOT_FOUND,
      operation: req.method as 'GET',
      status: 404,
      endpoint: 'courts',
      data: {
        resource: 'court',
        _id: id,
      },
    });
  }

  res.status(200).json(onSuccess(deletedCourt, 'courts/id', 'DELETE'));
};

export default {
  getMany,
  postOne,
  updateOne,
  deleteOne,
};
