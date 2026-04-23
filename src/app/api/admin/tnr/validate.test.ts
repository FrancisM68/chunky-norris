import { describe, it, expect } from "vitest";
import { validateTNRBody } from "./validate";

describe("validateTNRBody", () => {
  const valid = {
    locationName: "Moneymore Estate",
    county: "Louth",
    sex: "FEMALE_INTACT",
    dateIntoDar: "2024-09-13",
    status: "IN_PROGRESS",
  };

  it("returns no errors for a valid body", () => {
    expect(validateTNRBody(valid)).toEqual({});
  });

  it("requires locationName", () => {
    const errors = validateTNRBody({ ...valid, locationName: "" });
    expect(errors.locationName).toBeDefined();
  });

  it("requires county", () => {
    const errors = validateTNRBody({ ...valid, county: "" });
    expect(errors.county).toBeDefined();
  });

  it("requires sex", () => {
    const errors = validateTNRBody({ ...valid, sex: undefined });
    expect(errors.sex).toBeDefined();
  });

  it("requires dateIntoDar", () => {
    const errors = validateTNRBody({ ...valid, dateIntoDar: "" });
    expect(errors.dateIntoDar).toBeDefined();
  });

  it("requires outcome when status is COMPLETED", () => {
    const errors = validateTNRBody({ ...valid, status: "COMPLETED", dateOutOfDar: "2024-09-20" });
    expect(errors.outcome).toBeDefined();
  });

  it("requires dateOutOfDar when status is COMPLETED", () => {
    const errors = validateTNRBody({ ...valid, status: "COMPLETED", outcome: "RETURNED_RELEASED" });
    expect(errors.dateOutOfDar).toBeDefined();
  });

  it("no outcome error when status is IN_PROGRESS", () => {
    const errors = validateTNRBody({ ...valid, status: "IN_PROGRESS" });
    expect(errors.outcome).toBeUndefined();
  });

  it("requires status", () => {
    const errors = validateTNRBody({ ...valid, status: undefined });
    expect(errors.status).toBeDefined();
  });
});
