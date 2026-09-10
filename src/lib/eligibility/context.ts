import { CitizenProfile } from "@prisma/client";
import { EligibilityContext } from "./types";

/** Flattens a CitizenProfile row into the field-name context the rule engine expects. */
export function profileToContext(profile: CitizenProfile): EligibilityContext {
  return {
    age: profile.age ?? undefined,
    location: profile.location ?? undefined,
    residency: profile.residency ?? undefined,
    annualIncome: profile.annualIncome ?? undefined,
    employmentStatus: profile.employmentStatus ?? undefined,
    educationLevel: profile.educationLevel ?? undefined,
    householdSize: profile.householdSize ?? undefined,
    dependents: profile.dependents ?? undefined,
    businessOwner: profile.businessOwner ?? undefined,
    housingStatus: profile.housingStatus ?? undefined,
    disabilityStatus: profile.disabilityStatus ?? undefined,
    studentStatus: profile.studentStatus ?? undefined,
    agricultureLand: profile.agricultureLand ?? undefined,
  };
}
