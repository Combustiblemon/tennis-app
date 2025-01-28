import express, { Express, Router } from 'express';

import { login, register } from '../handlers/auth';
import court from '../handlers/court';
import reservation from '../handlers/reservation';
import user from '../handlers/user';
import { userAuth } from '../middleware/auth';

const setupAuthGroup = (app: Express) => {
  const auth = express.Router({ mergeParams: true });
  app.use('/auth', auth);
  {
    auth.get('/session');
    auth.post('/login', login);
    auth.post('/register', register);
  }
};

const setupAdminGroup = (app: Router) => {
  const admin = express.Router({ mergeParams: true });
  app.use('/admin', admin);

  admin.use(/*middleware.Admin()*/);
  {
    const reservations = express.Router({ mergeParams: true });
    app.use('/reservations', reservations);
    {
      reservations.get('/');
      reservations.post('/');
      reservations.get('/:id');
      reservations.put('/:id');
      reservations.delete('/:id');
    }

    const courts = express.Router({ mergeParams: true });
    app.use('/courts', courts);
    {
      courts.get('/');
      courts.post('/');
      courts.get('/:id');
      courts.put('/:id');
      courts.delete('/:id');
    }

    const users = express.Router({ mergeParams: true });
    app.use('/users', users);
    {
      users.get('/');
      users.put('/');
      users.get('/:id');
      users.post('/:id');
      users.put('/:id');
      users.delete('/:id');
    }
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
    authorized.use('/users', reservations);
    {
      users.put('/', user.updateOne);
    }
  }

  setupAdminGroup(authorized);
};

export const setupRoutes = (app: Express) => {
  setupAuthGroup(app);
  setupAuthorizedGroup(app);
};
