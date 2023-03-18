import {expect, jest, test} from '@jest/globals';
test('Check To load the library correctly', () => {
  const value = 0.1 + 0.2
  //expect(value).toBe(0.3);           This won't work because of rounding error
  expect(value).toBeCloseTo(0.3) // This works.
})
