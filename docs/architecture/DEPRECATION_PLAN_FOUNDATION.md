# Deprecation Plan: icicso-foundation

**Decision Date:** 2026-04-05  
**Status:** APPROVED FOR DEPRECATION  
**Timeline:** Immediate → Archive by 2026-04-30

---

## EXECUTIVE SUMMARY

`08_Plataforma_Digital/icicso-foundation/` is **deprecated** effective immediately.

**Reason:** This alternate monorepo/foundation has been superseded by:
- `icicso/` - Canonical development tree (active, tests passing)
- `icicso-local/` - Runtime demo with 16 working services (active)
- `services/ingestion-orquestador/` - Python backend (active, tests passing)

**Action:** Archive, remove from active development, move to `/deprecated` directory.

---

## RATIONALE

### Current State

`icicso-foundation` attempted to provide:
- API server (not implemented)
- Web frontend (not implemented)
- Bounded contexts (partial, broken)
- Shared kernel reference (imports missing)

**Actual state:**
```
✗ Build fails: pnpm build
✗ Imports broken: @icicso/shared-kernel not found
✗ TypeScript errors in bounded contexts
✗ No tests
✗ No CI passing
✗ Duplicate of functionality already in icicso/ and icicso-local/
```

### Why Not Continue?

| Factor | Verdict |
|--------|---------|
| Technical correctness | ✗ Broken |
| Active maintenance | ✗ No |
| Unique functionality | ✗ No (duplication) |
| Tests passing | ✗ No |
| Team alignment | ✗ No consensus |
| Blocking releases | ✓ Yes - confusion & build failures |

---

## IMPACT ANALYSIS

### What Gets Archived

```
08_Plataforma_Digital/icicso-foundation/
├── apps/                    [API, Web - not implemented]
├── packages/                [Bounded contexts - broken imports]
├── tsconfig.json
├── pnpm-workspace.yaml
├── .gitignore
└── [Other config]
```

### What Stays Active

```
icicso/                       ✓ Canon development tree
  ├── apps/api               [Scaffold OK]
  ├── apps/emulator          [Working]
  ├── packages/domain/*      [Growing]
  └── [Tests passing]

icicso-local/                ✓ Runtime demo
  ├── 16 services            [Working]
  ├── docker-compose.yml     [Working]
  ├── Tests                  [Passing]
  └── [Fully operational]

services/ingestion-orquestrador/  ✓ Python backend
  ├── Tests passing
  └── [Functional]
```

### What Changes for Users

**For developers:**
- ✓ Clearer repo structure
- ✓ No confusion about which tree to develop in
- ✓ No broken imports in foundation
- ✓ Focus on `icicso/` for new features

**For CI/CD:**
- ✓ Faster builds (one less failing target)
- ✓ Cleaner error messages
- ✓ No failed foundation builds blocking releases

**For documentation:**
- ✓ Updated README
- ✓ Updated START_HERE.md
- ✓ Clear canonical path

---

## DEPRECATION TIMELINE

### Phase 1: Immediate (Today)

- ✓ Create DEPRECATION_NOTICE.md in `08_Plataforma_Digital/icicso-foundation/`
- ✓ Update `README.md` → Mark as deprecated
- ✓ Update `START_HERE.md` → Remove reference to foundation
- ✓ Update `.github/workflows/` → Remove foundation builds
- ✓ Update top-level README.md → Clarify canonical paths

### Phase 2: This Week

- Move to `/deprecated/foundation-archive-20260405/`
- Create archive-info.md documenting why
- Tag commit: `archive/foundation-20260405`

### Phase 3: Documentation

- Add to `docs/architecture/DEPRECATION_PLAN.md`
- Add to ADR (Architecture Decision Record)
- Add to migration guide if anyone needs reference

---

## MIGRATION PATH FOR USERS

### If you were using icicso-foundation:

**Option 1: Use icicso-local (Recommended for runtime)**
```bash
cd icicso-local
docker-compose up -d
```

**Option 2: Use icicso (Recommended for development)**
```bash
cd icicso
pnpm install
pnpm build
pnpm test
```

**Option 3: Access archived code**
```bash
cd /deprecated/foundation-archive-20260405/
# Read-only reference, not executable
```

---

## FILES TO CREATE/MODIFY

### 1. Deprecation Notice (in foundation)

