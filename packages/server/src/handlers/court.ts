import { Request, Response } from 'express';
import signale from 'signale';
import { z } from 'zod';

import Court from '../models/Court';
import { ERRORS, onError, onSuccess } from '../modules/common';
import { ServerError } from '../modules/error';

const getOne = async (req: Request, res: Response) => {
  const id =
    z.string().safeParse(req.query.id).data ||
    z.array(z.string()).safeParse(req.query.id).data;

  if (!!req.query.id && !id) {
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

  try {
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
  } catch (error) {
    signale.error(error);

    throw new ServerError({
      error: ERRORS.INTERNAL_SERVER_ERROR,
      operation: req.method,
      status: 500,
      endpoint: 'courts',
    });
  }
};

const getMany = async (req: Request, res: Response) => {
  try {
    const courts = await Court.find({}).lean();

    res.status(200).json(onSuccess(courts, 'courts', 'GET'));
  } catch (error) {
    signale.error(error);

    throw new ServerError({
      error: ERRORS.INTERNAL_SERVER_ERROR,
      operation: req.method,
      status: 500,
      endpoint: 'courts',
    });
  }
};

export default {
  getOne,
  getMany,
};
