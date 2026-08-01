import { describe, expect, it } from "vitest";
import { buildEvaluationResponseSchema } from "./ai";

describe("buildEvaluationResponseSchema", () => {
  it("defines the expected evaluation response shape", () => {
    const schema = buildEvaluationResponseSchema();

    expect(schema.type).toBe("object");
    expect(schema.required).toEqual(["sections", "overall_summary"]);
  });
});
