describe('Keyword searching', () => {
  let numUnfilteredResults: number;
  it('returns nothing when just clicking Search', () => {
    cy.visit('');
    cy.get('button#search').click();
    cy.get('ul#show-fields').should('not.exist');
    cy.get('table#results-table').should('not.exist');
  });

  it('returns no results when no keywords match', () => {
    cy.visit('');
    cy.get('input#keyword').type('wwekufsskjfdksufweuf');
    cy.get('button#search').click();
    cy.contains('button', 'Searching');
    cy.get('#results-heading', { timeout: 60000 }).contains('No results');
    cy.title().should('eq', 'GOV.UK pages that contain "wwekufsskjfdksufweuf" - GovGraph search')
  });

  it('returns results when searching for keywords that exist', () => {
    cy.visit('');
    cy.get('input#keyword').type('Churchill');
    cy.get('button#search').click();
    cy.contains('button', 'Searching');
    cy.get('#results-heading', { timeout: 60000 }).contains(/^\d+ results$/);
    cy.get('#results-heading').then(heading => {
      numUnfilteredResults = parseInt(heading.text().match(/^(\d+) results$/)[1]);
    });
    cy.contains('for pages that contain');
    cy.contains('Showing results 1 to 10, in descending popularity');
    cy.get('#results-table');
    cy.title().should('eq', 'GOV.UK pages that contain "Churchill" - GovGraph search')
  });

  it('returns results when searching in title only', () => {
    cy.visit('');
    cy.get('input#keyword').type('Churchill');
    cy.get('.govuk-details__summary').click();
    cy.get('#search-text').uncheck();
    cy.get('button#search').click();
    cy.contains('button', 'Searching');
    cy.get('#results-heading', { timeout: 60000 }).contains(/^\d+ results$/);
    cy.get('#results-heading').then(heading => {
      const numTitleOnlyResults = parseInt(heading.text().match(/^(\d+) results$/)[1]);
      expect(numTitleOnlyResults).to.be.lessThan(numUnfilteredResults);
    });
    cy.contains('in their title');
    cy.get('#results-table');
  });

  it('returns results when searching in body only', () => {
    cy.visit('');
    cy.get('input#keyword').type('Churchill');
    cy.get('.govuk-details__summary').click();
    cy.get('#search-title').uncheck();
    cy.get('button#search').click();
    cy.contains('button', 'Searching');
    cy.get('#results-heading', { timeout: 60000 }).contains(/^\d+ results$/);
    cy.get('#results-heading').then(heading => {
      const numBodyOnlyResults = parseInt(heading.text().match(/^(\d+) results$/)[1]);
      expect(numBodyOnlyResults).to.be.lessThan(numUnfilteredResults);
    });
    cy.contains('in their body content');
    cy.get('#results-table');
  });

  it('shows an error when unchecking both body and title', () => {
    cy.visit('');
    cy.get('input#keyword').type('Churchill');
    cy.get('.govuk-details__summary').click();
    cy.get('#search-title').uncheck();
    cy.get('#search-text').uncheck();
    cy.get('button#search').click();
    cy.title().should('eq', 'GovGraph search')
    cy.get('div.govuk-error-summary');
    cy.contains('There is a problem');
    cy.contains('You need to select a keyword location');
  });

  it('returns results when searching for \'education\' everywhere', () => {
    cy.visit('');
    cy.get('input#keyword').type('education');
    cy.get('.govuk-details__summary').click();
    cy.get('button#search').click();
    cy.contains('button', 'Searching');
    cy.get('#results-heading', { timeout: 60000 }).contains(/^\d+ results$/);
    cy.get('#results-heading').then(heading => {
      numUnfilteredResults = parseInt(heading.text().match(/^(\d+) results$/)[1]);
    });
    cy.get('#results-table');
    cy.title().should('eq', 'GOV.UK pages that contain "education" - GovGraph search')
  });

  it('returns fewer results when searching in Publisher only', () => {
    cy.visit('');
    cy.get('input#keyword').type('education');
    cy.get('.govuk-details__summary').click();
    cy.get('#search-text').uncheck();
    cy.get('#area-publisher').check();
    cy.get('button#search').click();
    cy.contains('button', 'Searching');
    cy.get('#results-heading', { timeout: 60000 }).contains(/^\d+ results$/);
    cy.get('#results-heading').then(heading => {
      const numPublisherResults = parseInt(heading.text().match(/^(\d+) results$/)[1]);
      expect(numPublisherResults).to.be.lessThan(numUnfilteredResults);
    });
    cy.contains('in their title');
    cy.get('#results-table');
    cy.title().should('eq', 'GOV.UK pages that contain "education" in their title and are published using "publisher" - GovGraph search')
  });

  it('returns fewer results when searching in Whitehall only', () => {
    cy.visit('');
    cy.get('input#keyword').type('education');
    cy.get('.govuk-details__summary').click();
    cy.get('#search-text').uncheck();
    cy.get('#area-whitehall').check();
    cy.get('button#search').click();
    cy.contains('button', 'Searching');
    cy.get('#results-heading', { timeout: 60000 }).contains(/^\d+ results$/);
    cy.get('#results-heading').then(heading => {
      const numWhitehallResults = parseInt(heading.text().match(/^(\d+) results$/)[1]);
      expect(numWhitehallResults).to.be.lessThan(numUnfilteredResults);
    });
    cy.contains('in their title');
    cy.get('#results-table');
    cy.title().should('eq', 'GOV.UK pages that contain "education" in their title and are published using "whitehall" - GovGraph search')
  });

  it('returns no results when doing an empty case-sensitive search', () => {
    cy.visit('');
    cy.get('input#keyword').type('edUcatIon');
    cy.get('.govuk-details__summary').click();
    cy.get('#search-text').uncheck();
    cy.get('#case-sensitive').check();
    cy.get('button#search').click();
    cy.contains('button', 'Searching');
    cy.get('#results-heading', { timeout: 60000 }).contains('No results');
    cy.title().should('eq', 'GOV.UK pages that contain "edUcatIon" in their title - GovGraph search')
  });

  it('returns results when doing an "any keywords" search', () => {
    cy.visit('');
    cy.get('input#keyword').type('sunak disraeli');
    cy.get('.govuk-details__summary').click();
    cy.get('#search-text').uncheck();
    cy.get('#combinator-any').check();
    cy.get('button#search').click();
    cy.contains('button', 'Searching');
    cy.get('#results-heading', { timeout: 60000 }).contains(/^\d+ results$/);
    cy.get('#results-table');
    cy.title().should('eq', 'GOV.UK pages that contain "sunak" or "disraeli" in their title - GovGraph search')
  });

  it('returns no results when doing an empty "all keywords" search', () => {
    cy.visit('');
    cy.get('input#keyword').type('sunak disraeli');
    cy.get('.govuk-details__summary').click();
    cy.get('#search-text').uncheck();
    cy.get('#combinator-all').check();
    cy.get('button#search').click();
    cy.contains('button', 'Searching');
    cy.get('#results-heading', { timeout: 60000 }).contains('No results');
    cy.title().should('eq', 'GOV.UK pages that contain "sunak" and "disraeli" in their title - GovGraph search')
  });
});
