import type { Metadata } from "next";

import { PageHeader, PageShell } from "@/components/dashboard/page-header";
import { Chat } from "@/components/ai/chat";
import { ConversationList } from "@/components/ai/conversation-list";
import { requireSessionContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/ai/config";

export const metadata: Metadata = {
  title: "AI assistant",
  description: "Ask about your score, your spending and what to do next.",
};

export default async function AiPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; prompt?: string }>;
}) {
  const { user, settings } = await requireSessionContext("/dashboard/ai");
  const params = await searchParams;

  const supabase = await createClient();
  const { data: conversations } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  const activeId =
    params.c && conversations?.some((c) => c.id === params.c) ? params.c : null;

  const { data: messages } = activeId
    ? await supabase
        .from("ai_messages")
        .select("*")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true })
    : { data: [] };

  return (
    <PageShell width="wide">
      <PageHeader
        title="AI assistant"
        description="It reads your real figures and the score the engine produced. It never invents a number — when a question needs one, it runs the actual calculation."
      />

      <div className="mt-7 grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="no-print hidden lg:block">
          <ConversationList
            conversations={conversations ?? []}
            activeId={activeId}
          />
        </aside>

        <Chat
          key={activeId ?? "new"}
          conversationId={activeId}
          initialMessages={messages ?? []}
          initialPrompt={params.prompt}
          aiConfigured={isAiConfigured()}
          dataPermission={settings?.ai_data_permission !== false}
        />
      </div>
    </PageShell>
  );
}
