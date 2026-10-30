import { SEARCH_TYPES, describeSearchValue } from './search-type';

describe('search types', () => {
  describe('FLIGHT_NUMBER', () => {
    const { normalize, isValid } = SEARCH_TYPES.FLIGHT_NUMBER;

    it('removes spaces and upper-cases', () => expect(normalize(' mf 214 ')).toBe('MF214'));

    it.each(['MF214', 'AB12', 'MF3010'])('accepts %s', (value) =>
      expect(isValid(value)).toBe(true),
    );
    it.each(['M214', 'MF1', 'MF12345', '214MF', 'MF-214', ''])('rejects "%s"', (value) =>
      expect(isValid(value)).toBe(false),
    );
  });

  describe('BOOKING_CODE', () => {
    const { normalize, isValid } = SEARCH_TYPES.BOOKING_CODE;

    it('removes spaces and upper-cases', () => expect(normalize(' maia 7k')).toBe('MAIA7K'));

    it.each(['MAIA7K', 'ABC123'])('accepts %s', (value) => expect(isValid(value)).toBe(true));
    it.each(['MAIA7', 'MAIA7KK', 'MAIA-K', ''])('rejects "%s"', (value) =>
      expect(isValid(value)).toBe(false),
    );
  });

  describe('DOCUMENT', () => {
    const { normalize, isValid } = SEARCH_TYPES.DOCUMENT;

    it('masks a CPF typed with digits only and trims', () => {
      expect(normalize('12345678909')).toBe('123.456.789-09');
      expect(normalize(' 123.456.789-09 ')).toBe('123.456.789-09');
    });

    it('does not change other documents', () => expect(normalize('AB1234567')).toBe('AB1234567'));

    it.each(['123.456.789-09', 'AB1234567'])('accepts %s', (value) =>
      expect(isValid(value)).toBe(true),
    );
    it.each(['12345', 'A'.repeat(21), '123 456', ''])('rejects "%s"', (value) =>
      expect(isValid(value)).toBe(false),
    );
  });

  describe('describeSearchValue', () => {
    it('never exposes a full document', () => {
      expect(describeSearchValue('DOCUMENT', '123.456.789-09')).toBe('•••.456.789-••');
      expect(describeSearchValue('DOCUMENT', 'AB1234567')).toBe('••••••567');
    });

    it('shows other values as typed', () => {
      expect(describeSearchValue('BOOKING_CODE', 'MAIA7K')).toBe('MAIA7K');
      expect(describeSearchValue('FLIGHT_NUMBER', 'MF214')).toBe('MF214');
    });
  });
});
