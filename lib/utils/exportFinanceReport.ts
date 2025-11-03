import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Export finance data to CSV
 * @param data - monthlyData array [{ month, Earnings/Payouts, Revenue }]
 */
export function exportFinanceCSV(data: any[]) {
  if (!data || data.length === 0) {
    alert("No data to export.");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","), // header row
    ...data.map((row) => headers.map((h) => row[h]).join(",")),
  ];

  const blob = new Blob([csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Finance_Report_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  link.click();
}

/**
 * Export finance data to PDF (Admin + Partner)
 * @param stats - financial summary object
 * @param data - monthly chart data
 */
export function exportFinancePDF(stats: any, data: any[]) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  doc.setFontSize(18);
  doc.text("BHARATCOMFORT11 Finance Report", 40, 40);

  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleString("en-IN")}`, 40, 60);

  // Summary Section
  doc.setFontSize(14);
  doc.text("Summary Overview", 40, 90);
  const summaryRows = [
    ["Total Revenue", `₹${stats.totalRevenue?.toLocaleString("en-IN") || 0}`],
    ["Total Payouts", `₹${stats.totalPayouts?.toLocaleString("en-IN") || 0}`],
    ["Pending Settlements", stats.pendingSettlements || 0],
    ["Total Commission", `₹${stats.totalCommission?.toLocaleString("en-IN") || 0}`],
    ["GST (18%)", `₹${stats.gstCollected?.toLocaleString("en-IN") || 0}`],
  ];

  autoTable(doc, {
    startY: 100,
    head: [["Metric", "Value"]],
    body: summaryRows,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 5 },
    headStyles: { fillColor: [66, 133, 244] },
  });

  // Monthly Performance Section
  doc.setFontSize(14);
  doc.text("Monthly Performance", 40, doc.lastAutoTable.finalY + 30);

  const chartRows = data.map((row) => [
    row.month,
    row.Revenue ? `₹${row.Revenue.toLocaleString("en-IN")}` : "-",
    row.Payouts || row.Earnings
      ? `₹${(row.Payouts || row.Earnings).toLocaleString("en-IN")}`
      : "-",
  ]);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 40,
    head: [["Month", "Revenue", "Payouts"]],
    body: chartRows,
    theme: "striped",
    styles: { fontSize: 10, cellPadding: 5 },
    headStyles: { fillColor: [40, 167, 69] },
  });

  doc.save(`Finance_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