```
08_Plataforma_Digital/icicso-foundation/DEPRECATED.md
```

### 2. Update Parent README

```
08_Plataforma_Digital/README.md
```

### 3. Update Root README

```
ICICSO/README.md
```

### 4. Update START_HERE

```
START_HERE.md
```

### 5. Remove from CI/CD

```
.github/workflows/ci.yml      (remove foundation build)
package.json                  (remove build:foundation script)
```

### 6. Archive Decision

```
docs/architecture/deprecation-plan.md
docs/architecture/decisions/ADR-0001-foundation-deprecation.md
```

---

## TECHNICAL STEPS

### Step 1: Create Archive Structure

```bash
cd ICICSO
mkdir -p deprecated/foundation-archive-20260405
cp -r 08_Plataforma_Digital/icicso-foundation/* \
      deprecated/foundation-archive-20260405/
```

### Step 2: Document Archive

```
deprecated/foundation-archive-20260405/
├── ARCHIVE_INFO.md          [Why archived, what was it]
├── ORIGINAL_PATH.txt        [08_Plataforma_Digital/icicso-foundation/]
├── ARCHIVED_DATE.txt        [2026-04-05]
├── [All original content]
```

### Step 3: Remove from Active

```bash
rm -rf 08_Plataforma_Digital/icicso-foundation/
rmdir 08_Plataforma_Digital/  # if empty
```

### Step 4: Update CI/CD

Edit `.github/workflows/ci.yml`:
```yaml
# REMOVED:
# - build:foundation
# - test:foundation
# - typecheck:foundation
```

Edit `package.json` (root):
```json
// REMOVED:
// "build:foundation": "...",
// "dev:foundation": "...",
```

---

## VALIDATION CHECKLIST

Before final archive:

- [ ] Backup created: `/deprecated/foundation-archive-20260405/`
- [ ] README.md updated in foundation: "DEPRECATED"
- [ ] START_HERE.md updated: no reference to foundation
- [ ] CI/CD workflows: foundation builds removed
- [ ] package.json: foundation scripts removed
- [ ] No external links point to foundation (check docs/)
- [ ] Team notified
- [ ] Git commit & tag created
- [ ] Archive documented

---

## ROLLBACK PLAN

If needed to recover:

```bash
# Foundation code is preserved in /deprecated/
# Can restore if consensus changes:
git show archive/foundation-20260405:08_Plataforma_Digital/icicso-foundation/
```

But **not recommended** - instead use `icicso/` going forward.

---

## STAKEHOLDER COMMUNICATION

### Message

> "**icicso-foundation has been deprecated.**
>
> We're consolidating development on three active trees:
> - `icicso/` - Canonical development (use for new features)
> - `icicso-local/` - Runtime demo (use for testing locally)
> - `services/ingestion-orquestador/` - Python backend (use for data processing)
>
> `08_Plataforma_Digital/icicso-foundation/` was an experimental alternate foundation that had broken imports and was not being maintained. It's been archived.
>
> **For existing code:** Check `/deprecated/foundation-archive-20260405/`
> **For new development:** Use `icicso/` or `icicso-local/`
> **Questions:** See START_HERE.md"

---

## COST/BENEFIT

### Benefits
- ✓ Clearer repository structure
- ✓ Faster CI/CD (no broken builds)
- ✓ Reduced confusion for new contributors
- ✓ Less maintenance burden

### Costs
- ✗ Remove some experimental code (preserved in archive)
- ✗ Small learning curve: redirect to canonical trees

**Net:** Strong positive

---

## RELATED CLEANUP

As part of D.1, also consolidate:

1. **Scripts:** `/scripts/` directory
   - Consolidate duplicates
   - Remove broken ones
   - Document each

2. **Config:** `config/` directory
   - Centralize env loading
   - Remove duplication

3. **Documentation:** Consolidate scattered docs
   - Move to `docs/architecture/`
   - Move to `docs/development/`

---

## NEXT STEPS

1. **Immediate:** Create deprecation notice
2. **This hour:** Update README & START_HERE
3. **This hour:** Remove from CI/CD
4. **Today:** Move to /deprecated/ 
5. **Today:** Git commit & tag
6. **Documentation:** Add to ADR system

---

**Deprecation Status: READY FOR EXECUTION**
