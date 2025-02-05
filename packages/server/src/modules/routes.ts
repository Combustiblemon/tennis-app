import express, { Express, Router } from 'express';

import adminCourt from '../handlers/admin/court';
import adminReservation from '../handlers/admin/reservation';
import { login, logout, verifyLogin } from '../handlers/auth';
import court from '../handlers/court';
import notification from '../handlers/notification';
import reservation from '../handlers/reservation';
import user from '../handlers/user';
import { adminAuth, userAuth } from '../middleware/auth';
import { asyncHandler } from './error';

const setupAuthGroup = (app: Express) => {
  const auth = express.Router({ mergeParams: true });
  app.use('/auth', auth);
  {
    auth.get('/logout', asyncHandler(logout));
    auth.post('/verifyLogin', asyncHandler(verifyLogin));
    auth.post('/login', asyncHandler(login));
  }
};

const setupAdminGroup = (app: Router) => {
  const admin = express.Router({ mergeParams: true });
  app.use('/admin', admin);

  admin.use(adminAuth);
  {
    const reservations = express.Router({ mergeParams: true });
    admin.use('/reservations', reservations);
    {
      reservations.get('/', asyncHandler(adminReservation.getMany));
      reservations.post('/', asyncHandler(adminReservation.createOne));
      reservations.get('/:id', asyncHandler(adminReservation.getOne));
      reservations.delete('/', asyncHandler(adminReservation.deleteMany));
    }

    const courts = express.Router({ mergeParams: true });
    admin.use('/courts', courts);
    {
      courts.get('/', asyncHandler(adminCourt.getMany));
      courts.post('/', asyncHandler(adminCourt.postOne));
      courts.get('/:ids', asyncHandler(adminCourt.getMany));
      courts.put('/:id', asyncHandler(adminCourt.updateOne));
      courts.delete('/:id', asyncHandler(adminCourt.deleteOne));
    }

    // const users = express.Router({ mergeParams: true });
    // admin.use('/users', users);
    // {
    //   users.get('/');
    //   users.put('/');
    //   users.get('/:id');
    //   users.post('/:id');
    //   users.put('/:id');
    //   users.delete('/:id');
    // }
  }
};

const setupAuthorizedGroup = (app: Express) => {
  const authorized = express.Router({ mergeParams: true });
  app.use('/', authorized);

  authorized.use(userAuth);
  {
    const reservations = express.Router({ mergeParams: true });
    authorized.use('/reservations', reservations);
    {
      reservations.get('/', asyncHandler(reservation.getMany));
      reservations.post('/', asyncHandler(reservation.postOne));
      reservations.get('/:id', asyncHandler(reservation.getOne));
      reservations.put('/:id', asyncHandler(reservation.updateOne));
      reservations.delete('/', asyncHandler(reservation.deleteMany));
    }

    const courts = express.Router({ mergeParams: true });
    authorized.use('/courts', courts);
    {
      courts.get('/', asyncHandler(court.getMany));
      courts.get('/:id', asyncHandler(court.getOne));
    }

    const users = express.Router({ mergeParams: true });
    authorized.use('/user', users);
    {
      users.get('/', asyncHandler(user.getCurrent));
      users.put('/', asyncHandler(user.updateOne));
    }

    const notifications = express.Router({ mergeParams: true });
    authorized.use('/notifications', notifications);
    {
      notifications.put('/', asyncHandler(notification.updateToken));
    }
  }

  setupAdminGroup(authorized);
};

export const setupRoutes = (app: Express) => {
  setupAuthGroup(app);
  setupAuthorizedGroup(app);
};
