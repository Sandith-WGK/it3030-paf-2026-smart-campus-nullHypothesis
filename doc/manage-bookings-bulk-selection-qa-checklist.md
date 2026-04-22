# Manage Bookings Bulk Selection QA Checklist

Use this checklist to capture manual verification evidence (screenshots + outcome notes)
for the Manage Bookings bulk-selection workflow.

## Test scope

- Page under test: `Manage Bookings` (`/admin/bookings`)
- Page-size behavior: current page only (up to 20 rows)
- Actionable rows: `PENDING` status only for bulk approve

## Scenarios

1. Empty page behavior
- Apply filters that return no bookings.
- Verify empty state is shown.
- Verify no header selection checkbox actions are available.

2. Header checkbox (none selected)
- Open a page with at least one pending booking.
- Verify header checkbox is unchecked.
- Click header checkbox.
- Expected: all pending rows on current page become selected.

3. Header checkbox (all selected)
- With all pending rows selected, click header checkbox again.
- Expected: all selections on current page are cleared.

4. Header checkbox indeterminate state
- Select one pending row manually.
- Verify header checkbox appears indeterminate (partially selected).
- Select remaining pending rows; verify it becomes checked.

5. Non-actionable row selection handling
- Include APPROVED/REJECTED/CANCELLED rows on page.
- Verify row checkbox is disabled for non-pending statuses.
- Verify tooltip/title indicates only pending rows are bulk-actionable.

6. Row-level selection
- Select two pending rows individually.
- Verify selected row highlighting appears.
- Verify bulk toolbar count shows:
  - total selected on current page
  - actionable pending selected

7. Scope messaging
- Verify copy explicitly states selection is for current page only.
- Change page (Next/Previous).
- Expected: stale selections do not carry over.

8. Filter change after selection
- Select pending rows.
- Change filters.
- Expected: selection resets to rows visible/actionable in updated page data.

9. Bulk approve confirmation copy
- Select pending rows and click bulk approve.
- Verify modal copy references actionable pending count and current-page scope.

10. Bulk approve partial failure handling
- Trigger a mixed outcome (at least one approval failure).
- Verify toast message reports succeeded and failed counts with reason snippets when available.

11. Post-action reload consistency
- Complete bulk approve.
- Verify processed rows animate out/reload and selection resets correctly.

## Evidence template

- Scenario ID:
- Screenshot path/name:
- Steps performed:
- Actual result:
- Expected result:
- Pass/Fail:
- Notes:
