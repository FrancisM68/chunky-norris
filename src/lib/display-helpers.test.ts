import { describe, it, expect } from "vitest";
import {
  speciesLabel,
  genderLabel,
  statusLabel,
  statusPillStyle,
  disposalMethodLabel,
  medicationTypeLabel,
  dosageUnitLabel,
  medicationDisposalLabel,
  tnrStatusLabel,
  tnrStatusPillStyle,
  tnrOutcomeLabel,
  tnrSexLabel,
  fivFelvLabel,
} from "./display-helpers";

describe("speciesLabel", () => {
  it("returns 'Cat' for CAT", () => expect(speciesLabel("CAT")).toBe("Cat"));
  it("returns 'Dog' for DOG", () => expect(speciesLabel("DOG")).toBe("Dog"));
  it("returns 'Rabbit' for RABBIT", () => expect(speciesLabel("RABBIT")).toBe("Rabbit"));
  it("returns 'Ferret' for FERRET", () => expect(speciesLabel("FERRET")).toBe("Ferret"));
  it("returns 'Other' for OTHER", () => expect(speciesLabel("OTHER")).toBe("Other"));
});

describe("genderLabel", () => {
  it("returns 'M/N' for MALE_NEUTERED", () => expect(genderLabel("MALE_NEUTERED")).toBe("M/N"));
  it("returns 'F/N' for FEMALE_NEUTERED", () => expect(genderLabel("FEMALE_NEUTERED")).toBe("F/N"));
  it("returns 'M/I' for MALE_INTACT", () => expect(genderLabel("MALE_INTACT")).toBe("M/I"));
  it("returns 'F/I' for FEMALE_INTACT", () => expect(genderLabel("FEMALE_INTACT")).toBe("F/I"));
  it("returns '?' for UNKNOWN", () => expect(genderLabel("UNKNOWN")).toBe("?"));
});

describe("statusLabel", () => {
  it("returns 'In Care' for IN_CARE", () => expect(statusLabel("IN_CARE")).toBe("In Care"));
  it("returns 'Fostered' for FOSTERED", () => expect(statusLabel("FOSTERED")).toBe("Fostered"));
  it("returns 'Adopted' for ADOPTED", () => expect(statusLabel("ADOPTED")).toBe("Adopted"));
  it("returns 'Returned to Owner' for RETURNED_TO_OWNER", () =>
    expect(statusLabel("RETURNED_TO_OWNER")).toBe("Returned to Owner"));
  it("returns 'Euthanised' for EUTHANISED", () =>
    expect(statusLabel("EUTHANISED")).toBe("Euthanised"));
  it("returns 'Died in Care' for DIED_IN_CARE", () =>
    expect(statusLabel("DIED_IN_CARE")).toBe("Died in Care"));
  it("returns 'TNR Returned' for TNR_RETURNED", () =>
    expect(statusLabel("TNR_RETURNED")).toBe("TNR Returned"));
});

describe("statusPillStyle", () => {
  it("returns forest-light green for IN_CARE", () => {
    const style = statusPillStyle("IN_CARE");
    expect(style.backgroundColor).toBe("#EEF5EC");
    expect(style.color).toBe("#2D5A27");
    expect(style.border).toBe("1px solid #A8D5A2");
  });

  it("returns amber for FOSTERED", () => {
    const style = statusPillStyle("FOSTERED");
    expect(style.backgroundColor).toBe("#FFF3CD");
    expect(style.color).toBe("#7A5C00");
    expect(style.border).toBe("1px solid #F0D060");
  });

  it("returns blue for ADOPTED", () => {
    const style = statusPillStyle("ADOPTED");
    expect(style.backgroundColor).toBe("#E8F4FD");
    expect(style.color).toBe("#1A5276");
    expect(style.border).toBe("1px solid #AED6F1");
  });

  it("returns purple for RETURNED_TO_OWNER", () => {
    const style = statusPillStyle("RETURNED_TO_OWNER");
    expect(style.backgroundColor).toBe("#F4ECF7");
    expect(style.color).toBe("#6C3483");
    expect(style.border).toBe("1px solid #D7BDE2");
  });

  it("returns red for EUTHANISED", () => {
    const style = statusPillStyle("EUTHANISED");
    expect(style.backgroundColor).toBe("#FDECEA");
    expect(style.color).toBe("#922B21");
    expect(style.border).toBe("1px solid #F1948A");
  });

  it("returns red for DIED_IN_CARE", () => {
    const style = statusPillStyle("DIED_IN_CARE");
    expect(style.backgroundColor).toBe("#FDECEA");
    expect(style.color).toBe("#922B21");
    expect(style.border).toBe("1px solid #F1948A");
  });

  it("returns purple for TNR_RETURNED", () => {
    const style = statusPillStyle("TNR_RETURNED");
    expect(style.backgroundColor).toBe("#F4ECF7");
    expect(style.color).toBe("#6C3483");
    expect(style.border).toBe("1px solid #D7BDE2");
  });
});

