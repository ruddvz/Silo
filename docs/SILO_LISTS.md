# Silo Lists

**Silo Lists** extends Silo with private shared checklist files for two people. A list is still a file: markdown under the hood, beautiful checklist UI on screen.

## Open the app

- **Vault** (default): `/` or `/#/`
- **Lists**: `/#lists` or **Settings → Open Silo Lists** in the vault

## Local mode (no backend)

Without Supabase env vars, the app runs in **local mode** on this device:

- Any email/password unlocks
- Data stays in `localStorage`
- Good for UI demos and solo testing

## Supabase sync (two phones)

1. Create a [Supabase](https://supabase.com) project (free tier is enough for two users).
2. Run [`supabase/migrations/001_silo_lists.sql`](../supabase/migrations/001_silo_lists.sql) in the SQL editor.
3. Copy `.env.example` to `.env.local` and set:

   ```bash
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

4. Enable Email auth in Supabase → Authentication.
5. `npm run dev` — sign up, create a space, share the invite code with your partner.

## File type

Lists use `type: "shared-list"` with JSON storage locally and relational `files` + `list_items` tables in Supabase. Export/import uses markdown:

```markdown
# Groceries
- [ ] Milk
- [x] Bread
## Notes
Buy fruit from the Indian store.
```
