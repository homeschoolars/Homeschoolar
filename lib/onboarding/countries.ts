import { countries } from "countries-list"

export type CountryOption = { code: string; name: string }

export const COUNTRY_OPTIONS: CountryOption[] = Object.entries(countries)
  .map(([code, meta]) => ({ code, name: meta.name }))
  .sort((a, b) => a.name.localeCompare(b.name))
