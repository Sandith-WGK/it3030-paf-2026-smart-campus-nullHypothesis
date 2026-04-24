import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

const formatFilterValue = (value) => (value ? String(value) : 'All');

const buildPdfFileDate = (date = new Date()) => date.toISOString().slice(0, 10);

const normalizeStatus = (status) => String(status ?? '').toUpperCase();

const buildStatusSummary = (rows) => {
  const counts = rows.reduce(
    (acc, row) => {
      const key = normalizeStatus(row.status);
      if (Object.prototype.hasOwnProperty.call(acc, key)) {
        acc[key] += 1;
      }
      return acc;
    },
    { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 },
  );

  return [
    { label: 'Total', value: rows.length, color: [109, 40, 217] },
    { label: 'Pending', value: counts.PENDING, color: [217, 119, 6] },
    { label: 'Approved', value: counts.APPROVED, color: [22, 163, 74] },
    { label: 'Rejected', value: counts.REJECTED, color: [220, 38, 38] },
    { label: 'Cancelled', value: counts.CANCELLED, color: [82, 82, 91] },
  ];
};

const buildBookingsByDate = (rows) => {
  const grouped = rows.reduce((acc, row) => {
    const dateKey = row.date ? String(row.date) : 'Unknown';
    acc[dateKey] = (acc[dateKey] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped)
    .filter(([date]) => date !== 'Unknown')
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([date, count]) => ({ date, count }));
};

const buildTopResources = (rows) => {
  const grouped = rows.reduce((acc, row) => {
    const key = row.resourceName ?? 'N/A';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([resource, count]) => ({ resource, count }));
};

/**
 * Generates and downloads a booking confirmation PDF.
 */
export async function generateBookingPDF(booking, options = {}) {
  const doc = new jsPDF();
  const { qrValue } = options;

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

  if (normalizeStatus(booking.status) === 'APPROVED' && qrValue) {
    const finalY = doc.lastAutoTable?.finalY ?? 118;
    const blockY = finalY + 10;
    const qrSize = 44;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(39, 39, 42);
    doc.text('Check-In QR Code', 14, blockY);

    const qrDataUrl = await QRCode.toDataURL(qrValue, {
      width: 512,
      margin: 1,
      color: { dark: '#18181b', light: '#ffffff' },
    });

    doc.setDrawColor(220, 220, 225);
    doc.roundedRect(14, blockY + 3, qrSize, qrSize, 2, 2, 'S');
    doc.addImage(qrDataUrl, 'PNG', 15.5, blockY + 4.5, qrSize - 3, qrSize - 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(82, 82, 91);
    doc.text('Scan this QR to verify booking check-in.', 62, blockY + 13);

    const wrapUrl = doc.splitTextToSize(qrValue, 128);
    doc.setFontSize(7.5);
    doc.setTextColor(113, 113, 122);
    doc.text(wrapUrl, 62, blockY + 20);
  }

  doc.save(`booking-${booking.id}.pdf`);
}

/**
 * Generates and downloads an admin bookings list PDF.
 */
export function generateBookingsListPDF(rows, filters = {}, meta = {}) {
  const now = new Date();
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const summary = buildStatusSummary(rows);
  const bookingsByDate = buildBookingsByDate(rows);
  const topResources = buildTopResources(rows);

  // Header banner
  doc.setFillColor(109, 40, 217);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Smart Campus - Admin Bookings Report', 14, 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generated: ${now.toLocaleString()}`, 14, 17.5);
  doc.text(`Generated by: ${meta.generatedBy ?? 'Admin'}`, 95, 17.5);
  doc.text(`Scope: ${meta.scope ?? 'Current filtered results'}`, 162, 17.5);

  const filterSummary = [
    `Status: ${formatFilterValue(filters.status)}`,
    `Resource: ${formatFilterValue(filters.resourceId)}`,
    `Date: ${formatFilterValue(filters.date)}`,
  ].join('   |   ');
  doc.setTextColor(75, 85, 99);
  doc.setFontSize(9);
  doc.text(`Filters: ${filterSummary}`, 14, 31);

  // KPI summary cards
  let cardX = 14;
  const cardY = 37;
  const cardW = 52;
  const cardH = 15;
  const cardGap = 2.5;
  summary.forEach((item) => {
    doc.setFillColor(250, 250, 252);
    doc.setDrawColor(220, 220, 225);
    doc.roundedRect(cardX, cardY, cardW, cardH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...item.color);
    doc.setFontSize(12);
    doc.text(String(item.value), cardX + 3, cardY + 8.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(82, 82, 91);
    doc.setFontSize(8.2);
    doc.text(item.label, cardX + 3, cardY + 13.2);
    cardX += cardW + cardGap;
  });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(39, 39, 42);
  doc.setFontSize(11);
  doc.text('Analytics Overview', 14, 61.5);

  // Left analytics: status distribution bars
  doc.setFontSize(9);
  doc.text('Status Distribution', 14, 68);
  const statusItems = summary.filter((item) => item.label !== 'Total');
  const totalRows = rows.length || 1;
  let distY = 73;
  statusItems.forEach((item) => {
    const pct = item.value / totalRows;
    const barW = Math.max(4, 84 * pct);
    doc.setFillColor(238, 238, 241);
    doc.roundedRect(14, distY, 84, 5.5, 1, 1, 'F');
    doc.setFillColor(...item.color);
    doc.roundedRect(14, distY, barW, 5.5, 1, 1, 'F');
    doc.setTextColor(63, 63, 70);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${item.label}: ${item.value} (${Math.round(pct * 100)}%)`, 101, distY + 4.1);
    distY += 9.2;
  });

  // Middle analytics: bookings over time
  const trendLeft = 155;
  const trendTop = 69;
  const trendWidth = 72;
  const trendHeight = 31;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(39, 39, 42);
  doc.text('Bookings Over Time (Last 7 Dates)', trendLeft, 68);
  doc.setDrawColor(220, 220, 225);
  doc.roundedRect(trendLeft, trendTop, trendWidth, trendHeight, 2, 2, 'S');
  if (bookingsByDate.length > 0) {
    const maxCount = Math.max(...bookingsByDate.map((item) => item.count));
    const slotW = (trendWidth - 8) / bookingsByDate.length;
    const barW = Math.max(3, slotW * 0.55);
    bookingsByDate.forEach((item, idx) => {
      const barH = maxCount > 0 ? (item.count / maxCount) * (trendHeight - 10) : 0;
      const x = trendLeft + 4 + idx * slotW + (slotW - barW) / 2;
      const y = trendTop + trendHeight - 4 - barH;
      doc.setFillColor(109, 40, 217);
      doc.roundedRect(x, y, barW, barH, 0.8, 0.8, 'F');
      doc.setTextColor(113, 113, 122);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(item.date.slice(5), x + barW / 2, trendTop + trendHeight - 1.2, { align: 'center' });
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text('No date trend data available', trendLeft + trendWidth / 2, trendTop + trendHeight / 2, {
      align: 'center',
    });
  }

  // Right analytics: top resources
  const topLeft = 232;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(39, 39, 42);
  doc.text('Top Resources (By Volume)', topLeft, 68);
  doc.setDrawColor(220, 220, 225);
  doc.roundedRect(topLeft, 69, 51, 31, 2, 2, 'S');
  const maxResourceCount = topResources.length > 0 ? topResources[0].count : 1;
  let topY = 74;
  topResources.forEach((item, index) => {
    const width = Math.max(3, (item.count / maxResourceCount) * 24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(63, 63, 70);
    doc.text(`${index + 1}. ${String(item.resource).slice(0, 16)}`, topLeft + 1.5, topY + 2.8);
    doc.setFillColor(109, 40, 217);
    doc.roundedRect(topLeft + 24.5, topY, width, 3.8, 0.8, 0.8, 'F');
    doc.setTextColor(82, 82, 91);
    doc.text(String(item.count), topLeft + 24.5 + width + 1.5, topY + 2.8);
    topY += 5.3;
  });

  if (topResources.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text('No resource data', topLeft + 25.5, 85, { align: 'center' });
  }

  // Divider and table heading
  doc.setDrawColor(210, 210, 214);
  doc.line(14, 104, pageWidth - 14, 104);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(39, 39, 42);
  doc.setFontSize(11);
  doc.text('Booking Details', 14, 110);

  autoTable(doc, {
    startY: 114,
    head: [[
      'Booking ID',
      'Resource ID',
      'Resource',
      'Requested By',
      'Email',
      'Date',
      'Time',
      'Attendees',
      'Status',
    ]],
    body: rows.map((b) => [
      b.id,
      b.resourceId ?? 'N/A',
      b.resourceName ?? '-',
      b.userName ?? '-',
      b.userEmail ?? 'N/A',
      b.date ?? '-',
      `${b.startTime ?? '-'} - ${b.endTime ?? '-'}`,
      b.expectedAttendees != null ? String(b.expectedAttendees) : '-',
      b.status ?? '-',
    ]),
    theme: 'grid',
    headStyles: { fillColor: [109, 40, 217], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [247, 247, 250] },
    styles: { fontSize: 8.2, cellPadding: 2.2, overflow: 'linebreak', textColor: [55, 65, 81] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 24 },
      2: { cellWidth: 43 },
      3: { cellWidth: 28 },
      4: { cellWidth: 43 },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 26, halign: 'center' },
      7: { cellWidth: 17, halign: 'center' },
      8: { cellWidth: 20, halign: 'center' },
    },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(7.6);
    doc.setTextColor(145, 145, 150);
    doc.text(
      `Smart Campus Operations Hub  •  Page ${i} of ${pageCount}`,
      14,
      pageHeight - 6,
    );
  }

  doc.save(`bookings_report_${buildPdfFileDate(now)}.pdf`);
}
