// Import the express in typescript file
import express from 'express';
import { getRoleInfo, getOrganisationInfo, getTaxonInfo, sendSearchQuery, sendInitQuery, getBankHolidayInfo, getPersonInfo } from './neo4j';
// eventually replace with:
// import { getRoleInfo, getOrganisationInfo, getTaxonInfo, sendSearchQuery, sendInitQuery, getBankHolidayInfo, getPersonInfo } from './bigquery';

import { SearchArea, Combinator, SearchType, SearchParams } from './src/ts/search-api-types';

// Initialize the express engine
const app: express.Application = express();

const port: number = process.env.port ? parseInt(process.env.port) : 8080;

app.use(express.static('public'));
app.use(express.json());


// the front-end will call this upon starting to get some data needed from the server
app.get('/get-init-data', async (req, res) => {
  console.log('/get-init-data');
  try {
    res.send(await sendInitQuery());
  } catch (e) {
    console.log('/get-init-data fail:', JSON.stringify(e));
    res.status(500).send(`/get-init-data fail: ${JSON.stringify(e, null, 2)}`);
  }
});


app.get('/search', async (req: any, res) => {
  console.log('API call to /search', req.query);
  // retrieve qsp params
  const params: SearchParams = {
    searchType: req.query['search-type'] || SearchType.Keyword,
    selectedWords: req.query['selected-words'] || '',
    excludedWords: req.query['excluded-words'] || '',
    selectedTaxon: req.query['selected-taxon'] || '',
    selectedLocale: req.query['lang'] || '',
    caseSensitive: req.query['case-sensitive'] || false,
    combinator: req.query['combinator'] || Combinator.Any,
    whereToSearch: {
      title: !(req.query['search-in-title'] === 'false'),
      text: !(req.query['search-in-text'] === 'false')
    },
    areaToSearch: req.query['area'] || SearchArea.Any,
    linkSearchUrl: req.query['link-search-url'] || ''
  };
  try {
    const data = await sendSearchQuery(params);
    res.send(data);
  } catch (e) {
    console.log('/search fail');
    res.status(500).send(`/search fail: ${JSON.stringify(e, null, 2)}`);
  }
});


app.get('/taxon', async (req: any, res) => {
  console.log('API call to /taxon', req.query);
  try {
    const data = await getTaxonInfo(req.query['name']);
    res.send(data);
  } catch (e) {
    res.status(500).send(`/taxon fail: ${JSON.stringify(e, null, 2)}`);
  }
});


app.get('/organisation', async (req: any, res) => {
  console.log('API call to /organisation', req.query);
  try {
    const data = await getOrganisationInfo(req.query['name']);
    res.send(data);
  } catch (e) {
    res.status(500).send(`/organisation fail: ${JSON.stringify(e, null, 2)}`);
  }
});


app.get('/role', async (req: any, res) => {
  console.log('API call to /role', req.query);
  try {
    const data = await getRoleInfo(req.query['name']);
    res.send(data);
  } catch (e) {
    res.status(500).send(`/role fail: ${JSON.stringify(e, null, 2)}`);
  }
});


app.get('/bank-holiday', async (req: any, res) => {
  console.log('API call to /bank-holiday', req.query);
  try {
    const data = await getBankHolidayInfo(req.query['name']);
    res.send(data);
  } catch (e) {
    res.status(500).send(`/bank-holiday: ${JSON.stringify(e, null, 2)}`);
  }
});


app.get('/person', async (req: any, res) => {
  console.log('API call to /person', req.query);
  try {
    const data = await getPersonInfo(req.query['name']);
    res.send(data);
  } catch (e) {
    res.status(500).send(`/person: ${JSON.stringify(e, null, 2)}`);
  }
});


// Server setup
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
