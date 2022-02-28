/* global accessibleAutocomplete */
/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "view" }]*/

import { id, sanitise } from './utils.js';
import { state } from './state.js';
import { handleEvent } from './events.js';

const view = function() {
  const html = [];
  html.push(`
    <main class="govuk-main-wrapper " id="main-content" role="main">
      <h1 class="govuk-heading-xl">Search the GovGraph</h1>`);

  if (state.errorText) {
    html.push(`
      <div class="govuk-error-summary" aria-labelledby="error-summary-title" role="alert" tabindex="-1" data-module="govuk-error-summary">
        <h2 class="govuk-error-summary__title" id="error-summary-title">Error</h2>
        <p class="govuk-body">${state.errorText}</p>
      </div>`)
  }

  html.push(`
        <p class="govuk-body mode-buttons">
          <button class="${state.activeMode==='keyword-search'?'search-active':''} has-tooltip" id="button-select-keyword-search">
            Keyword search
            <p class="tooltip-text">Find pages containing specified terms</p>
          </button>
          <button class="${state.activeMode==='link-search'?'search-active':''} has-tooltip" id="button-select-link-search">
            Link search
            <p class="tooltip-text">Find pages that link to a specific page</p>
          </button>
          <button class="${state.activeMode==='external-search'?'search-active':''} has-tooltip" id="button-select-external-search">
            External page search
            <p class="tooltip-text">Find pages that link to an external URL</p>
          </button>
          <button class="${state.activeMode==='contentid-search'?'search-active':''} has-tooltip" id="button-select-contentid-search">
            Content ID search
            <p class="tooltip-text">Find pages with specified ContentIDs</p>
          </button>
          <button class="${state.activeMode==='cypher-search'?'search-active':''} has-tooltip" id="button-select-cypher-search">
            Cypher search
            <p class="tooltip-text">Enter a Cypher query directly</p>
          </button>
        </p>
        <div class="search-panel">`);

  switch(state.activeMode) {
  case 'keyword-search':
    html.push(`
            <div id="keyword-search-panel">
              <div class="govuk-body">
                <span class="keyword-label has-tooltip">
                  Search for:
                  <p class="tooltip-text">The terms you want to look for. You can use "" to search for expressions (like "health certificate")</p>
                </span>
                <select class="govuk-select" id="and-or">
                  <option name="and" ${state.combinator === 'and' ? 'selected' : ''}>all of</option>
                  <option name="or" ${state.combinator === 'or' ? 'selected' : ''}>any of</option>
                </select>
                <input class="govuk-input" id="keyword" placeholder="eg: cat dog &quot;health certificate&quot;" value='${sanitise(state.selectedWords).replace('"', '&quot;')}'/>
                <span class="keyword-label has-tooltip">
                  Exclude:
                  <p class="tooltip-text">Keywords you want to exclude from your search</p>
                </span>
                <input class="govuk-input" id="excluded-keyword" placeholder="leave blank if no exclusions" value='${sanitise(state.excludedWords).replace('"', '&quot;')}'/>
              </div>
              <div class="kg-checkboxes">
                <div class="kg-checkboxes__item">
                  <input class="kg-checkboxes__input"
                         type="checkbox" id="case-sensitive"
                         ${state.caseSensitive ? 'checked' : ''}/>
                  <label class="kg-label kg-checkboxes__label">Case-sensitive</label>
                </div>
              </div>
              <div id="search-locations-wrapper">
                <span class="has-tooltip">
                  Search in:
                  <p class="tooltip-text">You can search for your keywords in page titles only (faster) or in the full text of pages</p>
                </span>
                <ul class="kg-checkboxes" id="search-locations">
                  <li class="kg-checkboxes__item">
                    <input class="kg-checkboxes__input"
                           type="checkbox" id="search-title"
                           ${state.whereToSearch.title ? 'checked' : ''}/>
                    <label class="kg-label kg-checkboxes__label">Page title</label>
                  </li>
                  <li class="kg-checkboxes__item">
                    <input class="kg-checkboxes__input"
                           type="checkbox" id="search-text"
                           ${state.whereToSearch.text ? 'checked' : ''}/>
                    <label class="kg-label kg-checkboxes__label">Page content</label>
                  </li>
                </ul>
              </div>
              <div id="search-areas-wrapper">
                <span class="has-tooltip">
                  Limit to:
                  <p class="tooltip-text">Limit your search to Mainstream, Whitehall, or anywhere on GOV.UK</p>
                </span>
                <ul class="kg-radios" id="site-areas">
                  <li class="kg-radios__item">
                    <input class="kg-radios__input"
                           type="radio" id="area-mainstream"
                           name="area"
                           ${state.areaToSearch === 'mainstream' ? 'checked' : ''}/>
                    <label class="kg-label kg-radios__label">Mainstream</label>
                  </li>
                  <li class="kg-radios__item">
                    <input class="kg-radios__input"
                           type="radio" id="area-whitehall"
                           name="area"
                           ${state.areaToSearch === 'whitehall' ? 'checked' : ''}/>
                    <label class="kg-label kg-radios__label">Whitehall</label>
                  </li>
                  <li class="kg-radios__item">
                    <input class="kg-radios__input"
                           type="radio" id="area-any"
                           name="area"
                           ${state.areaToSearch === '' ? 'checked' : ''}/>
                    <label class="kg-label kg-radios__label">Anywhere</label>
                  </li>

                </ul>
              </div>
              <div class="govuk-body taxon-facet">
                <label id="taxon-label" class="has-tooltip">Taxon:
                  <p class="tooltip-text">Limit this search to a taxon (and its sub-taxons)</p>
                </label>
                <div id="taxon"></div>
              </div>
              <p class="govuk-body">
                <button
                    class="govuk-button ${state.waiting?'govuk-button--secondary':''}"
                    id="keyword-search">
                  ${state.waiting?'Searching...':'Search'}
                </button>
              </p>
            </div>
      `);
    break;
  case 'contentid-search':
    html.push(`
            <p class="govuk-body">Enter one or more contentIDs:</p>
            <span>For example: ad5110e0-fa62-49d3-923f-d50101f12014, 52feb778-b249-4804-a9c3-dfdc05b7b224</span>

            <div id="contentid-search-panel">
              <p class="govuk-body">
                <textarea class="govuk-textarea" rows="5" id="contentid">${state.contentIds}</textarea>
              </p>
              <p class="govuk-body">
                <button
                    class="govuk-button ${state.waiting?'govuk-button--secondary':''}"
                    id="contentid-search">
                  ${state.waiting?'Searching...':'Search'}
                </button>
              </p>
            </div>
      `);
    break;
  case 'external-search':
    html.push(`
            <p>Enter an external URL to find all pages linking to it</p>
            <div id="external-search-panel">
              <p class="govuk-body">
                <input class="govuk-input govuk-input--width-20" id="external"
                       value="${state.externalUrl}"
                       placeholder="eg: youtu.be"/>
              </p>
              <p class="govuk-body">
                <button
                    class="govuk-button ${state.waiting?'govuk-button--secondary':''}"
                    id="external-search">
                  ${state.waiting?'Searching...':'Search'}
                </button>
              </p>
            </div>
      `);
    break;
  case 'link-search':
    html.push(`
            <p>Enter a URL to find all pages linking to it</p>
            <div id="link-search-panel">
              <p class="govuk-body">
                <input class="govuk-input" id="link-search"
                       value="${state.linkSearchUrl}"
                       placeholder="eg: /maternity-pay-leave"/>
              </p>
              <p class="govuk-body">
                <button
                    class="govuk-button ${state.waiting?'govuk-button--secondary':''}"
                    id="link-search">
                  ${state.waiting?'Searching...':'Search'}
                </button>
              </p>
            </div>
      `);
    break;
  case 'cypher-search':
    html.push(`
            <p>Type a Cypher query:</p>
            <div id="cypher-search-panel">
              <p class="govuk-body">
                <textarea class="govuk-textarea" rows="5" id="cypher">${state.searchQuery}</textarea>
              </p>
              <p class="govuk-body">
                <button
                    class="govuk-button ${state.waiting?'govuk-button--secondary':''}"
                    id="cypher-search">
                  ${state.waiting?'Searching...':'Search'}
                </button>
              </p>
            </div>
      `);
    break;
  default:
    console.log('invalid mode', state.activeMode);
  }

  html.push(`
          </div>
        </div>
      <div id="results">${viewSearchResults(state.activeMode, state.searchResults, state.showFields)}</div>
    </main>
    <p class="govuk-body sig">Brought to you by the Data Labs<br/>Help/problem/feedback: Contact <a href="mailto:max.froumentin@digital.cabinet-office.gov.uk">Max Froumentin</a>`);

  id('page-content').innerHTML = html.join('');

  // adding onclick doesn't work
  document.querySelectorAll('button, input[type=checkbox][data-interactive=true]')
    .forEach(input => input.addEventListener(
      'click',
      event => handleEvent({type: 'dom', id: event.target.getAttribute('id')})));

  // add the accessible autocomplete
  if (id('taxon')) {
    accessibleAutocomplete({
      element: document.querySelector('#taxon'),
      id: 'taxon-label',
      source: state.taxons,
      defaultValue: state.selectedTaxon,
      showAllValues: true
    });
  }
};