describe("disposalMethodLabel", () => {
  it("returns 'Rehomed' for REHOMED", () => expect(disposalMethodLabel("REHOMED")).toBe("Rehomed"));
  it("returns 'Reclaimed' for RECLAIMED", () => expect(disposalMethodLabel("RECLAIMED")).toBe("Reclaimed"));
  it("returns 'Euthanised' for EUTHANISED", () => expect(disposalMethodLabel("EUTHANISED")).toBe("Euthanised"));
  it("returns 'Died in Care' for DIED_IN_CARE", () => expect(disposalMethodLabel("DIED_IN_CARE")).toBe("Died in Care"));
  it("returns 'TNR Returned' for TNR_RETURNED", () => expect(disposalMethodLabel("TNR_RETURNED")).toBe("TNR Returned"));
  it("returns 'Transferred' for TRANSFERRED", () => expect(disposalMethodLabel("TRANSFERRED")).toBe("Transferred"));
});

describe("medicationTypeLabel", () => {
  it("returns 'Deworming' for DEWORMING", () => expect(medicationTypeLabel("DEWORMING")).toBe("Deworming"));
  it("returns 'Flea Treatment' for FLEA_TREATMENT", () => expect(medicationTypeLabel("FLEA_TREATMENT")).toBe("Flea Treatment"));
  it("returns 'Tick Treatment' for TICK_TREATMENT", () => expect(medicationTypeLabel("TICK_TREATMENT")).toBe("Tick Treatment"));
  it("returns 'Vaccination' for VACCINATION", () => expect(medicationTypeLabel("VACCINATION")).toBe("Vaccination"));
  it("returns 'Antibiotic' for ANTIBIOTIC", () => expect(medicationTypeLabel("ANTIBIOTIC")).toBe("Antibiotic"));
  it("returns 'Anti-inflammatory' for ANTI_INFLAMMATORY", () => expect(medicationTypeLabel("ANTI_INFLAMMATORY")).toBe("Anti-inflammatory"));
  it("returns 'Eye Drops' for EYE_DROPS", () => expect(medicationTypeLabel("EYE_DROPS")).toBe("Eye Drops"));
  it("returns 'Ear Drops' for EAR_DROPS", () => expect(medicationTypeLabel("EAR_DROPS")).toBe("Ear Drops"));
  it("returns 'Long-term Medication' for LONG_TERM_MEDICATION", () => expect(medicationTypeLabel("LONG_TERM_MEDICATION")).toBe("Long-term Medication"));
  it("returns 'Other' for OTHER", () => expect(medicationTypeLabel("OTHER")).toBe("Other"));
  it("returns raw value for unknown type", () => expect(medicationTypeLabel("UNKNOWN_TYPE")).toBe("UNKNOWN_TYPE"));
});

describe("dosageUnitLabel", () => {
  it("returns 'ml' for ML", () => expect(dosageUnitLabel("ML")).toBe("ml"));
  it("returns 'mg' for MG", () => expect(dosageUnitLabel("MG")).toBe("mg"));
  it("returns 'tablet' for TABLET", () => expect(dosageUnitLabel("TABLET")).toBe("tablet"));
  it("returns '½ tablet' for HALF_TABLET", () => expect(dosageUnitLabel("HALF_TABLET")).toBe("½ tablet"));
  it("returns 'pipette' for PIPETTE", () => expect(dosageUnitLabel("PIPETTE")).toBe("pipette"));
  it("returns 'spot-on' for SPOT_ON", () => expect(dosageUnitLabel("SPOT_ON")).toBe("spot-on"));
  it("returns 'spray dose' for SPRAY_DOSE", () => expect(dosageUnitLabel("SPRAY_DOSE")).toBe("spray dose"));
  it("returns 'other' for OTHER", () => expect(dosageUnitLabel("OTHER")).toBe("other"));
});

describe("medicationDisposalLabel", () => {
  it("returns 'Administered in full' for ADMINISTERED_IN_FULL", () =>
    expect(medicationDisposalLabel("ADMINISTERED_IN_FULL")).toBe("Administered in full"));
  it("returns 'Partial — returned to stock' for PARTIAL_RETURNED", () =>
    expect(medicationDisposalLabel("PARTIAL_RETURNED")).toBe("Partial — returned to stock"));
  it("returns 'Remainder disposed of' for DISPOSED_OF", () =>
    expect(medicationDisposalLabel("DISPOSED_OF")).toBe("Remainder disposed of"));
  it("returns 'Course ongoing' for COURSE_ONGOING", () =>
    expect(medicationDisposalLabel("COURSE_ONGOING")).toBe("Course ongoing"));
  it("returns raw value for unknown disposal", () => expect(medicationDisposalLabel("UNKNOWN")).toBe("UNKNOWN"));
});

