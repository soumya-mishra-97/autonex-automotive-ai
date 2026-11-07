import { jsPDF } from "jspdf";
import type { AgentRun } from "../domain/models";
import { saveDownload } from "./download";

/** Loaded on demand only. Local reports contain no claimed backend or live-tool activity. */
export async function downloadBrowserReport(run: AgentRun): Promise<void> {
  const pdf = new jsPDF();
  const width = 166;
  let y = 24;
  const normalize = (value: string) =>
    value.replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/·/g, "|");
  const paragraph = (value: string, heading = false) => {
    pdf.setFont("times", heading ? "bold" : "normal");
    pdf.setFontSize(heading ? 13 : 10);
    pdf.setTextColor(heading ? "#800020" : "#23111a");
    const lines: string[] = pdf.splitTextToSize(normalize(value), width) as string[];
    if (heading && y > 260) {
      pdf.addPage();
      y = 24;
    }
    for (const line of lines) {
      if (y > 271) {
        pdf.addPage();
        y = 24;
      }
      pdf.text(line, 22, y);
      y += heading ? 6 : 5;
    }
    y += heading ? 4 : 3;
  };
  paragraph("AUTONEX AI - EXECUTION REPORT", true);
  paragraph("BROWSER DEMONSTRATION | ENTERPRISE AUTOMOTIVE AI ORCHESTRATION");
  paragraph(`Run: ${run.id} | ${run.created_at}`);
  paragraph("REQUEST", true);
  paragraph(run.prompt);
  paragraph("RESPONSE", true);
  paragraph(run.summary);
  paragraph(run.rationale);
  paragraph("ILLUSTRATIVE CONFIGURATION", true);
  run.quote.lines.forEach((line) =>
    paragraph(`${line.label}: USD ${line.amount.toLocaleString("en-US")}`),
  );
  paragraph(`TOTAL: USD ${run.quote.total.toLocaleString("en-US")}`);
  paragraph("RECORDED LOCAL WORKFLOW", true);
  run.trace.forEach((step) => paragraph(`${step.label}: ${step.duration_ms} ms. ${step.detail}`));
  paragraph("SOURCES", true);
  if (!run.sources.length)
    paragraph(
      "Insufficient retrieved evidence. Verify important details with an authorized source.",
    );
  run.sources.forEach((source) => {
    paragraph(source.title, true);
    paragraph(`Version: ${source.version} | ID: ${source.id}`);
    paragraph(source.excerpt);
    if (source.url) paragraph(source.url);
  });
  paragraph("DISCLOSURES", true);
  run.warnings.forEach((warning) => paragraph(warning));
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.setFont("times", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor("#795c64");
    pdf.text(`AUTONEX AI | LOCAL DEMONSTRATION | PAGE ${page} / ${pages}`, 22, 286);
  }
  saveDownload(pdf.output("blob"), `autonex-${run.id}.pdf`);
}
