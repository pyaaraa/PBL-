import PDFDocument from "pdfkit";

export function streamCertificatePdf(res, certificate) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=certificate-${certificate.tokenId}.pdf`
  );

  doc.pipe(res);

  doc.rect(20, 20, 555, 801).strokeColor("#3b82f6").lineWidth(2).stroke();
  doc
    .fillColor("#111827")
    .fontSize(26)
    .text("DAuth Academic Certificate", { align: "center" });

  doc.moveDown(1.5);
  doc.fontSize(16).fillColor("#374151").text("This certifies that", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(20).fillColor("#111827").text(certificate.walletAddress, { align: "center" });
  doc.moveDown(0.75);
  doc
    .fontSize(16)
    .fillColor("#374151")
    .text(`has been awarded the degree: ${certificate.degreeName}`, { align: "center" });
  doc.moveDown(0.5);
  doc.text(`University: ${certificate.universityName}`, { align: "center" });
  doc.moveDown(0.5);
  doc.text(`Issue Date: ${new Date(certificate.issueDate).toLocaleDateString()}`, {
    align: "center",
  });
  doc.moveDown(0.5);
  doc.text(`Token ID: ${certificate.tokenId}`, { align: "center" });
  doc.moveDown(0.5);
  doc.text(`Metadata: ${certificate.metadataUri}`, {
    align: "center",
    width: 500,
  });
  doc.moveDown(1.5);
  doc.fontSize(12).fillColor("#6b7280").text("Verify this certificate on DAuth", { align: "center" });

  doc.end();
}
