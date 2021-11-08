/* global neo4j, makeViz */

const state = {
  user: '',
  password: '',
  server: '',
  statusText: 'starting',
  neo4jSession: null,
  combinator: 'and', // or 'or'
  selectedWords: '',
  excludedWords: '',
  contentIds: '',
  searchResults: null,
  showFields: {
    contentId: true,
    documentType: true
  },
  activeMode: 'keyword-search' // or 'contentid-search'
};


const contentIdSearchButtonClicked = async function() {
  const contentIds = state.contentIds
    .split(/[^a-zA-Z0-9-]+/)
    .filter(d=>d.length>0)
    .map(s => s.toLowerCase());
  const whereStatement = contentIds.map(cid => `n.contentID="${cid}" `).join(' OR ');
  const query = `match (n:Cid) where ${whereStatement} return
    "https://www.gov.uk"+n.name AS url,
    n.name AS slug,
    n.title,
    n.documentType,
    n.contentID,
    n.publishing_app,
    n.first_published_at AS first_published_at,
    n.public_updated_at AS last_updated`;
  console.log(query);
  state.searchResults = await state.neo4jSession.run(query);
};


const searchButtonClicked = async function() {
  if (state.selectedWords.length < 3) {
    state.statusText = 'Word too short';
    return;
  }

  const keywords = state.selectedWords
    .split(/[,;\s]+/)
    .filter(d=>d.length>0)
    .map(s => s.toLowerCase());

  const excludedKeywords = state.excludedWords
    .split(/[,;\s]+/)
    .filter(d=>d.length>0)
    .map(s => s.toLowerCase());

  const query = buildQuery(keywords, excludedKeywords, state.combinator);

  state.searchResults = await state.neo4jSession.run(query);
};


const handleEvent = async function(e) {
  switch(e.target.getAttribute('id')) {
  case "keyword-search":
    state.selectedWords = id('keyword').value;
    state.excludedWords = id('excluded-keyword').value;
    state.combinator = id('and-or').selectedIndex == 0 ? 'AND' : 'OR';
    await searchButtonClicked();
    break;
  case "contentid-search":
    state.contentIds = id('contentid').value;
    await contentIdSearchButtonClicked();
    break;
  case "clear":
    state.searchResults = null;
    break;
  case "show-contentid":
    state.showFields.contentId = id('show-contentid').checked;
    break;
  case "show-doctype":
    state.showFields.documentType = id('show-doctype').checked;
    break;
  case 'button-select-keyword-search':
    state.activeMode = 'keyword-search';
    break;
  case 'button-select-contentid-search':
    state.activeMode = 'contentid-search';
    break;
  default:
    console.log('unknown event received:', e);
  }
  view();
};


const view = function() {
  const html = [];
  html.push(`
    <main class="govuk-main-wrapper " id="main-content" role="main">
      <h1 class="govuk-heading-xl">Search the Knowledge Graph</h1>
      <p class="govuk-body"><span>Status: </span>${state.statusText}</p>

      <p class="govuk-body mode-buttons">
        <button class="${state.activeMode==='keyword-search'?'search-active':''}"
                id="button-select-keyword-search">Keyword search</button>
        <button class="${state.activeMode==='contentid-search'?'search-active':''}"
                id="button-select-contentid-search">Content ID search</button>
      </p>
      <div class="search-panel">`);

  switch(state.activeMode) {
    case 'keyword-search':
    html.push(`
          <div class="govuk-form-group" id="keyword-search-panel">
            <p class="govuk-body">
             Type keywords to find pages with title containing<br/>
              <select class="govuk-select" id="and-or">
                <option name="and" ${state.combinator === 'and' ? 'selected' : ''}>all the words</option>
                <option name="or" ${state.combinator === 'or' ? 'selected' : ''}>any of the words</option>
              </select>
              <input class="govuk-input govuk-input--width-10" id="keyword" value="${state.selectedWords}"/>

            <br/>but not:

              <input class="govuk-input govuk-input--width-10" id="excluded-keyword" placeholder="leave blank if no exclusions" value="${state.excludedWords}"/>


              <button class="govuk-button" id="keyword-search"
                onclick="handleEvent">Search</button>
            </p>
          </div>
    `);
    break;
    case 'contentid-search':
    html.push(`
          <p>Enter one of multiple contentIDs:</p>
          <div class="govuk-form-group" id="contentid-search-panel">
            <p class="govuk-body">
              <textarea class="govuk-textarea" rows="5" id="contentid">${state.contentIds}</textarea>
            </p>
            <p class="govuk-body">
              <button class="govuk-button" id="contentid-search" onclick="handleEvent">Search</button>
            </p>
          </div>
    `);
    break;
  }

  html.push(`
      </div>
      <div id="results">${viewSearchResults(state.searchResults)}</div>
    </main>
  `);
  id('page-content').innerHTML = html.join('');


  // adding onclick doesn't work
  document.querySelectorAll('button, input[type=checkbox]')
    .forEach(input => input.addEventListener('click', handleEvent))
};




