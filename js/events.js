import { state, searchState } from './state.js';
import { id, sanitise } from './utils.js';
import { view } from './view.js';
import { languageCode } from './lang.js';


//==================================================
// Cypher query methods
//==================================================

const containsClause = function(field, word, caseSensitive) {
  return caseSensitive ?
    `(n.${field} CONTAINS "${word}")`
  :
    `(toLower(n.${field}) CONTAINS toLower("${word}"))`
  ;
}

const multiContainsClause = function(fields, word, caseSensitive) {
  return '(' + fields
    .map(field => containsClause(field, word, caseSensitive))
    .join(' OR ') + ')'
}

const returnClause = function() {
  return `RETURN
    'https://www.gov.uk' + n.name as url,
    n.title AS title,
    n.documentType AS documentType,
    n.contentID AS contentID,
    n.locale AS locale,
    n.publishing_app AS publishing_app,
    n.first_published_at AS first_published_at,
    n.public_updated_at AS public_updated_at,
    n.withdrawn_at AS withdrawn_at,
    n.withdrawn_explanation AS withdrawn_explanation,
    n.pagerank AS pagerank,
    COLLECT (distinct taxon.name) AS taxons,
    COLLECT (distinct o.name) AS primary_organisation,
    COLLECT (distinct o2.name) AS all_organisations
    ORDER BY n.pagerank DESC
    LIMIT ${state.nbResultsLimit}`;
};

const searchQuery = function(state, keywords, exclusions) {
  const fieldsToSearch = [];
  if (state.whereToSearch.title) fieldsToSearch.push('title');
  if (state.whereToSearch.text) fieldsToSearch.push('title', 'description');

  let inclusionClause = '';
  if (keywords.length > 0) {
    inclusionClause = 'WHERE\n' +
    keywords
      .map(word => multiContainsClause(fieldsToSearch, word, state.caseSensitive))
      .join(`\n AND `);
  }

  const exclusionClause = exclusions.length ?
    ('WITH * WHERE NOT ' + exclusions.map(word => multiContainsClause(fieldsToSearch, word, state.caseSensitive)).join(`\n OR `)) : '';

  let areaClause = '';
  if (state.areaToSearch === 'mainstream') {
    areaClause = 'WITH * WHERE n.publishing_app = "publisher"';
  } else if (state.areaToSearch === 'whitehall') {
    areaClause = 'WITH * WHERE n.publishing_app = "whitehall"';
  }

  let localeClause = '';
  if (state.selectedLocale !== '') {
    localeClause = `WITH * WHERE n.locale = "${languageCode(state.selectedLocale)}"\n`
  }

  const taxon = state.selectedTaxon;
  const taxonClause = taxon ? `WITH n
    MATCH (n:Cid)-[:IS_TAGGED_TO]->(taxon:Taxon)
    MATCH (taxon:Taxon)-[:HAS_PARENT*]->(ancestor_taxon:Taxon)
    WHERE taxon.name = "${taxon}" OR ancestor_taxon.name = "${taxon}"` :
    `OPTIONAL MATCH (n:Cid)-[:IS_TAGGED_TO]->(taxon:Taxon)`;

  let linkClause = '';

  if (state.linkSearchUrl.length > 0) {
    // We need to determine if the link is internal or external
    const internalLinkRexExp = /^((https:\/\/)?((www\.)?gov\.uk))?\//;
    if (internalLinkRexExp.test(state.linkSearchUrl)) {
      linkClause = `
        WITH n, taxon
        MATCH (n:Cid)-[:HYPERLINKS_TO]->(n2:Cid)
        WHERE n2.name = "${state.linkSearchUrl.replace(internalLinkRexExp, '/')}"`
    } else {
      linkClause = `
        WITH n, taxon
        MATCH (n:Cid) -[:HYPERLINKS_TO]-> (e:ExternalPage)
        WHERE e.name CONTAINS "${state.linkSearchUrl}"`
    }
  }

  return `
    MATCH (n:Cid)
    ${inclusionClause}
    ${exclusionClause}
    ${localeClause}
    ${areaClause}
    ${taxonClause}
    ${linkClause}
    OPTIONAL MATCH (n:Cid)-[r:HAS_PRIMARY_PUBLISHING_ORGANISATION]->(o:Organisation)
    OPTIONAL MATCH (n:Cid)-[:HAS_ORGANISATIONS]->(o2:Organisation)
    ${returnClause()}`;
};


