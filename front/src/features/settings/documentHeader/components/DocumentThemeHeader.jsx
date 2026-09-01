/**
 * HTML header chrome for the 5 invoice-style document templates.
 */
import { resolveDocumentHeaderConfig } from "@/features/settings/documentHeader/documentHeaderConfig";

const line = (v) => (v ? <p className="text-[9px] leading-snug">{v}</p> : null);

export const DocumentThemeHeader = ({
  title,
  subText,
  documentNumber,
  documentDate,
  societe,
  client,
  clientLabel = "CLIENT",
  infoBar,
  theme: themeProp,
  compact = false,
}) => {
  const theme =
    themeProp || resolveDocumentHeaderConfig(societe?.documentHeaderConfig);
  const layout = theme.layout;
  const num = documentNumber || "—";
  const date = documentDate || "—";
  const company = societe?.raisonSocial || "Ma Société";
  const phone = societe?.tel || societe?.phone;
  const padX = compact ? "px-2" : "px-0";

  if (layout === "ledger") {
    return (
      <div className={padX}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {theme.showLogo && societe?.logo && (
              <img src={societe.logo} alt="" className="mb-1.5 h-9 w-9 object-contain" />
            )}
            <p className="text-[13px] font-bold" style={{ color: theme.primaryColor }}>
              {company}
            </p>
            {theme.showAddress && line(societe?.address)}
            {theme.showPhone && phone && (
              <p className="text-[9px]" style={{ color: theme.textColor }}>
                Tél: {phone}
              </p>
            )}
            {theme.showIce && societe?.ice && (
              <p className="text-[9px]" style={{ color: theme.textColor }}>
                ICE: {societe.ice}
              </p>
            )}
          </div>
          <div className="w-[42%] shrink-0">
            <p
              className="text-right text-[22px] font-bold uppercase tracking-wide"
              style={{ color: theme.titleColor }}
            >
              {title}
            </p>
            <table className="mt-2 w-full border-collapse text-[8px]">
              <tbody>
                {[
                  ["Date", date],
                  ["N°", num],
                  ["Infos", infoBar || "—"],
                ].map(([label, value], i) => (
                  <tr key={label}>
                    <td
                      className="border px-1.5 py-1 font-semibold"
                      style={{
                        borderColor: theme.dividerColor,
                        backgroundColor: i === 2 ? theme.highlightBg : undefined,
                      }}
                    >
                      {label}
                    </td>
                    <td
                      className="border px-1.5 py-1"
                      style={{
                        borderColor: theme.dividerColor,
                        backgroundColor: i === 2 ? theme.highlightBg : undefined,
                      }}
                    >
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div
          className="mt-3 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white"
          style={{ backgroundColor: theme.primaryColor }}
        >
          {clientLabel}
        </div>
        <div className="border border-t-0 px-2 py-2 text-[9px]" style={{ borderColor: theme.dividerColor }}>
          <p className="font-semibold" style={{ color: theme.accentColor }}>
            {client?.name || "—"}
          </p>
          {line(client?.address)}
          {client?.phone && <p>Tél: {client.phone}</p>}
        </div>
      </div>
    );
  }

  if (layout === "strip") {
    return (
      <div className={padX}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {theme.showLogo && societe?.logo && (
              <img src={societe.logo} alt="" className="h-10 w-10 object-contain" />
            )}
            <div>
              <p className="text-[12px] font-bold" style={{ color: theme.accentColor }}>
                {company}
              </p>
              {theme.showAddress && (
                <p className="text-[8px]" style={{ color: theme.textColor }}>
                  {societe?.address}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[14px] font-bold" style={{ color: theme.titleColor }}>
              {title} {num !== "—" ? num : ""}
            </p>
            <p className="text-[8px]" style={{ color: theme.textColor }}>
              {subText}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4 text-[9px]">
          <div>
            <p className="text-[8px] font-bold uppercase" style={{ color: theme.textColor }}>
              {clientLabel}
            </p>
            <p className="mt-0.5 font-semibold" style={{ color: theme.accentColor }}>
              {client?.name || "—"}
            </p>
            {line(client?.address)}
          </div>
          <div className="text-right text-[8px]" style={{ color: theme.textColor }}>
            <p>Date: {date}</p>
            <p>N°: {num}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 overflow-hidden rounded text-[8px] text-white">
          <div className="px-2 py-2" style={{ backgroundColor: theme.primaryColor }}>
            <p className="opacity-80">N°</p>
            <p className="font-bold">{num}</p>
          </div>
          <div className="px-2 py-2" style={{ backgroundColor: theme.primaryColor }}>
            <p className="opacity-80">Date</p>
            <p className="font-bold">{date}</p>
          </div>
          <div className="px-2 py-2" style={{ backgroundColor: theme.primaryColor }}>
            <p className="opacity-80">Infos</p>
            <p className="truncate font-bold">{infoBar || "—"}</p>
          </div>
          <div className="px-2 py-2" style={{ backgroundColor: theme.highlightBg }}>
            <p className="opacity-80">Document</p>
            <p className="font-bold uppercase">{title}</p>
          </div>
        </div>
      </div>
    );
  }

  if (layout === "framed") {
    return (
      <div>
        <div
          className={`flex items-start justify-between gap-3 text-white ${compact ? "px-2 py-2" : "px-0 py-4"}`}
          style={{ backgroundColor: theme.primaryColor }}
        >
          <p className="text-[18px] font-bold uppercase tracking-wide">{title}</p>
          <div className="max-w-[50%] text-right text-[8px] leading-snug opacity-95">
            <p className="font-bold">{company}</p>
            {theme.showAddress && <p>{societe?.address}</p>}
            {theme.showPhone && phone && <p>{phone}</p>}
            {theme.showIce && societe?.ice && <p>ICE {societe.ice}</p>}
          </div>
        </div>
        <div className={`mt-3 grid grid-cols-2 gap-4 text-[9px] ${padX}`}>
          <div>
            <p>
              <span className="font-bold">N°:</span> {num}
            </p>
            <p>
              <span className="font-bold">Date:</span> {date}
            </p>
            {infoBar && (
              <p className="mt-1" style={{ color: theme.textColor }}>
                {infoBar}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="font-bold uppercase" style={{ color: theme.primaryColor }}>
              {clientLabel}
            </p>
            <p className="font-semibold" style={{ color: theme.accentColor }}>
              {client?.name || "—"}
            </p>
            {line(client?.address)}
            {client?.phone && <p>{client.phone}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (layout === "wave") {
    return (
      <div>
        <div
          className={`relative overflow-hidden text-white ${compact ? "px-2 pb-5 pt-2" : "px-0 pb-8 pt-4"}`}
          style={{
            background: `linear-gradient(120deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
            borderBottomLeftRadius: compact ? "40% 18px" : "45% 28px",
            borderBottomRightRadius: compact ? "55% 14px" : "60% 22px",
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[18px] font-bold uppercase tracking-wide">{title}</p>
            <p className="text-[10px] font-semibold">N°: {num}</p>
          </div>
        </div>
        <div className={`mt-3 grid grid-cols-2 gap-4 text-[9px] ${padX}`}>
          <div>
            <p className="font-bold" style={{ color: theme.accentColor }}>
              {clientLabel}:
            </p>
            <p style={{ color: theme.textColor }}>{client?.name || "—"}</p>
            {line(client?.address)}
            {client?.phone && (
              <p style={{ color: theme.textColor }}>{client.phone}</p>
            )}
            <p className="mt-2 text-[8px]" style={{ color: theme.textColor }}>
              Date: {date}
            </p>
          </div>
          <div>
            <p className="font-bold" style={{ color: theme.accentColor }}>
              De:
            </p>
            <p style={{ color: theme.textColor }}>{company}</p>
            {theme.showAddress && line(societe?.address)}
            {theme.showPhone && phone && (
              <p style={{ color: theme.textColor }}>{phone}</p>
            )}
          </div>
        </div>
        {infoBar && (
          <p className={`mt-2 text-[8px] ${padX}`} style={{ color: theme.infoBarText }}>
            {infoBar}
          </p>
        )}
      </div>
    );
  }

  // atelier
  return (
    <div className={padX}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="text-[20px] font-bold uppercase tracking-wide"
            style={{ color: theme.titleColor }}
          >
            {title}
          </p>
          <p className="mt-1 text-[11px] font-semibold" style={{ color: theme.accentColor }}>
            {company}
          </p>
          {theme.showAddress && (
            <p className="text-[8px]" style={{ color: theme.textColor }}>
              {societe?.address}
            </p>
          )}
          {theme.showPhone && phone && (
            <p className="text-[8px]" style={{ color: theme.textColor }}>
              {phone}
            </p>
          )}
        </div>
        {theme.showLogo && societe?.logo ? (
          <img src={societe.logo} alt="" className="h-12 w-12 object-contain" />
        ) : (
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-[8px] font-bold text-white"
            style={{ backgroundColor: "#94a3b8" }}
          >
            LOGO
          </div>
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-[9px]">
        <div>
          <p className="text-[8px] font-bold uppercase" style={{ color: theme.primaryColor }}>
            {clientLabel}
          </p>
          <p className="mt-0.5 font-semibold">{client?.name || "—"}</p>
          {line(client?.address)}
        </div>
        <div>
          <p className="text-[8px] font-bold uppercase" style={{ color: theme.primaryColor }}>
            Contact
          </p>
          {client?.phone && <p className="mt-0.5">{client.phone}</p>}
          {theme.showIce && societe?.ice && <p>ICE {societe.ice}</p>}
        </div>
        <div className="text-right">
          <p className="text-[8px] font-bold uppercase" style={{ color: theme.primaryColor }}>
            N° Doc
          </p>
          <p>{num}</p>
          <p className="mt-1 text-[8px] font-bold uppercase" style={{ color: theme.primaryColor }}>
            Date
          </p>
          <p>{date}</p>
        </div>
      </div>
      <div className="mt-3 h-0.5" style={{ backgroundColor: theme.secondaryColor }} />
      {infoBar && (
        <p className="mt-2 text-[8px]" style={{ color: theme.infoBarText }}>
          {infoBar}
        </p>
      )}
    </div>
  );
};

export const DocumentThemeFooter = ({ theme, notes }) => {
  if (theme.layout === "framed") {
    return (
      <div
        className="mt-8 px-4 py-3 text-center text-[11px] font-semibold text-white"
        style={{ backgroundColor: theme.primaryColor }}
      >
        {notes || "Merci pour votre confiance !"}
      </div>
    );
  }
  if (theme.layout === "atelier") {
    return (
      <div className="mt-10 flex items-end justify-between gap-4">
        <p
          className="text-[22px] italic"
          style={{ color: theme.primaryColor, fontFamily: "Georgia, serif" }}
        >
          Merci
        </p>
        <div className="max-w-[50%] border-l pl-3 text-[9px]" style={{ borderColor: theme.dividerColor }}>
          <p className="font-bold uppercase" style={{ color: theme.secondaryColor }}>
            Conditions
          </p>
          <p className="mt-1" style={{ color: theme.textColor }}>
            {notes || "Paiement à réception. Merci pour votre collaboration."}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export const getTableHeaderStyle = (theme) => {
  const base = { color: theme.tableHeaderText || theme.accentColor };
  if (theme.tableStyle === "solid") {
    return { ...base, backgroundColor: theme.tableHeaderBg };
  }
  if (theme.tableStyle === "lined") {
    return {
      ...base,
      backgroundColor: "transparent",
      borderTop: `1px solid ${theme.dividerColor}`,
      borderBottom: `2px solid ${theme.primaryColor === theme.dividerColor ? theme.secondaryColor || theme.primaryColor : theme.primaryColor}`,
    };
  }
  return { ...base, backgroundColor: theme.tableHeaderBg };
};
