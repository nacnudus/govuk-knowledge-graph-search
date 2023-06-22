import fs from 'fs'
import path from 'path'

import express from 'express'
import { auth } from './src/ts/middlewares'

import * as nunjucks from 'nunjucks'

import {
  sendSearchQuery,
  sendInitQuery,
  getOrganisationInfo,
  getPersonInfo,
  getRoleInfo,
  getTaxonInfo,
  getBankHolidayInfo,
  getTransactionInfo,
} from './bigquery'
import {
  SearchArea,
  Combinator,
  SearchType,
  SearchParams,
} from './src/ts/search-api-types'
import { csvStringify } from './csv'
import { sanitiseInput } from './src/ts/utils'
import cors from 'cors'
import bodyParser from 'body-parser'
import Redis from 'ioredis'
import RedisStore from 'connect-redis'

const redisInstance = new Redis(
  Number(process.env.REDIS_PORT) || 6379,
  process.env.REDIS_HOST || 'localhost'
)

const redisStore = new RedisStore({
  client: redisInstance,
  prefix: 'GovSearch::',
})

// these variables are used for OAuth authentication. They will only be set if
// OAuth is enabled
let OAuth2Strategy, passport, session

// Initialize the express engine
const app: express.Express = express()
const port: number = process.env.port ? parseInt(process.env.port) : 8080

const views = [
  path.join(__dirname, './node_modules/govuk-frontend/'),
  path.join(__dirname, './node_modules/govuk-frontend/components'),
  path.join(__dirname, './views')
];

nunjucks.configure(views, {
    autoescape: true,
    express: app
});

if (process.env.ENABLE_AUTH === 'true') {
  console.log(
    'OAuth via PassportJS is enabled because ENABLE_AUTH is set to "true"'
  )
  // The OAuth code is based on multiple online sources.
  // The main one is:
  // https://www.pveller.com/oauth2-with-passport-10-steps-recipe/
  OAuth2Strategy = require('passport-oauth2')
  passport = require('passport')
  session = require('express-session')
  passport.serializeUser((user: any, done: any) => done(null, user))
  passport.deserializeUser((user: any, done: any) => done(null, user))

  app.use(
    session({
      secret: 'keyboard cat',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: true },
      store: redisStore,
    })
  )
} else {
  console.log(
    'OAuth via PassportJS is disabled because ENABLE_AUTH is not set to "true"'
  )
}

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static('public'))
app.use(express.json())

app.engine('html', nunjucks.render)
app.set('views', views);
app.set('view engine', 'html')

if (process.env.ENABLE_AUTH === 'true') {
  app.set('trust proxy', 1) // trust first proxy
  app.use(passport.initialize())
  app.use(passport.session())

  passport.use(
    new OAuth2Strategy(
      {
        authorizationURL: process.env.OAUTH_AUTH_URL || 'not set',
        tokenURL: process.env.OAUTH_TOKEN_URL || 'not set',
        clientID: process.env.OAUTH_ID || 'not set',
        clientSecret: process.env.OAUTH_SECRET || 'not set',
        callbackURL: process.env.OAUTH_CALLBACK_URL || 'not set',
      },
      function (
        accessToken: string,
        refreshToken: string,
        profile: any,
        cb: any
      ) {
        console.log(
          'OAuth2Strategy callback',
          accessToken,
          refreshToken,
          profile
        )
        cb(null, profile)
      }
    )
  )
}

// Routes

if (process.env.ENABLE_AUTH === 'true') {
  app.get('/login', passport.authenticate('oauth2'))
  app.get(
    '/auth/gds/callback',
    passport.authenticate('oauth2', '/error-callback'),
    async (req, res) => res.redirect('/')
  )
}

app.get('/', auth(), async (req, res) => {
  const environment = process.env.NODE_ENV || '__NODE_ENV__';
  res.render('search.njk', { environment });
})

app.get('/cookies', async (req, res) => {
  res.render('cookies.njk');
})

// the front-end will call this upon starting to get some data needed from the server
app.get('/get-init-data', auth('/'), async (req, res) => {
  console.log('/get-init-data')
  try {
    res.send(await sendInitQuery())
  } catch (e: any) {
    console.log('/get-init-data fail:', JSON.stringify(e))
    res.status(500).send(e)
  }
})

