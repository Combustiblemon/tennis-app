import { Request, Response } from 'express';
import { z } from 'zod';

import Court, {
  CourtValidator,
  CourtValidatorPartial,
} from '../../models/Court';
import { Errors, formatDate, onError, onSuccess } from '../../modules/common';

const getMany = async (req: Request, res: Response) => {
  try {
    const ids =
      // should never split, just making it an array easily
      z.string().safeParse(req.query.id).data?.split('&a!asd') ||
      z.array(z.string()).safeParse(req.query.id).data;

    if (!!req.query.id && !ids) {
      return res.status(400).json(
        onError(new Error(Errors.INVALID_QUERY), 'reservation', 'GET', {
          query: 'id',
        }),
      );
    }

    const filter: Record<string, unknown> = {};

    if (ids) {
      filter._id = { $in: ids };
    }

    const courts = await Court.find({}).lean();

    res.status(200).json(onSuccess(courts, 'courts', 'GET'));
  } catch (error) {
    res.status(500).json(onError(error as Error, 'courts', 'GET'));
  }
};

const postOne = async (req: Request, res: Response) => {
  try {
    let courtData: z.infer<typeof CourtValidator>;

    try {
      courtData = CourtValidator.parse(req.body);
    } catch (error) {
      return res.status(400).json(onError(error as Error, 'courts', 'POST'));
    }

    const court = await Court.create(courtData);

    res.status(201).json(onSuccess(court, 'courts', 'POST'));
  } catch (error) {
    res.status(500).json(onError(error as Error, 'courts', 'POST'));
  }
};

const updateOne = async (req: Request, res: Response) => {
  try {
    const id = z.string().safeParse(req.query.id).data;

    if (!id) {
      return res.status(400).json(
        onError(new Error(Errors.INVALID_QUERY), 'reservation', 'GET', {
          query: 'id',
        }),
      );
    }

    let data: z.infer<typeof CourtValidatorPartial>;

    try {
      data = CourtValidatorPartial.parse(req.body);
    } catch (error) {
      return res.status(400).json(onError(error as Error, 'courts/id', 'PUT'));
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
      res
        .status(404)
        .json(onError(new Error('No court found'), 'courts/id', 'PUT'));
    }

    res.status(200).json(onSuccess(court, 'courts/id', 'PUT'));
  } catch (error) {
    res.status(500).json(onError(error as Error, 'courts/id', 'PUT'));
  }
};

const deleteOne = async (req: Request, res: Response) => {
  try {
    const id = z.string().safeParse(req.query.id).data;

    if (!id) {
      return res.status(400).json(
        onError(new Error(Errors.INVALID_QUERY), 'reservation', 'GET', {
          query: 'id',
        }),
      );
    }

    const deletedCourt = await Court.deleteOne({ _id: id });

    if (!deletedCourt) {
      return res
        .status(404)
        .json(onError(new Error('No court found'), 'courts/id', 'DELETE'));
    }

    res.status(200).json(onSuccess(deletedCourt, 'courts/id', 'DELETE'));
  } catch (error) {
    res.status(500).json(onError(error as Error, 'courts/id', 'DELETE'));
  }
};

export default {
  getMany,
  postOne,
  updateOne,
  deleteOne,
};
