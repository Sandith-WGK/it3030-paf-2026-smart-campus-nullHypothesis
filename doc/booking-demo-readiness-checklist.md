# Booking Demo Readiness Checklist

## Pre-check
- Start backend and frontend with latest code.
- Ensure at least one `APPROVED` booking exists for today's date.
- Ensure at least one `PENDING` booking overlaps another pending slot for admin arbitration demo.

## 5-minute flow
1. Open booking detail for an approved booking and display generated QR.
2. Scan/open QR while logged out and verify the public check-in screen shows `VALID BOOKING`.
3. As admin, approve one pending booking.
4. Attempt to approve overlapping pending booking and confirm conflict error feedback.
5. Open Manage Bookings and navigate pagination (next/previous) with filters.

## Expected outcomes
- Public verify works without login redirect loops.
- Overlapping approval is blocked with deterministic conflict message.
- Booking list paging remains accurate with filter context.

## Conflict policy note (for examiner/viva)
- This module uses admin arbitration: overlapping `PENDING` requests are allowed.
- Exclusivity is enforced at approval time; only one request can be `APPROVED` for an overlapping slot.
- Once one booking is approved, overlapping pending requests are automatically rejected with a clear reason.