app.get('/search', auth('/'), async (req: any, res) => {
  console.log('API call to /search', req.query)
  // retrieve qsp params
  const params: SearchParams = {
    searchType:
      <SearchType>sanitiseInput(req.query['search-type']) || SearchType.Keyword,
    selectedWords: sanitiseInput(req.query['selected-words']) || '',
    excludedWords: sanitiseInput(req.query['excluded-words']) || '',
    selectedTaxon: sanitiseInput(req.query['selected-taxon']) || '',
    selectedOrganisation:
      sanitiseInput(req.query['selected-organisation']) || '',
    selectedLocale: sanitiseInput(req.query.lang) || '',
    caseSensitive: req.query['case-sensitive'] === 'true',
    combinator:
      <Combinator>sanitiseInput(req.query.combinator) || Combinator.All,
    whereToSearch: {
      title: !(req.query['search-in-title'] === 'false'),
      text: !(req.query['search-in-text'] === 'false'),
    },
    areaToSearch: <SearchArea>sanitiseInput(req.query.area) || SearchArea.Any,
    linkSearchUrl: sanitiseInput(req.query['link-search-url']) || '',
  }
  try {
    const data = await sendSearchQuery(params)
    res.send(data)
  } catch (e: any) {
    console.log('/search fail:', JSON.stringify(e))
    res.status(500).send(e)
  }
})

app.get('/csv', async (req: any, res) => {
  console.log('API call to /csv', req.query)
  // retrieve qsp params
  const params: SearchParams = {
    searchType: req.query['search-type'] || SearchType.Keyword,
    selectedWords: req.query['selected-words'] || '',
    excludedWords: req.query['excluded-words'] || '',
    selectedTaxon: req.query['selected-taxon'] || '',
    selectedOrganisation: req.query['selected-organisation'] || '',
    selectedLocale: req.query.lang || '',
    caseSensitive: req.query['case-sensitive'] || false,
    combinator: req.query.combinator || Combinator.All,
    whereToSearch: {
      title: !(req.query['search-in-title'] === 'false'),
      text: !(req.query['search-in-text'] === 'false'),
    },
    areaToSearch: req.query.area || SearchArea.Any,
    linkSearchUrl: req.query['link-search-url'] || '',
  }
  try {
    const data = await sendSearchQuery(params)
    const csvData = csvStringify(data.main)
    res.set('Content-Type', 'text/csv')
    res.send(csvData)
  } catch (e: any) {
    console.log('/csv fail:', JSON.stringify(e))
    res.status(500).send(e)
  }
})

app.get('/taxon', auth('/'), async (req: any, res) => {
  console.log('API call to /taxon', req.query)
  try {
    const data = await getTaxonInfo(req.query.name)
    res.send(data)
  } catch (e: any) {
    if (e.status === 404) {
      res.status(e.status).send(e.message)
    } else {
      res.status(500).send(e.message)
    }
  }
})

app.get('/organisation', auth('/'), async (req: any, res) => {
  console.log('API call to /organisation', req.query)
  try {
    const data = await getOrganisationInfo(req.query.name)
    res.send(data)
  } catch (e: any) {
    if (e.status === 404) {
      res.status(e.status).send(e.message)
    } else {
      res.status(500).send(e.message)
    }
  }
})

app.get('/role', auth('/'), async (req: any, res) => {
  console.log('API call to /role', req.query)
  try {
    const data = await getRoleInfo(req.query.name)
    res.send(data)
  } catch (e: any) {
    res.status(500).send(e)
  }
})

app.get('/bank-holiday', auth('/'), async (req: any, res) => {
  console.log('API call to /bank-holiday', req.query)
  try {
    const data = await getBankHolidayInfo(req.query.name)
    res.send(data)
  } catch (e: any) {
    if (e.status === 404) {
      res.status(e.status).send(e.message)
    } else {
      res.status(500).send(e.message)
    }
  }
})

app.get('/transaction', auth('/'), async (req: any, res) => {
  console.log('API call to /transaction', req.query)
  try {
    const data = await getTransactionInfo(req.query.name)
    res.send(data)
  } catch (e: any) {
    res.status(500).send(e)
  }
})

app.get('/person', auth('/'), async (req: any, res) => {
  console.log('API call to /person', req.query)
  try {
    const data = await getPersonInfo(req.query.name)
    res.send(data)
  } catch (e: any) {
    res.status(500).send(e)
  }
})

// Server setup
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`)
})
