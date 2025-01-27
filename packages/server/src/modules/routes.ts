import express, { Express, Router } from 'express';

const setupAuthGroup = (app: Express) => {
  const auth = express.Router({ mergeParams: true });
  app.use('/auth', auth);
  {
    auth.get('/session');
    auth.post('/login');
    auth.post('/register');
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

  authorized.use(/*middleware.Auth()*/);
  {
    const reservations = express.Router({ mergeParams: true });
    authorized.use('/reservations', reservations);
    {
      reservations.get('/');
      reservations.post('/');
      reservations.get('/:id');
      reservations.put('/:id');
      reservations.delete('/:id');
    }

    const courts = express.Router({ mergeParams: true });
    authorized.use('/courts', reservations);
    {
      courts.get('/');
      courts.get('/:id');
    }

    const users = express.Router({ mergeParams: true });
    authorized.use('/users', reservations);
    {
      users.put('/');
    }
  }

  setupAdminGroup(authorized);
};

export const setupRoutes = (app: Express) => {
  setupAuthGroup(app);
  setupAuthorizedGroup(app);
};
