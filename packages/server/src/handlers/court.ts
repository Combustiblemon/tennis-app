import { Request, Response } from 'express';
import { z } from 'zod';

import Court from '../models/Court';
import { Errors, onError, onSuccess } from '../modules/common';

const getOne = async (req: Request, res: Response) => {
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

  try {
    const court = await Court.findById(id);

    if (!court) {
      return res
        .status(404)
        .json(
          onError(new Error(Errors.RESOURCE_NOT_FOUND), 'courts/id', 'GET'),
        );
    }

    res.status(200).json(onSuccess(court, 'courts/id', 'GET'));
  } catch (error) {
    res.status(500).json(onError(error as Error, 'courts/id', 'GET'));
  }
};

const getMany = async (req: Request, res: Response) => {
  try {
    const courts = await Court.find({}).lean();

    res.status(200).json(onSuccess(courts, 'courts', 'GET'));
  } catch (error) {
    res.status(500).json(onError(error as Error, 'courts', 'GET'));
  }
};

export default {
  getOne,
  getMany,
};
