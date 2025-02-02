import express, { Express, Router } from 'express';

import adminCourt from '../handlers/admin/court';
import adminReservation from '../handlers/admin/reservation';
import { login, logout, verifyLogin } from '../handlers/auth';
import court from '../handlers/court';
import reservation from '../handlers/reservation';
import user from '../handlers/user';
import { adminAuth, userAuth } from '../middleware/auth';

const setupAuthGroup = (app: Express) => {
  const auth = express.Router({ mergeParams: true });
  app.use('/auth', auth);
  {
    auth.get('/logout', logout);
    auth.post('/verifyLogin', verifyLogin);
    auth.post('/login', login);
  }
};

const setupAdminGroup = (app: Router) => {
  const admin = express.Router({ mergeParams: true });
  app.use('/admin', admin);

  admin.use(adminAuth);
  {
    const reservations = express.Router({ mergeParams: true });
    app.use('/reservations', reservations);
    {
      reservations.get('/', adminReservation.getMany);
      reservations.post('/', adminReservation.createOne);
      reservations.get('/:id', adminReservation.getOne);
      reservations.delete('/', adminReservation.deleteMany);
    }

    const courts = express.Router({ mergeParams: true });
    app.use('/courts', courts);
    {
      courts.get('/', adminCourt.getMany);
      courts.post('/', adminCourt.postOne);
      courts.get('/:ids', adminCourt.getMany);
      courts.put('/:id', adminCourt.updateOne);
      courts.delete('/:id', adminCourt.deleteOne);
    }

    // const users = express.Router({ mergeParams: true });
    // app.use('/users', users);
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
      reservations.get('/', reservation.getMany);
      reservations.post('/', reservation.postOne);
      reservations.get('/:id', reservation.getOne);
      reservations.put('/:id', reservation.updateOne);
      reservations.delete('/:id', reservation.deleteMany);
    }

    const courts = express.Router({ mergeParams: true });
    authorized.use('/courts', reservations);
    {
      courts.get('/', court.getOne);
      courts.get('/:id', court.getMany);
    }

    const users = express.Router({ mergeParams: true });
    authorized.use('/user', reservations);
    {
      users.get('/', user.getCurrent)
      users.put('/', user.updateOne);
    }
  }

  setupAdminGroup(authorized);
};

export const setupRoutes = (app: Express) => {
  setupAuthGroup(app);
  setupAuthorizedGroup(app);
};
