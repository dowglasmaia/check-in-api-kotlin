export { TestScenarios } from './data-access/test-data.api';
export type { Scenario, ScenarioSearchType, TestPassenger } from './data-access/test-data.api';

/** Router navigation state key used to hand a scenario to the search page (kept out of the URL). */
export const SCENARIO_PREFILL_STATE = 'scenarioPrefill';

export interface ScenarioPrefill {
  searchType: 'FLIGHT_NUMBER' | 'BOOKING_CODE' | 'DOCUMENT';
  value: string;
}
