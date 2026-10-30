import { SearchType } from '../data-access/checkin.dto';

export interface SearchTypeConfig {
  type: SearchType;
  tabLabel: string;
  tabIcon: string;
  label: string;
  icon: string;
  placeholder: string;
  hint: string;
  formatError: string;
  tips: string[];
  /** Cleans the typed value the way it must be sent to the API. */
  normalize(raw: string): string;
  isValid(normalized: string): boolean;
}

const stripSpaces = (raw: string) => raw.replace(/\s+/g, '').toUpperCase();

export const SEARCH_TYPES: Readonly<Record<SearchType, SearchTypeConfig>> = {
  FLIGHT_NUMBER: {
    type: 'FLIGHT_NUMBER',
    tabLabel: 'Flight number',
    tabIcon: 'airplane',
    label: 'Flight number',
    icon: 'airplane-tilt',
    placeholder: 'e.g. MF 214',
    hint: 'Two letters followed by 2–4 digits.',
    formatError: 'Flight numbers look like MF 214 — two letters and 2–4 digits.',
    tips: [
      'Flight numbers look like MF 214 — two letters and 2–4 digits.',
      'Check for typos or swapped characters (0 and O, 1 and I).',
    ],
    normalize: stripSpaces,
    isValid: (value) => /^[A-Z]{2}\d{2,4}$/.test(value),
  },
  BOOKING_CODE: {
    type: 'BOOKING_CODE',
    tabLabel: 'Booking code',
    tabIcon: 'ticket',
    label: 'Booking code',
    icon: 'ticket',
    placeholder: 'e.g. MAIA7K',
    hint: '6 letters or digits, found in your confirmation email.',
    formatError: 'A booking code has 6 letters or digits, like MAIA7K.',
    tips: [
      'A booking code has 6 letters or digits, like MAIA7K.',
      'Check for typos or swapped characters (0 and O, 1 and I).',
    ],
    normalize: stripSpaces,
    isValid: (value) => /^[A-Z0-9]{6}$/.test(value),
  },
  DOCUMENT: {
    type: 'DOCUMENT',
    tabLabel: 'Document',
    tabIcon: 'identification-card',
    label: 'Personal document',
    icon: 'identification-card',
    placeholder: 'e.g. 123.456.789-09',
    hint: 'The ID or passport used when booking.',
    formatError: 'Use the same document you registered at booking, 6–20 characters.',
    tips: [
      'Use the same document you registered at booking, 6–20 characters.',
      'Check for typos or swapped characters (0 and O, 1 and I).',
    ],
    // The API matches documents exactly, so an 11-digit CPF typed without punctuation gets the usual mask.
    normalize: (raw) => {
      const value = raw.trim();
      return /^\d{11}$/.test(value)
        ? `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`
        : value;
    },
    isValid: (value) => /^[\w.-]{6,20}$/.test(value),
  },
};

export const SEARCH_TYPE_LIST: readonly SearchTypeConfig[] = [
  SEARCH_TYPES.FLIGHT_NUMBER,
  SEARCH_TYPES.BOOKING_CODE,
  SEARCH_TYPES.DOCUMENT,
];

/** Display form of the searched value; documents are masked so they are never shown in full. */
export function describeSearchValue(type: SearchType, normalized: string): string {
  if (type !== 'DOCUMENT') return normalized;
  const cpf = /^\d{3}\.(\d{3})\.(\d{3})-\d{2}$/.exec(normalized);
  if (cpf) return `•••.${cpf[1]}.${cpf[2]}-••`;
  const visible = normalized.slice(-3);
  return `${'•'.repeat(Math.max(normalized.length - 3, 0))}${visible}`;
}