const id = x => document.getElementById(x);

const buildQuery = function(keywords, exclusions, operator) {
  const inclusionClause = 'WHERE\n' +
    keywords.map(word => `n.title =~ '(?i).*\\\\b${word}\\\\b.*'`).join(`\n ${operator} `);
  const exclusionClause = exclusions.length ?
    ('WITH * WHERE NOT ' + exclusions.map(word => `n.title =~ '(?i).*\\\\b${word}\\\\b.*'`).join(`\n $OR `)) : '';

  return `MATCH
(n:Cid)-[r:HAS_PRIMARY_PUBLISHING_ORGANISATION]->(o:Organisation)
MATCH
(n:Cid)-[:HAS_ORGANISATIONS]->(o2:Organisation)
${inclusionClause}
${exclusionClause}
RETURN
"https://www.gov.uk"+n.name AS url,
n.name AS slug,
n.title,
n.documentType,
n.contentID,
n.publishing_app,
n.first_published_at AS first_published_at,
n.public_updated_at AS last_updated,
COLLECT
(o.name) AS primary_organisation,
COLLECT
(o2.name) AS all_organisations, n.pagerank AS popularity
ORDER BY n.pagerank DESC;`
};


const viewSearchResults = function(results) {
  const html = [];
  if (results) {

    html.push('<table class="govuk-table">');
    html.push(`<thead class="govuk-table__head">
      ${results.records.length} results<br/>
      <div id="show-fields-wrapper">
      Show:
        <ul class="kg-checkboxes" id="show-fields" onclick="handleEvent">
          <li class="kg-checkboxes__item">
            <input class="kg-checkboxes__input"
                   type="checkbox" id="show-contentid"
                   ${state.showFields.contentId ? 'checked' : ''}/>
            <label class="kg-label kg-checkboxes__label">content ID</label>
          </li>
          <li class="kg-checkboxes__item">
            <input class="kg-checkboxes__input"
                   type="checkbox" id="show-doctype"
                   ${state.showFields.documentType ? 'checked' : ''}/>
            <label class="kg-label kg-checkboxes__label">Document type</label>
          </li>
        </ul>
        <button class="govuk-button" id="clear">Clear results</button>
      </div>
    </thead>
    <tbody class="govuk-table__body">`);
    html.push(`<tr class="govuk-table__row"><th scope="row" class="govuk-table__header">Title</th>`);
    if (state.showFields.contentId) html.push('<th scope="row" class="govuk-table__header">ContentID</th>');
    if (state.showFields.documentType) html.push('<th scope="row" class="govuk-table__header">Type</th>');
    html.push(`</tr>`);


    results.records.forEach(record => {
      let dict = {};
      record.keys.forEach((key, index) => dict[key] = record._fields[index]);

      html.push(`<tr class="govuk-table__row"><td class="govuk-table__cell"><a href="${dict.url}">${dict['n.title']}</a></td>`);
      if (state.showFields.contentId) html.push(`<td class="govuk-table__cell">${dict['n.contentID']}</td>`);
      if (state.showFields.documentType) html.push(`<td class="govuk-table__cell">${dict['n.documentType']}</td>`);
      html.push('</th>');
    });

    html.push('</tbody></table>');
  }

  return html.join('');
};



const init = async function() {
  // First, look if there's a file with authentication params
  await fetch('params.json')
    .then(async response => {
      const data = await response.json();

      state.server = data.server;
      state.user = data.user;
      state.password = data.password;
      state.neo4jDriver = neo4j.driver(state.server, neo4j.auth.basic(state.user, state.password));
      state.statusText = 'starting session';
      state.neo4jSession = state.neo4jDriver.session();
      state.statusText = 'ready';
    }).catch(error => {
      console.warn(error);
      state.statusText('failed to retrieve credentials');
    });
};

(async () => {
  await init();
  view();
})();


/*

      <details class="govuk-details" data-module="govuk-details">
        <summary class="govuk-details__summary">
          <span class="govuk-details__summary-text">Explore</span>
        </summary>
        <div class="govuk-details__text">
          <svg id=graph width=500 height=500></svg>
        </div>
      </details>

      <details class="govuk-details" data-module="govuk-details">
        <summary class="govuk-details__summary">
          <span class="govuk-details__summary-text">Settings</span>
        </summary>
        <div class="govuk-details__text">
          <p class="govuk-body">
            <span>Server URI:</span>
            <input class="govuk-input" id="uri"/>
          </p>
          <p class="govuk-body">user: <input class="govuk-input" id="user"/></p>
          <p class="govuk-body">password: <input class="govuk-input" id="password" type="password"/></p>
          <button class="govuk-button" id="connect-button">Connect</button>
          </div>
        </div>
      </details>
*/
