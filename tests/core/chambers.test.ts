import { describe, expect, it } from 'vitest';
import { parseChamber } from '../../src/core/chamber/parser';
import { validateChamber } from '../../src/core/chamber/validator';
import { CHAMBERS } from '../../src/data/chambers';

/** Every chamber entered so far must parse and pass the validator cleanly (C51). */
describe('all chamber data', () => {
  for (const def of Object.values(CHAMBERS)) {
    it(`${def.id} "${def.name}" parses and validates with no errors or warnings`, () => {
      const { model, errors } = parseChamber(def);
      expect(errors).toEqual([]);
      expect(validateChamber(model!)).toEqual({ errors: [], warnings: [] });
    });
  }
});
