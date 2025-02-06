import { Request, Response } from 'express';
import { z } from 'zod';

import Court from '../models/Court';
import { ERRORS, onSuccess } from '../modules/common';
import { ServerError } from '../modules/error';

const getOne = async (req: Request, res: Response) => {
  const id =
    z.string().safeParse(req.params.id).data ||
    z.array(z.string()).safeParse(req.params.id).data;

  if (!id || !id.length) {
    throw new ServerError({
      error: ERRORS.INVALID_QUERY,
      operation: req.method as 'GET',
      status: 400,
      endpoint: 'reservation',
      data: {
        query: 'id',
      },
    });
  }

  const court = await Court.findById(id);

  if (!court) {
    throw new ServerError({
      error: ERRORS.RESOURCE_NOT_FOUND,
      operation: req.method,
      status: 404,
      endpoint: 'courts',
      data: {
        resource: 'court',
      },
    });
  }
  return res.status(200).json(onSuccess(court, 'courts/id', 'GET'));
};

const getMany = async (req: Request, res: Response) => {
  const courts = await Court.find({}).lean();

  res.status(200).json(onSuccess(courts, 'courts', 'GET'));
};

export default {
  getOne,
  getMany,
};
