import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { importSchema, validateEvidence } from "./extraction";
import { applyAmbientGuard } from "./ambient-guard";

export const saveImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => importSchema.parse(input))
  .handler(async ({ data, context }) => {
    const conversation = applyAmbientGuard(data.conversation).sanitized;
    const extraction = validateEvidence(conversation, data.extraction);
    const { data: row, error } = await context.supabase
      .from("conversation_imports")
      .insert({
        user_id: context.userId,
        title: data.title,
        conversation,
        extraction: {
          memories: extraction.memories.map((m) => ({ ...m })),
          people: extraction.people.map((p) => ({ ...p })),
        },
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listImports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("conversation_imports")
      .select("id,title,conversation,extraction,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      ...row,
      extraction: importSchema.shape.extraction.parse(row.extraction),
    }));
  });
