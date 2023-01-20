import axios from 'axios';
import { MainResult, MetaResult, Person, Organisation, Role, Taxon, BankHoliday, MetaResultType, SearchParams } from './src/ts/search-api-types';
import { splitKeywords } from './src/ts/utils';
import { languageCode } from './src/ts/lang';
import { GetBankHolidayInfoSignature, GetOrganisationInfoSignature, GetPersonInfoSignature, GetRoleInfoSignature, GetTaxonInfoSignature, SendInitQuerySignature, SendSearchQuerySignature } from './db-api-types';
const { BigQuery } = require('@google-cloud/bigquery');

//====== private ======

const bigquery = new BigQuery({
  projectId: 'govuk-knowledge-graph'
});

const bigQuery = async function(userQuery: string, keywords?: string[]) {
  const params: Record<string, string> = {};
  if (keywords) {
    keywords.forEach((keyword: string, index: number) => params[`keyword${index}`] = keyword);
  }

  const options = {
    query: userQuery,
    location: 'europe-west2',
    params
  };

  const [rows] = await bigquery.query(options);

  return rows;
};

//====== public ======

const sendInitQuery: SendInitQuerySignature = async function() {
  let bqLocales, bqTaxons;
  try {
  [ bqLocales, bqTaxons ] = await Promise.all([
    bigQuery(`
      SELECT DISTINCT locale
      FROM \`govuk-knowledge-graph.content.locale\`
    `),
    bigQuery(`
      SELECT title
      FROM \`govuk-knowledge-graph.graph.taxon\`
    `)]);
  } catch(e) {
    console.log('sendInitQueryError', e);
  }

  return {
    locales: ['', 'en', 'cy'].concat(
      bqLocales
        .map((row: any) => row.locale)
        .filter((locale: string) => locale !== 'en' && locale !== 'cy')
      ),
    taxons: bqTaxons.map((taxon: any) => taxon.title)
  };
};

