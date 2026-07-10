import { describe, expect, it } from "vitest";
import { plan } from "../plan/plan";
import { validatePlan } from "./validate-plan";

describe("authored HTML plan", () => {
  it("satisfies the shared plan contract", () => {
    expect(validatePlan(plan)).toEqual([]);
  });
});
