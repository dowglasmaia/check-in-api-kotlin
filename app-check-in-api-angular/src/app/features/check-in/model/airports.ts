/** Reference data only: the API sends IATA codes, not city names. Unknown codes show no city. */
const CITIES: Readonly<Record<string, string>> = {
  GRU: 'São Paulo',
  CGH: 'São Paulo',
  GIG: 'Rio de Janeiro',
  SSA: 'Salvador',
  JFK: 'New York',
  MIA: 'Miami',
  LHR: 'London',
  LIS: 'Lisbon',
  MAD: 'Madrid',
  CDG: 'Paris',
};

export function cityOf(iataCode: string): string {
  return CITIES[iataCode] ?? '';
}