/*
const getTaxonInfo: GetTaxonInfoSignature = async function(name) {
  const [ bqTaxon, bqAncestors, bqChildren ] = await Promise.all([
    bigQuery(`
      SELECT
        title,
        level,
        taxon_levels.homepage_url AS homepage,
        description.description
      FROM graph.taxon
      INNER JOIN content.taxon_levels ON taxon_levels.url = taxon.url
      INNER JOIN content.description ON description.url = taxon_levels.homepage_url
      WHERE taxon.title = '${name}'
      ;
    `),
    bigQuery(`
      SELECT
        taxon_ancestors.ancestor_title AS name,
        taxon_levels.level AS level,
        taxon_levels.homepage_url AS url
      FROM graph.taxon_ancestors
      INNER JOIN content.taxon_levels ON taxon_levels.url = taxon_ancestors.ancestor_url
      WHERE title = '${name}'
      ;
   `),
    bigQuery(`
      SELECT
        child.title AS name,
        taxon_levels.homepage AS url,
        taxon_levels.level AS level
      FROM graph.taxon AS parent
      INNER JOIN graph.has_parent ON has_parent.parent_url = parent.url
      INNER JOIN graph.taxon AS child ON child.url = has_parent.url
      INNER JOIN content.taxon_levels ON taxon_levels.url = child.url
      WHERE parent.title = '${name}'
      ;
    `)
  ]);

  return {
    type: MetaResultType.Taxon,
    name: bqTaxon.title,
    homepage: bqTaxon.homepage,
    description: bqTaxon.description,
    level: parseInt(bqTaxon.level),
    ancestorTaxons: bqAncestors,
    childTaxons: bqChildren
  };
};


const getOrganisationInfo: GetOrganisationInfoSignature = async function(name) {
  const [ bqOrganisation, bqParent, bqChildren, bqPersonRole, bqSuccessor, bqPredecessor ] = await Promise.all([
    bigQuery(`
      SELECT
        page.url AS homepage,
        page.description AS description,
      FROM graph.organisation AS org
      INNER JOIN graph.has_homepage AS hh on hh.url = org.url
      INNER JOIN graph.page on hh.homepage_url = page.url
      WHERE org.title = '${name}'
      ;
   `),
    bigQuery(`
      SELECT parent.title AS parent
      FROM graph.organisation
      INNER JOIN graph.has_parent USING (url)
      INNER JOIN graph.organisation AS parent ON has_parent.parent_url = parent.url
      WHERE organisation.title = '${name}'
      ;
    `),
    bigQuery(`
      SELECT child.title
      FROM graph.organisation AS parent
      INNER JOIN graph.has_parent ON has_parent.parent_url = parent.url
      INNER JOIN graph.organisation AS child ON child.url = has_parent.url
      WHERE parent.title = '${name}'
      ;
    `),
    bigQuery(`
      SELECT person.title AS personName, role.title AS roleName
      FROM graph.organisation AS org
      INNER JOIN graph.belongs_to ON org.url = belongs_to.organisation_url
      INNER JOIN graph.role ON belongs_to.role_url = role.url
      INNER JOIN graph.has_role ON role.url = has_role.role_url
      INNER JOIN graph.person ON has_role.person_url = person.url
      WHERE org.title = '${name}'
      AND has_role.ended_on IS NULL
      ;
    `),
    bigQuery(`
      SELECT successor.title AS title
      FROM graph.organisation
      INNER JOIN graph.has_successor USING (url)
      INNER JOIN graph.organisation AS successor ON has_successor.successor_url = successor.url
      WHERE organisation.title = '${name}'
      ;
    `),
    bigQuery(`
      SELECT organisation.title
      FROM graph.organisation
      INNER JOIN graph.has_successor USING (url)
      INNER JOIN graph.organisation AS successor ON has_successor.successor_url = successor.url
      WHERE successor.title = '${name}'
    `)
  ]);

  return {
    type: MetaResultType.Organisation,
    name,
    description: bqOrganisation[0].description,
    homepage: bqOrganisation[0].homepage,
    parentName: bqParent.title,
    childOrgNames: bqChildren.map((child: any) => child.title),
    personRoleNames: bqPersonRole,
    supersededBy: bqSuccessor.map((successor: any) => successor.title),
    supersedes: bqPredecessor.map((predecessor: any) => predecessor.title)
  };
};


const getBankHolidayInfo: GetBankHolidayInfoSignature = async function(name) {
  const bqBankHoliday = await bigQuery(`
    SELECT
      title AS name,
      ARRAY_AGG(DISTINCT division) AS divisions,
      ARRAY_AGG(DISTINCT date) AS dates
    FROM \`govuk-knowledge-graph.content.bank_holiday\`
    WHERE title = '${name}'
    GROUP BY title
  `);

  return {
    type: MetaResultType.BankHoliday,
    name: bqBankHoliday.name,
    dates: bqBankHoliday.dates.map((date: any) => date.value),
    regions: bqBankHoliday.divisions
  };
};

/*
const getRoleInfo: GetRoleInfoSignature = async function(name) {
  const [ bqRole, bqPersons ] = await Promise.all([
    bigQuery(`
      ...
    `),
    bigQuery(`
      ...
    `)]);

  return {
    type: MetaResultType.Role,
    name: string,
    description: string,
    personNames: {
      name: string,
      homepage: string,
      startDate: Date,
      endDate: Date | null
    }[],
    orgNames: string[]
  };
};


const getPersonInfo: GetPersonInfoSignature = async function(name) {
  const [ bqPerson, bqRoles ] = await Promise.all([
    bigQuery(`
      ...
    `),
    bigQuery(`
      ...
    `)
  ]);

  return {
    type: MetaResultType.Person,
    name: string,
    homepage: string,
    description: string,
    roles: {
      title: string,
      orgName: string,
      orgUrl: string,
      startDate: Date,
      endDate: Date | null
    }[]
  }
};
*/



const sendSearchQuery: SendSearchQuerySignature = async function(searchParams) {
  const keywords = splitKeywords(searchParams.selectedWords);
  const query = buildSqlQuery(searchParams, keywords);
  console.log('query', query);
  const [ bqMainResults /*, bqMetaResults */ ] = await Promise.all([
    bigQuery(query, keywords),
//    bigQuery(`
//      ... // meta query
//    `)
  ]);

  return {
    mainResults: bqMainResults,
    metaResults: [] //MetaResult[]
  }
};


const buildSqlQuery = function(searchParams: SearchParams, keywords: string[]): string {
  const includeClause = [...Array(keywords.length).keys()]
    .map(index => `CONTAINS_SUBSTR(page.title, @keyword${index})`)
    .join(' AND ');

  return `
    SELECT
      url,
      title,
      document_type AS documentType,
      content_id AS contentId,
      locale,
      publishing_app,
      first_published_at,
      public_updated_at,
      withdrawn_at,
      withdrawn_explanation,
      pagerank
    FROM graph.page
    WHERE TRUE
    AND (page.document_type IS NULL
    OR NOT page.document_type IN ('gone', 'redirect', 'placeholder', 'placeholder_person'))
    AND (${includeClause})
    LIMIT 10
  `;
};


export { sendInitQuery, getTaxonInfo, getOrganisationInfo, getBankHolidayInfo, sendSearchQuery };
//export { sendSearchQuery, getTaxonInfo, getOrganisationInfo, getRoleInfo, getPersonInfo, getBankHolidayInfo };
