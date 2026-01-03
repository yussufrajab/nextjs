'use server';

/**
 * Wrapper for AI functionality that handles errors gracefully
 */

export interface StandardizeComplaintFormattingInput {
  complaintText: string;
}

export interface StandardizeComplaintFormattingOutput {
  rewrittenComplaint: string;
}

export async function standardizeComplaintFormatting(
  input: StandardizeComplaintFormattingInput
): Promise<StandardizeComplaintFormattingOutput> {
  try {
    // Try to import the AI functionality
    const { standardizeComplaintFormatting: originalFunction } =
      await import('@/ai/flows/complaint-rewriter');
    return await originalFunction(input);
  } catch (error) {
    console.warn(
      'AI functionality unavailable, returning original text:',
      error
    );
    // Fallback: return the original text
    return {
      rewrittenComplaint: input.complaintText,
    };
  }
}
