# Knowly Bulk Exam Feature — Implementation Primer

## Current Status: 90% Complete

### ✅ What's Done (570+ lines of code)

1. **exam-bulk.ts** (98 lines)
   - All types and interfaces defined
   - generateBulkPapers() fully implemented with 4 distribution strategies
   - getTotalQuestionsNeeded() validation helper
   - Ready to use

2. **multi-paper-config.tsx** (229 lines)
   - Complete Neo-Brutalist UI component
   - All controls: number of papers, distribution strategy, Q-per-paper, naming, format
   - Full validation and error handling
   - Loading states and success messages
   - Exports cleanly for use in print.tsx

3. **DESIGN.md** (243 lines)
   - Full Neo-Brutalist design system documented
   - Colors, typography, borders, shadows all defined
   - Component patterns and examples
   - Accessibility guidelines
   - Implementation checklist

### 🚧 What Remains (50 minutes of work)

Update **src/routes/_authenticated/print.tsx**:
- Add mode state (single vs bulk)
- Add mode toggle buttons (2 lines of UI)
- Wrap existing UI in "single" mode conditional
- Add bulk UI component in "bulk" mode conditional
- ~80-100 lines total change

## Key Files Created

| File | Lines | Purpose |
|------|-------|---------|
| src/lib/exam-bulk.ts | 98 | Core business logic |
| src/components/print/multi-paper-config.tsx | 229 | UI component |
| DESIGN.md | 243 | Design system reference |

## Architecture

### Distribution Strategies
- **same-for-all**: Identical questions on every paper
- **random-per-paper**: Different random questions on each paper
- **sequential**: Questions used in order, no overlap
- **custom-per-paper**: User-configurable per-paper counts

### Data Flow
\\\
PrintExamPage
  ↓
  mode = "bulk" ?
  ↓
MultiPaperConfig (input)
  ↓
onGenerate callback
  ↓
generateBulkPapers()
  ↓
GeneratedBulkPaper[]
  ↓
Save to shelf / Print / Download
\\\

## How to Continue

1. Open src/routes/_authenticated/print.tsx
2. Add imports at top:
   - MultiPaperConfig from '@/components/print/multi-paper-config'
   - generateBulkPapers from '@/lib/exam-bulk'

3. In PrintExamPage(), add state after source state:
   - const [mode, setMode] = useState<'single' | 'bulk'>('single')
   - const [bulkGeneratedPapers, setBulkGeneratedPapers] = useState(null)

4. After PageHeader, add toggle buttons with Neo-Brutalist styling

5. Wrap existing grid UI in: {mode === 'single' ? ( ... ) : null}

6. Add bulk UI: {mode === 'bulk' && ( <MultiPaperConfig ... /> )}

See IMPLEMENTATION_PRIMER.md for detailed code snippets.

## Testing Checklist

- [ ] Mode toggle switches UI correctly
- [ ] Single paper mode works as before
- [ ] Bulk config validates pool size
- [ ] same-for-all generates identical papers
- [ ] random-per-paper generates different papers
- [ ] sequential uses questions in order
- [ ] Auto-numbering works
- [ ] Papers save to shelf correctly
- [ ] Print works for bulk papers

