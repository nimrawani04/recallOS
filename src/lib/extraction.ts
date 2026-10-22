import { z } from "zod";

export const extractionSchema = z
  .object({
    memories: z.array(
      z
        .object({
          kind: z.enum(["decision", "commitment", "question", "fact", "deadline"]),
          title: z.string(),
          person: z.string().nullable(),
          deadline: z.string().nullable(),
          certainty: z.enum(["explicit", "tentative", "inferred"]),
          quote: z.string(),
        })
        .strict(),
    ),
    people: z.array(z.object({ name: z.string(), quote: z.string() }).strict()),
  })
  .strict();
export type Extraction = z.infer<typeof extractionSchema>;
export const importSchema = z.object({
  title: z.string().trim().min(1).max(160),
  conversation: z.string().min(1).max(40000),
  extraction: extractionSchema,
});

export function validateEvidence(conversation: string, extraction: Extraction): Extraction {
  const parsed = extractionSchema.parse(extraction);
  for (const item of [...parsed.memories, ...parsed.people]) {
    if (!item.quote.trim() || !conversation.includes(item.quote))
      throw new Error("A supporting quote does not match the conversation. Nothing was saved.");
  }
  return parsed;
}

export function selectMemories(extraction: Extraction, query: string) {
  const words = query
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
  return extraction.memories.filter((m) =>
    words.some((w) =>
      `${m.title} ${m.person ?? ""} ${m.kind} ${m.quote}`.toLowerCase().includes(w),
    ),
  );
}
