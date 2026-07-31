import { describe, expect, it } from "vitest";
import { selectPreferredGraniteModel } from "./ai";

describe("selectPreferredGraniteModel", () => {
  it("prefers the highest-ranked available Granite model", () => {
    const resources = [
      {
        model_id: "ibm/granite-3-8b-instruct",
        lifecycle: [{ id: "available" }],
      },
      {
        model_id: "ibm/granite-4-h-small",
        lifecycle: [{ id: "available" }],
      },
      {
        model_id: "ibm/granite-3-2b-instruct",
        lifecycle: [{ id: "withdrawn" }],
      },
    ];

    expect(selectPreferredGraniteModel(resources as never[])).toBe(
      "ibm/granite-4-h-small",
    );
  });

  it("returns null when no Granite models are available", () => {
    const resources = [
      {
        model_id: "meta/llama-3-1-8b-instruct",
        lifecycle: [{ id: "available" }],
      },
    ];

    expect(selectPreferredGraniteModel(resources as never[])).toBeNull();
  });
});