const viewSearchResultsTable = function(records, showFields) {
  const html = [];
  const recordsToShow = records.slice(state.skip, state.skip + state.limit);
  html.push('<table class="govuk-table">');
  html.push(`<thead class="govuk-table__head">
      <div id="show-fields-wrapper">
      Show:
      <ul class="kg-checkboxes" id="show-fields">
 `);

  html.push(recordsToShow[0].keys.map(key => `
    <li class="kg-checkboxes__item">
      <input class="kg-checkboxes__input"
             data-interactive="true"
             type="checkbox" id="show-field-${key}"
             ${showFields[key] ? 'checked' : ''}/>
      <label class="kg-label kg-checkboxes__label">${fieldName(key)}</label>
    </li>`).join(''));
  html.push(`
        </ul>
      </div>
    </thead>
    <tbody class="govuk-table__body">
      <tr class="govuk-table__row">`);

  recordsToShow[0].keys.forEach(key => {
    if (state.showFields[key]) {
      html.push(`<th scope="scope" class="govuk-table__header">${fieldName(key)}</th>`);
    }
  });

  recordsToShow.forEach(record => {
    html.push(`<tr class="govuk-table__row">`);

    record._fields.forEach((val, idx) => {
      if (state.showFields[record.keys[idx]]) {
        html.push(`<td class="govuk-table__cell">${fieldFormat(record.keys[idx], val)}</td>`);
      }
    });
    html.push(`</tr>`);
  });
  html.push('</tbody></table>');
  return html.join('');
}


