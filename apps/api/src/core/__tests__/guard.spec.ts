import { Guard } from '../guard';
import { describe, expect, it } from 'vitest';

describe('Guard', () => {
  describe('isEmpty', () => {
    it.each<[string, unknown]>([
      ['null', null],
      ['undefined', undefined],
      ['공백 string', '   '],
      ['빈 array', []],
      ['빈 plain object', {}],
    ])('%s이면 true로 판정한다', (_caseName, value) => {
      expect(Guard.isEmpty(value)).toBe(true);
    });

    it.each<[string, unknown]>([
      ['문자가 있는 string', 'spring'],
      ['요소가 있는 array', [1]],
      ['property가 있는 object', { value: 'spring' }],
      ['number 0', 0],
      ['boolean false', false],
    ])('%s이면 false로 판정한다', (_caseName, value) => {
      expect(Guard.isEmpty(value)).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it.each<[string, unknown]>([
      ['문자가 있는 string', 'spring'],
      ['앞뒤 공백이 있는 string', ' spring '],
    ])('%s이면 true로 판정한다', (_caseName, value) => {
      expect(Guard.isNonEmptyString(value)).toBe(true);
    });

    it.each<[string, unknown]>([
      ['공백 string', '   '],
      ['null', null],
      ['number', 1],
    ])('%s이면 false로 판정한다', (_caseName, value) => {
      expect(Guard.isNonEmptyString(value)).toBe(false);
    });
  });

  describe('isPlainObject', () => {
    it.each<[string, unknown]>([
      ['Object prototype을 가진 object', { value: 'spring' }],
      ['prototype이 null인 object', Object.create(null)],
    ])('%s이면 true로 판정한다', (_caseName, value) => {
      expect(Guard.isPlainObject(value)).toBe(true);
    });

    it.each<[string, unknown]>([
      ['null', null],
      ['array', []],
      ['Date instance', new Date()],
      ['string', 'spring'],
    ])('%s이면 false로 판정한다', (_caseName, value) => {
      expect(Guard.isPlainObject(value)).toBe(false);
    });
  });
});
