import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates and downloads a booking confirmation PDF.
 */
export function generateBookingPDF(booking) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(109, 40, 217); // violet-700
  doc.text('Smart Campus HUB', 14, 22);

  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text('Booking Confirmation', 14, 32);

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 40);

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 44, 196, 44);

  // Table
  autoTable(doc, {
    startY: 50,
    head: [['Field', 'Details']],
    body: [
      ['Booking ID', booking.id],
      ['Resource', booking.resourceName],
      ['Resource Type', booking.resourceType ?? '-'],
      ['Location', booking.resourceLocation ?? '-'],
      ['Date', booking.date],
      ['Time', `${booking.startTime} – ${booking.endTime}`],
      ['Purpose', booking.purpose],
      ['Expected Attendees', booking.expectedAttendees?.toString() ?? '-'],
      ['Status', booking.status],
      ['Booked By', `${booking.userName} (${booking.userEmail ?? ''})`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [109, 40, 217] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
  });

  doc.save(`booking-${booking.id}.pdf`);
}