describe("tnrStatusLabel", () => {
  it("returns 'In Progress' for IN_PROGRESS", () =>
    expect(tnrStatusLabel("IN_PROGRESS")).toBe("In Progress"));
  it("returns 'Completed' for COMPLETED", () =>
    expect(tnrStatusLabel("COMPLETED")).toBe("Completed"));
  it("returns 'On Hold' for ON_HOLD", () =>
    expect(tnrStatusLabel("ON_HOLD")).toBe("On Hold"));
  it("returns the raw value for unknown status", () =>
    expect(tnrStatusLabel("UNKNOWN_VAL")).toBe("UNKNOWN_VAL"));
});

describe("tnrStatusPillStyle", () => {
  it("returns amber colours for IN_PROGRESS", () => {
    const style = tnrStatusPillStyle("IN_PROGRESS");
    expect(style.backgroundColor).toBe("#fff3e0");
    expect(style.color).toBe("#e65100");
  });
  it("returns green colours for COMPLETED", () => {
    const style = tnrStatusPillStyle("COMPLETED");
    expect(style.backgroundColor).toBe("#f0fdf4");
    expect(style.color).toBe("#15803d");
  });
  it("returns grey colours for ON_HOLD", () => {
    const style = tnrStatusPillStyle("ON_HOLD");
    expect(style.backgroundColor).toBe("#f3f4f6");
    expect(style.color).toBe("#6b7280");
  });
  it("returns fallback grey for unknown status", () => {
    const style = tnrStatusPillStyle("UNKNOWN_VAL");
    expect(style.backgroundColor).toBe("#f3f4f6");
    expect(style.color).toBe("#374151");
  });
});

describe("tnrOutcomeLabel", () => {
  it("returns 'Returned / Released' for RETURNED_RELEASED", () =>
    expect(tnrOutcomeLabel("RETURNED_RELEASED")).toBe("Returned / Released"));
  it("returns 'Rehomed' for REHOMED", () =>
    expect(tnrOutcomeLabel("REHOMED")).toBe("Rehomed"));
  it("returns 'PTS' for EUTHANISED", () =>
    expect(tnrOutcomeLabel("EUTHANISED")).toBe("PTS"));
  it("returns 'Passed Away' for DIED_IN_CARE", () =>
    expect(tnrOutcomeLabel("DIED_IN_CARE")).toBe("Passed Away"));
  it("returns 'Transferred' for TRANSFERRED", () =>
    expect(tnrOutcomeLabel("TRANSFERRED")).toBe("Transferred"));
  it("returns the raw value for unknown outcome", () =>
    expect(tnrOutcomeLabel("SOMETHING_ELSE")).toBe("SOMETHING_ELSE"));
});

describe("tnrSexLabel", () => {
  it("returns 'Female' for FEMALE_INTACT", () =>
    expect(tnrSexLabel("FEMALE_INTACT")).toBe("Female"));
  it("returns 'Male' for MALE_INTACT", () =>
    expect(tnrSexLabel("MALE_INTACT")).toBe("Male"));
  it("returns 'Unknown' for UNKNOWN", () =>
    expect(tnrSexLabel("UNKNOWN")).toBe("Unknown"));
  it("returns raw value for unexpected input", () =>
    expect(tnrSexLabel("FEMALE_NEUTERED")).toBe("FEMALE_NEUTERED"));
});

describe("fivFelvLabel", () => {
  it("returns '–/–' for NEGATIVE/NEGATIVE", () =>
    expect(fivFelvLabel("NEGATIVE", "NEGATIVE")).toBe("–/–"));
  it("returns '+/–' for POSITIVE/NEGATIVE", () =>
    expect(fivFelvLabel("POSITIVE", "NEGATIVE")).toBe("+/–"));
  it("returns '–/+' for NEGATIVE/POSITIVE", () =>
    expect(fivFelvLabel("NEGATIVE", "POSITIVE")).toBe("–/+"));
  it("returns '+/+' for POSITIVE/POSITIVE", () =>
    expect(fivFelvLabel("POSITIVE", "POSITIVE")).toBe("+/+"));
  it("returns 'n/t' for NOT_TESTED/NOT_TESTED", () =>
    expect(fivFelvLabel("NOT_TESTED", "NOT_TESTED")).toBe("n/t"));
  it("returns '–/n/t' for NEGATIVE/NOT_TESTED", () =>
    expect(fivFelvLabel("NEGATIVE", "NOT_TESTED")).toBe("–/n/t"));
  it("returns '+/n/t' for POSITIVE/NOT_TESTED", () =>
    expect(fivFelvLabel("POSITIVE", "NOT_TESTED")).toBe("+/n/t"));
  it("returns 'n/t/–' for NOT_TESTED/NEGATIVE", () =>
    expect(fivFelvLabel("NOT_TESTED", "NEGATIVE")).toBe("n/t/–"));
  it("returns 'n/t/+' for NOT_TESTED/POSITIVE", () =>
    expect(fivFelvLabel("NOT_TESTED", "POSITIVE")).toBe("n/t/+"));
});
