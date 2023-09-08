interface PaginationOptions {
  defaultResultsPerPage: number
  options: number[]
  maxResultsBeforeScrolling: number
}

interface FrontendConfig {
  enableHMR: boolean
  pagination: PaginationOptions
  featureFlags: {
    [key: string]: boolean
  }
}

const config: FrontendConfig = {
  /* global buildConfig */ // buildConfig is hardcoded by webpack at build time
  enableHMR: buildConfig.ENABLE_HMR,
  pagination: {
    defaultResultsPerPage: 20,
    options: [10, 20, 50, 100, 200],
    maxResultsBeforeScrolling: 20,
  },
  featureFlags: {
    enableInfoBox: false,
  },
}

export default config