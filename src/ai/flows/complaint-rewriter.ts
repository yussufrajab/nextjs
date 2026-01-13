'use server';

/**
 * @fileOverview An AI agent for rewriting employee complaints to conform to civil service commission standards.
 *
 * - standardizeComplaintFormatting - A function that handles the complaint rewriting process.
 * - StandardizeComplaintFormattingInput - The input type for the standardizeComplaintFormatting function.
 * - StandardizeComplaintFormattingOutput - The return type for the standardizeComplaintFormatting function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const StandardizeComplaintFormattingInputSchema = z.object({
  complaintText: z
    .string()
    .describe('The original text of the employee complaint.'),
});
export type StandardizeComplaintFormattingInput = z.infer<
  typeof StandardizeComplaintFormattingInputSchema
>;

const StandardizeComplaintFormattingOutputSchema = z.object({
  rewrittenComplaint: z
    .string()
    .describe(
      'The rewritten complaint text, conforming to civil service commission standards.'
    ),
});
export type StandardizeComplaintFormattingOutput = z.infer<
  typeof StandardizeComplaintFormattingOutputSchema
>;

export async function standardizeComplaintFormatting(
  input: StandardizeComplaintFormattingInput
): Promise<StandardizeComplaintFormattingOutput> {
  return standardizeComplaintFormattingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'standardizeComplaintFormattingPrompt',
  input: { schema: StandardizeComplaintFormattingInputSchema },
  output: { schema: StandardizeComplaintFormattingOutputSchema },
  prompt: `You are an expert Swahili language editor and standardizer for the Zanzibar Civil Service Commission. You MUST carefully correct ALL spelling mistakes, grammar errors, and typing errors in Swahili text.

CRITICAL SPELLING CORRECTIONS YOU MUST MAKE:

Common Swahili Spelling Errors to Fix:
- "nalalamikia" → "ninalalamika" (I complain)
- "nimajiriwa" → "nimeajiriwa" (I was employed)
- "kupanda daraja" → "kupandishwa cheo" or "kupandishwa daraja" (to be promoted)
- "utaratabi" → "utaratibu" (procedure)
- "upangufu" → "upungufu" (deficiency/lack)
- "uondiklewe" → "uondolewe" (be removed)
- "kuchelewa" → "kuchelewa" (delay - this is correct)
- "naomba" → "naomba" (I request - this is correct)
- "mwaka" → "mwaka" (year - this is correct)

YOUR MANDATORY TASKS:

1. **FIX ALL SPELLING ERRORS** - Carefully identify and correct EVERY misspelled Swahili word
   - Check each word against proper Swahili spelling
   - Fix typing errors like missing letters, swapped letters, extra letters
   - Correct verb conjugations and prefixes (ni-, na-, a-, wa-, etc.)

2. **FIX ALL GRAMMAR MISTAKES** - Correct grammatical errors
   - Fix subject-verb agreement
   - Correct tense markers (me-, li-, ta-, na-)
   - Fix noun class prefixes

3. **FIX TYPING ERRORS** - Correct keyboard mistakes
   - Fix letters in wrong order
   - Add missing spaces
   - Remove extra spaces or punctuation

4. **REMOVE INAPPROPRIATE LANGUAGE** - Remove profanity, insults, offensive terms

5. **IMPROVE CLARITY** - Make the text professional and formal
   - Use proper civil service language
   - Structure sentences clearly
   - Keep it respectful and professional

6. **MAINTAIN FACTS** - Do NOT change:
   - Dates, years, numbers
   - Names of people or places (unless misspelled)
   - The core complaint and facts

EXAMPLE TRANSFORMATION:

Before: "nalalamikia kuchelewa kwa kupanda daraja. nimajiriwa mwaka 2019 na hadi leo bado. naomba huu utaratabi na upangufu uondiklewe."

After: "Ninalalamika kuhusu kuchelewa kupandishwa cheo. Nimeajiriwa mwaka 2019 na hadi leo sijapandishwa. Naomba utaratibu huu na upungufu uondolewe."

YOU MUST OUTPUT CORRECTED SWAHILI TEXT WITH ALL ERRORS FIXED.

Original Complaint: {{{complaintText}}}`,
});

const standardizeComplaintFormattingFlow = ai.defineFlow(
  {
    name: 'standardizeComplaintFormattingFlow',
    inputSchema: StandardizeComplaintFormattingInputSchema,
    outputSchema: StandardizeComplaintFormattingOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
