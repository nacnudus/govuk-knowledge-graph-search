import { Router } from 'express';

interface Routes {
  path?: string;
  router: Router;
}

export enum Route {
  index = '/',
  getInitData = '/get-init-data',
  searchApi = '/search',
  searchTaxon = '/taxon',
}

export default Routes;
