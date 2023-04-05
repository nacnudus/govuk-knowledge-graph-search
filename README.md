# Gov Search (frontend)

Gov Search is a search engine for GOV.UK, with advanced functionality for
content designers. This repository includes the code of the GovSearch front-end.

This is an ExpressJS application written in TypeScript. It shows the user a
search interface and queries the backend to fetch and display search results.

The full documentation is available in the [Data Community Tech
Docs](https://docs.data-community.publishing.service.gov.uk).

# Running locally

- clone this repository
- run `npm install` to install all dependencies
- Install [Sass](https://sass-lang.com/install) and compile the Sass sources to CSS with

    cd src/browese/scss
    sass main.scss > ../../../public/main.css

- Install [webpack](https://webpack.js.org/) and compile the browser-side Typescript code to JavaScript by just running `webpack`

- set an environment variable called PROJECT_ID to the name of the GCP project
  your server will be running on. This is so the server knows where to connect
  to to run searches get the data. For instance, use `govuk-knowledge-graph-dev`
  to get the data from the development backend.

- set an environment variable called `DISABLE_AUTH` to any value, as you won't
  need authentication on your local machine

- Start the server with `npm run dev`.

- Point your browser to `https://localhost:8080` (the port can be changed using the `PORT` environment variable)

# Developing

## Files

- `app.ts`: the main server file. All the other server-side source files in `src/server`.

- `src/browser/ts/*.ts`: the main browser-side files. `webpack` compiles everything to `/public/main.js`.

- `src/common/*.ts`: TS source files that are used by both server and browser code.

- `src/browser/scss/main.scss`: the Sass file that `sass` compiles to `/public/main.css`

- `public/assets`: fonts and images

- `views/index.html`: the HTML source file sent to the browser




## Software architecture

Mostly for historical reasons, much of the functionality offered runs browser-side. That's why the application is more JavaScript-heavy than your usual `alphagov` app. Although the JavaScript code is generated from TypeScript sources, it doesn't use any framework like React.

The browser-side code uses the [Elm Architecture](https://elmprogramming.com/elm-architecture-intro.html) model: the whole application's state is held in a variable called `state`, and a function called `view` renders the HTML that corresponds to the current value of `state`, and sets event handlers on that HTML. Whenever an event happens (user clicks on a button, or a search returns) the `handleEvent` function updates the state accordingly and runs `view` again. This forms the main interaction loop. For instance:

- The user enters search terms and clicks "search"
- The DOM event handler (defined in `view.ts`) triggered runs `handleEvent`, which:
  - retrieves the new search terms from the form
  - and updates the state (specifically `state.selectedKeywords`) with the new values
  - starts the search in BigQuery via the API offered by the ExpressJS server.
  - and meanwhile calls view to show the "Please wait" message.
- Eventually the API call returns and triggers `handleEvent`, which updates
  `state` with the search results
- `handleEvent` also calls `view`
- `view` renders the state, including the search results.
- The page waits for the next event
etc.

## Running tests

# end-to-end tests

We use [Cypress](https://docs.cypress.io), which is installed automatically on installing the `dev` npm packages. If Chrome is installed on your system it should be as simple as running `npx cypress open` for the interactive version and `npx cypress run` for the command-line version.

To run a single test file , use `--spec`. For instance:

    cypress run --spec cypress/e2e/url.cy.ts
