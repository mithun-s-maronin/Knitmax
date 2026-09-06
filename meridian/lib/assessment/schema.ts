import { z } from "zod";

import { ASSESSMENT_SECTIONS, validateSection, type AnswerMap } from "./questions";

/** One answer value as it travels over the wire. */
const answerValue = z.union([
  z.string().max(200),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(60)).max(20),
  z.null(),
]);

/**
 * The shape of a draft or a submission.
 *
 * Shape validation and rule validation are separate on purpose: Zod checks
 * that the payload is structurally sane before it is trusted, and
 * validateSection then applies the same rules the client applied, so a
 * hand-crafted request cannot skip a required question or slip through a
 * cross-field contradiction (§61, §86).
 */
export const answersSchema = z.record(z.string().max(60), answerValue);

export const draftSchema = z.object({
  answers: answersSchema,
  currentStep: z.number().int().min(0).max(99),
  clientRevision: z.number().int().min(0),
});

export const submissionSchema = z.object({
  answers: answersSchema,
});

export type DraftPayload = z.infer<typeof draftSchema>;
export type SubmissionPayload = z.infer<typeof submissionSchema>;

/** Runs every section's rules. Returns errors keyed by question id. */
export function validateAllSections(answers: AnswerMap): Record<string, string> {
  return ASSESSMENT_SECTIONS.reduce<Record<string, string>>(
    (errors, section) => ({ ...errors, ...validateSection(section, answers) }),
    {},
  );
}
