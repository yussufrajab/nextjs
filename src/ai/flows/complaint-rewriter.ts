'use server';

/**
 * @fileOverview An AI agent for rewriting employee complaints to conform to civil service commission standards.
 *
 * - standardizeComplaintFormatting - A function that handles the complaint rewriting process.
 * - StandardizeComplaintFormattingInput - The input type for the standardizeComplaintFormatting function.
 * - StandardizeComplaintFormattingOutput - The return type for the standardizeComplaintFormatting function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StandardizeComplaintFormattingInputSchema = z.object({
  complaintText: z
    .string()
    .describe('The original text of the employee complaint.'),
});
export type StandardizeComplaintFormattingInput = z.infer<typeof StandardizeComplaintFormattingInputSchema>;

const StandardizeComplaintFormattingOutputSchema = z.object({
  rewrittenComplaint: z
    .string()
    .describe('The rewritten complaint text, conforming to civil service commission standards.'),
});
export type StandardizeComplaintFormattingOutput = z.infer<typeof StandardizeComplaintFormattingOutputSchema>;

export async function standardizeComplaintFormatting(
  input: StandardizeComplaintFormattingInput
): Promise<StandardizeComplaintFormattingOutput> {
  return standardizeComplaintFormattingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'standardizeComplaintFormattingPrompt',
  input: {schema: StandardizeComplaintFormattingInputSchema},
  output: {schema: StandardizeComplaintFormattingOutputSchema},
  prompt: `You are an expert in standardizing employee complaints for the civil service commission.

You will receive the original complaint text and rewrite it to conform to the commission's standards, ensuring clarity and compliance, without altering the facts.

Original Complaint: {{{complaintText}}}`,
});

const standardizeComplaintFormattingFlow = ai.defineFlow(
  {
    name: 'standardizeComplaintFormattingFlow',
    inputSchema: StandardizeComplaintFormattingInputSchema,
    outputSchema: StandardizeComplaintFormattingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
