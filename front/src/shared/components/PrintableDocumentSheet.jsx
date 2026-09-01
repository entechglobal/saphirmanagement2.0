/**
 * Shared printable A4-style document sheet (HTML/JSX, not PDF blob).
 */
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { formatUnit } from "../utils/units";
import { resolveDocumentHeaderConfig } from "@/features/settings/documentHeader/documentHeaderConfig";
import {
  DocumentThemeHeader,
  DocumentThemeFooter,
  getTableHeaderStyle,
} from "@/features/settings/documentHeader/components/DocumentThemeHeader";

const money = (n) =>
  Number(n ?? 0).toLocaleString("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const qty = (n) =>
  Number(n ?? 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });

export const PrintableDocumentSheet = ({
  title,
  documentNumber,
  documentDate,
  subLine,
  infoBar,
  societe,
  client,
  clientLabel = "CLIENT",
  lines = [],
  hidePrices = false,
  notes,
  signatureLeft = "Signature société",
  signatureRight = "Signature client",
}) => {
  const { t } = useTranslation("common");
  const theme = resolveDocumentHeaderConfig(societe?.documentHeaderConfig);
  const bleed = theme.layout === "framed" || theme.layout === "wave";
  const thStyle = getTableHeaderStyle(theme);
  const cellBorder =
    theme.tableStyle === "bordered"
      ? { border: `1px solid ${theme.dividerColor}` }
      : { borderBottom: `1px solid ${theme.dividerColor}` };

  const totals = lines.reduce(
    (acc, l) => ({
      ht: acc.ht + Number(l.totalHT || 0),
      tva: acc.tva + Number(l.totalTVA || 0),
      ttc: acc.ttc + Number(l.totalTTC || 0),
    }),
    { ht: 0, tva: 0, ttc: 0 },
  );

  const formattedDate = documentDate
    ? dayjs(documentDate).format("DD/MM/YYYY")
    : "—";
  const subText =
    subLine || `N°: ${documentNumber || "—"}  |  Date: ${formattedDate}`;

  const header = (
    <DocumentThemeHeader
      title={title}
      subText={subText}
      documentNumber={documentNumber || "—"}
      documentDate={formattedDate}
      societe={societe}
      client={client}
      clientLabel={clientLabel}
      infoBar={infoBar}
      theme={theme}
    />
  );

  return (
    <article
      className="print-sheet mx-auto w-full max-w-[210mm] overflow-hidden bg-white text-black shadow-sm print:shadow-none"
      style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
    >
      {bleed ? header : null}

      <div className={`px-10 print:px-8 ${bleed ? "pb-6 pt-4" : "py-8 print:py-6"}`}>
        {!bleed && header}

        <table className="mt-5 w-full border-collapse text-[10px]">
          <thead>
            <tr className="text-left" style={thStyle}>
              <th className="px-2 py-2 font-bold" style={cellBorder}>
                N°
              </th>
              <th className="px-2 py-2 font-bold" style={cellBorder}>
                Désignation
              </th>
              <th className="px-2 py-2 font-bold text-right" style={cellBorder}>
                Qté
              </th>
              <th className="px-2 py-2 font-bold text-center" style={cellBorder}>
                Unité
              </th>
              {!hidePrices && (
                <>
                  <th className="px-2 py-2 font-bold text-right" style={cellBorder}>
                    P.U. (DH)
                  </th>
                  <th className="px-2 py-2 font-bold text-right" style={cellBorder}>
                    Rem %
                  </th>
                  <th className="px-2 py-2 font-bold text-right" style={cellBorder}>
                    Total HT
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => {
              const name =
                line.article?.name ||
                line.variant?.name ||
                line.description ||
                "—";
              const unit = formatUnit(
                line.article?.unitePrincipale?.symbol ||
                  line.variant?.article?.unitePrincipale?.symbol ||
                  "U",
                t,
              );
              return (
                <tr
                  key={line.id || i}
                  style={
                    i % 2 === 1 && theme.tableStyle === "solid"
                      ? { backgroundColor: "#f8fafc" }
                      : undefined
                  }
                >
                  <td className="px-2 py-2" style={cellBorder}>
                    {line.lineNumber ?? i + 1}
                  </td>
                  <td className="px-2 py-2" style={cellBorder}>
                    {name}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums" style={cellBorder}>
                    {qty(line.quantity)}
                  </td>
                  <td className="px-2 py-2 text-center" style={cellBorder}>
                    {unit}
                  </td>
                  {!hidePrices && (
                    <>
                      <td className="px-2 py-2 text-right tabular-nums" style={cellBorder}>
                        {money(line.unitPrice)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums" style={cellBorder}>
                        {money((Number(line.remise) || 0) * 100).replace(/,00$/, "")}%
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums" style={cellBorder}>
                        {money(line.totalHT)}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {lines.length === 0 && (
              <tr>
                <td
                  colSpan={hidePrices ? 4 : 7}
                  className="px-2 py-8 text-center text-neutral-400"
                >
                  Aucune ligne
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {!hidePrices && (
          <div className="mt-6 flex justify-end">
            <div className="w-56 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span>Total HT:</span>
                <span className="tabular-nums font-medium">{money(totals.ht)} DH</span>
              </div>
              <div className="flex justify-between">
                <span>Total TVA:</span>
                <span className="tabular-nums font-medium">{money(totals.tva)} DH</span>
              </div>
              <div
                className="flex justify-between pt-1.5 text-[12px] font-bold"
                style={{
                  borderTop: `1px solid ${theme.dividerColor}`,
                  backgroundColor:
                    theme.layout === "ledger" || theme.layout === "framed"
                      ? theme.highlightBg
                      : undefined,
                  padding: theme.layout === "ledger" || theme.layout === "framed" ? "4px 6px" : undefined,
                }}
              >
                <span>Total TTC:</span>
                <span className="tabular-nums">{money(totals.ttc)} DH</span>
              </div>
            </div>
          </div>
        )}

        {notes && theme.layout !== "atelier" && theme.layout !== "framed" && (
          <div className="mt-6 text-[10px]">
            <p className="font-bold">Notes:</p>
            <p className="mt-1 whitespace-pre-wrap" style={{ color: theme.textColor }}>
              {notes}
            </p>
          </div>
        )}

        {theme.layout !== "framed" && theme.layout !== "atelier" && (
          <div className="mt-14 grid grid-cols-2 gap-10 text-[11px]">
            <div>
              <p>{signatureLeft}</p>
              <div className="mt-10 border-b" style={{ borderColor: theme.dividerColor }} />
            </div>
            <div>
              <p>{signatureRight}</p>
              <div className="mt-10 border-b" style={{ borderColor: theme.dividerColor }} />
            </div>
          </div>
        )}

        {theme.layout === "atelier" && (
          <DocumentThemeFooter theme={theme} notes={notes} />
        )}
      </div>

      {theme.layout === "framed" && (
        <DocumentThemeFooter theme={theme} notes={notes} />
      )}
    </article>
  );
};
