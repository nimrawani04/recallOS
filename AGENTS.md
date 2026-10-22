<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Conversation extraction uses server-only AI Gateway helpers and owner-scoped saved imports so personal conversations remain private.
- MCP tools read the same saved imports through caller-scoped RLS; the Alexa+ simulation is an OAuth MCP client, not a physical device integration.
