# Database Migrations

Run these in **Supabase Dashboard → your project → SQL Editor → paste → Run**.
The base schema lives in [`supabase/schema.sql`](../supabase/schema.sql); the
snippets below are incremental changes applied to an already-created database.

The app degrades gracefully if a migration hasn't been run yet (it retries
writes without the new columns), so running them is safe and unlocks the
related fields — it never breaks existing data.

---

## 2026-05 · clothing item brand + material

Adds user-editable **brand** and AI-estimated **material** to wardrobe items.
Without this, brand/material simply aren't persisted.

```sql
alter table clothing_items
  add column if not exists brand text,
  add column if not exists material text;
```

> Status: **applied** ✅