const csvFromResults = function(searchResults) {
  const csv = [];
  if (searchResults && searchResults.records.length > 0) {
    csv.push(searchResults.records[0].keys.join()); // heading
    searchResults.records.forEach(record => {
      const line = [];
      record._fields.forEach(field => {
        if (field) {
          field = field.toString();
          if (field.includes(',')) {
            field = `"${field.replace('"', '""')}"`;
          } else {
            if (field.includes('"')) {
              field = '"' + field.replace('"', '""') + '"';
            }
          }
        } else {
          field = '';
        }
        line.push(field);
      });
      csv.push(line.join());
    });
  }
  return csv.join('\n');
};


const viewSearchResults = function(mode, results, showFields) {
  const html = [];
  if (state.waiting) {
    html.push(`<h2 class="govuk-heading-l">Searching</h2>`);
  } else if (results && results.records.length > 0) {
    const nbRecords = results.records.length;
    html.push(`<h2 class="govuk-heading-l">${nbRecords} Results</h2>`);
    if (nbRecords >= state.limit) {
      html.push(`<p class="govuk-body">Showing ${state.skip + 1} - ${Math.min(nbRecords, state.skip + state.limit)}</p>`);
    }
    html.push(viewSearchResultsTable(results.records, showFields));
    html.push(`
      <p class="govuk-body">
        <button class="govuk-button" id="button-prev-page">Previous</button>
        <button class="govuk-button" id="button-next-page">Next</button>
      </p>`
    );

    const csv = csvFromResults(results);
    const file = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(file); // TODO: use window.URL.revokeObjectURL(url);  after
    html.push(`<p class="govuk-body"><a class="govuk-link" href="${url}" download="export.csv">Save all ${nbRecords} results as a CSV file</a></p>`);

  } else {
    html.push('<h2 class="govuk-heading-l">No results</h2>');
  }

  // Print the cypher query used, for the advanced user
  if (state.searchQuery.length > 0) {
    html.push(`
      <div id="cypher-query">
      <hr/><h2 class="govuk-heading-s">Cypher query used:</h2>
      <pre>${state.searchQuery}</pre>
    `);
  }

  return html.join('');
};



// Remove duplicates - but should be fixed in cypher
const formatNames = array => [...new Set(array)].join(', ')

const fieldFormatters = {
  'name' : { name: 'URL', format: val => `<a href="https://www.gov.uk${val}">${val}</a>` },
  'title': { name: 'Title' },
  'documentType': { name: 'Document type' },
  'publishing_app': { name: 'Publishing app' },
  'first_published_at' : {
    name: 'First published',
    format: val => val.slice(0,-7).replace(' ', '<br/>')
  },
  'public_updated_at' : {
    name: 'Last publicly updated',
    format: val => val.slice(0,-7).replace(' ', '<br/>')
  },
  'taxons' : {
    name: 'Taxons',
    format: formatNames
  },
  'primary_organisation' : {
    name: 'Primary Organisation',
    format: formatNames
  },
  'all_organisations' : {
    name: 'Organisations',
    format: formatNames
  },
  'pagerank' : {
    name: 'Popularity',
    format: val => val.toFixed(2)
  }
};

const fieldName = function(key) {
  const f = fieldFormatters[key];
  return f ? f.name : key;
}

const fieldFormat = function(key, val) {
  const f = fieldFormatters[key];
  return (f && f.format) ? f.format(val) : val;
}


export { view };