const splitKeywords = function(keywords) {
  const regexp = /[^\s,"]+|"([^"]*)"/gi;
  const output = [];
  let match;
  do {
    match = regexp.exec(keywords);
    if (match) {
        output.push(match[1] ? match[1] : match[0]);
    }
  } while (match);
  return output;
};


const searchButtonClicked = async function() {

  // update the state from the form
  window.scrollTo(0, 0);
  state.errorText = null;
  state.userErrors = null;
  const searchStatus = searchState();
  switch(searchStatus.code) {
  case 'ready-to-search':
    if (state.selectedWords !== '' || state.selectedLocale !== '' || state.selectedTaxon !== '' || state.linkSearchUrl !== '') {
      state.waiting = true;
      const keywords = splitKeywords(state.selectedWords)
            .filter(d=>d.length>0);
      const excludedKeywords = splitKeywords(state.excludedWords)
            .filter(d=>d.length>0);
      state.searchQuery = searchQuery(state, keywords, excludedKeywords);
      state.waiting = true;
      queryGraph(state.searchQuery);
    }
    break;
  case 'error':
    state.userErrors = searchStatus.errors;
    break;
  case 'waiting':
  case 'initial':
  case 'no-results':
  case 'results':
    break;
  default:
    console.log('unknown value for searchState', searchState());
    break;
  }
};


const queryGraph = async function(query) {
  state.neo4jSession
    .run(query)
    .then(result => handleEvent({type:'neo4j-callback-ok', result}))
    .catch(error => handleEvent({type:'neo4j-callback-fail', error}));
  handleEvent({type: 'neo4j-running'});
};


const handleEvent = async function(event) {
  let fieldClicked;
  console.log('handleEvent:', event.type, event.id)
  switch(event.type) {
    case "dom":
      switch(event.id) {
      case 'search':
        state.selectedWords = sanitise(id('keyword').value);
        state.excludedWords = sanitise(id('excluded-keyword').value);
        state.selectedTaxon = sanitise(id('taxon').value);
        state.selectedLocale = sanitise(id('locale').value);
        state.whereToSearch.title = id('search-title').checked;
        state.whereToSearch.text = id('search-text').checked;
        state.caseSensitive = id('case-sensitive').checked;
        state.linkSearchUrl = sanitise(id('link-search').value);
        state.skip = 0; // reset to first page
        if (id('area-mainstream').checked) state.areaToSearch = 'mainstream';
        if (id('area-whitehall').checked) state.areaToSearch = 'whitehall';
        if (id('area-any').checked) state.areaToSearch = 'any';
        state.searchResults = null;
        searchButtonClicked();
        break;
      case 'clear-filters':
        state.selectedWords = '';
        state.excludedWords = '';
        state.selectedTaxon = '';
        state.selectedLocale = '';
        state.whereToSearch.title = false;
        state.whereToSearch.text = false;
        state.caseSensitive = false;
        state.linkSearchUrl = '';
        state.skip = 0; // reset to first page
        state.showFields = { url: true, title: true };
        state.areaToSearch = '';
        state.searchResults = null;
        state.searchQuery = '';
        state.waiting = false;
        state.infoPopupHtml = null;
        break;
      case 'button-next-page':
        state.skip = state.skip + state.resultsPerPage;
        updateUrl();
        break;
      case 'button-prev-page':
        state.skip = Math.max(state.skip - state.resultsPerPage, 0);
        updateUrl();
        break;
      default:
        fieldClicked = event.id.match(/show-field-(.*)/);
        if (fieldClicked) {
          state.showFields[fieldClicked[1]] = id(event.id).checked;
        } else {
          console.log('unknown DOM event received:', event);
        }
      }
    break;

  // non-dom events
  case 'neo4j-running':
    state.waiting = true;
    break;
  case 'neo4j-callback-ok':
    state.searchResults = event.result;
    state.waiting = false;
    state.errorText = null;
    break;
  case 'neo4j-callback-fail':
    state.searchResults = null;
    state.waiting = false;
    state.errorText = 'There was a problem querying the GovGraph. Please contact the Data Labs.';
    console.log('neo4j-callback-fail:', event.error);
    break;
  default:
    console.log('unknown event type:', event);
  }
  updateUrl();
  view();

  // scroll to the top of the page when paginating
  if (event.id === 'button-next-page' || event.id === 'button-prev-page') {
    window.scrollTo(0, 0);
  }
};


const updateUrl = function() {
  if ('URLSearchParams' in window) {
    var searchParams = new URLSearchParams();

    if (state.selectedWords !== '') searchParams.set('selected-words', state.selectedWords);
    if (state.excludedWords !== '') searchParams.set('excluded-words', state.excludedWords);
    if (state.selectedTaxon !== '') searchParams.set('selected-taxon', state.selectedTaxon);
    if (state.selectedLocale !== '') searchParams.set('lang', languageCode(state.selectedLocale));
    if (state.caseSensitive) searchParams.set('case-sensitive', state.caseSensitive);
    if (state.whereToSearch.title) searchParams.set('search-in-title', 'true');
    if (state.whereToSearch.text) searchParams.set('search-in-text', 'true');
    if (state.areaToSearch.length > 0) searchParams.set('area', state.areaToSearch);
    if (state.linkSearchUrl !== '') searchParams.set('link-search-url', state.linkSearchUrl);

    let newRelativePathQuery = window.location.pathname;
    if (searchParams.toString().length > 0) {
      newRelativePathQuery += '?' + searchParams.toString();
    }
    history.pushState(null, '', newRelativePathQuery);
  }
}


export {
  handleEvent,
  searchButtonClicked
};
