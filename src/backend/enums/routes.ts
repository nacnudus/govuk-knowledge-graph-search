import { Router } from 'express'

interface Routes {
  path?: string
  router: Router
}

export enum Route {
  search = '/',
  getInitData = '/get-init-data',
  searchApi = '/search',
  searchTaxon = '/taxon',
  downloadCSV = '/csv',
  infoBoxOrganisation = '/organisation',
  infoBoxRole = '/role',
  infoBoxBankHoliday = '/bank-holiday',
  infoBoxTransaction = '/transaction',
  infoBoxPerson = '/person',
  cookies = '/cookies',
  saveCookieSettings = '/save-cookie-settings',
  hideCookieSuccessBanner = '/hide-cookie-success-banner',
}

export default Routes
