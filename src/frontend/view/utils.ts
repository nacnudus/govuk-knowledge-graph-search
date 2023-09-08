import { languageName } from '../../common/utils/lang'
import { state } from '../state'

export const formatNames = (array: []) =>
  [...new Set(array)].map((x) => `“${x}”`).join(', ')

export const formatDateTime = (date: any) =>
  date?.value
    ? `${date.value.slice(0, 10)} at ${date.value.slice(11, 16)}`
    : 'n/a'

const splitKeywords = function (keywords: string): string[] {
  const wordsToIgnore = ['of', 'for', 'the', 'or', 'and']
  const regexp = /[^\s,"]+|"([^"]*)"/gi
  const output = []
  let match: RegExpExecArray | null
  do {
    match = regexp.exec(keywords)
    if (match) {
      output.push(match[1] ? match[1] : match[0])
    }
  } while (match)
  return output.filter((d) => d.length > 0 && !wordsToIgnore.includes(d))
}

const formatOccurrences = (obj: any) =>
  obj && Object.values(obj)?.length > 1
    ? `Total (${Object.values(obj).reduce(
        (partialSum: any, a: any) => partialSum + a,
        0
      )}),
      ${Object.values(obj)
        .map(
          (x, i) =>
            `${splitKeywords(state.searchParams.selectedWords)[i]} (${x})`
        )
        .join(', ')}`
    : `${obj}`

export const fieldFormatters: Record<string, any> = {
  url: {
    name: 'URL',
    format: (url: string) => `<a class="govuk-link" href="${url}">${url}</a>`,
  },
  title: { name: 'Title' },
  locale: { name: 'Language', format: languageName },
  documentType: { name: 'Document type' },
  contentId: { name: 'Content ID' },
  publishing_app: { name: 'Publishing app' },
  first_published_at: {
    name: 'First published',
    format: formatDateTime,
  },
  public_updated_at: {
    name: 'Last major update',
    format: formatDateTime,
  },
  taxons: {
    name: 'Taxons',
    format: formatNames,
  },
  primary_organisation: {
    name: 'Primary publishing organisation',
    format: (x: string) => x,
  },
  all_organisations: {
    name: 'All publishing organisations',
    format: formatNames,
  },
  page_views: {
    name: 'Views (7days)',
    format: (val: string) => (val ? parseInt(val).toString() : '<5'),
  },
  withdrawn_at: {
    name: 'Withdrawn at',
    format: (date: string) => (date ? formatDateTime(date) : 'not withdrawn'),
  },
  withdrawn_explanation: {
    name: 'Withdrawn reason',
    format: (text: string) => text || 'n/a',
  },
  occurrences: {
    name: 'Occurrences',
    format: formatOccurrences,
  },
}

export const fieldName = function (key: string) {
  const f = fieldFormatters[key]
  return f ? f.name : key
}

export const fieldFormat = function (
  key: string,
  val: string | number
): string {
  const f = fieldFormatters[key]
  return f && f.format ? f.format(val) : val
}
