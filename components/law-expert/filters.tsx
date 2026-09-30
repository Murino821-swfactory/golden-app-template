"use client";
import type { SearchFilters } from "@/lib/law-expert/types";
import { COURT_TYPES, REGIONS, FORMS } from "@/lib/law-expert/copy";
const fieldClass = "min-w-0 w-full h-11 rounded-md border border-border bg-background px-3 text-base sm:text-sm";
export function Filters({ value, onChange, sk, disabled = false }: { value: SearchFilters; onChange: (v: SearchFilters) => void; sk: boolean; disabled?: boolean }) {
  function set(key: keyof SearchFilters, v: string) {
    const next = { ...value, [key]: v || undefined, page: 0 };
    onChange(next);
  }
  return <fieldset disabled={disabled} className="space-y-3">
    <legend className="mb-2 font-medium">{sk ? "Zdroje a obmedzenia" : "Sources and limits"}</legend>
    <div className="grid gap-3 sm:grid-cols-2">
      {([
        ["source", sk ? "Zdroj" : "Source", [["all", "InfoSúd + NS SR"], ["infosud", "InfoSúd"], ["nsud", "NS SR OpenData"]]],
        ["courtType", sk ? "Typ súdu" : "Court type", [["", sk ? "Všetky súdy" : "All courts"], ...COURT_TYPES.map(s => [s, s])]],
        ["lawArea", sk ? "Oblasť práva (metadáta)" : "Legal area (metadata)", [["", sk ? "Bez obmedzenia" : "Unrestricted"], ...["Trestné právo", "Občianske právo", "Obchodné právo", "Rodinné právo", "Správne právo"].map(s => [s, s])]],
        ["region", sk ? "Kraj (InfoSúd)" : "Region (InfoSúd)", [["", sk ? "Všetky kraje" : "All regions"], ...REGIONS.map(s => [s, s])]],
        ["form", sk ? "Forma (InfoSúd)" : "Form (InfoSúd)", [["", sk ? "Všetky formy" : "All forms"], ...FORMS.map(s => [s, s])]],
      ] as [keyof SearchFilters, string, string[][]][]).map(([key, label, options]) => <label key={key} className="space-y-1 text-sm">
        <span>{label}</span><select aria-label={label} value={String(value[key] ?? (key === "source" ? "all" : ""))} onChange={e => set(key, e.target.value)} className={fieldClass}>
          {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
        </select>
      </label>)}
      {([
        ["from", sk ? "Dátum od" : "Date from", "date"], ["to", sk ? "Dátum do" : "Date to", "date"],
        ["fileNumber", sk ? "Spisová značka" : "File number", "text"], ["ecli", "ECLI", "text"],
        ["paragraph", sk ? "Odkaz na § Trestného zákona (InfoSúd)" : "Criminal Code § reference (InfoSúd)", "text"],
      ] as [keyof SearchFilters, string, string][]).map(([key, label, type]) => <label key={key} className="min-w-0 space-y-1 text-sm">
        <span>{label}</span><input aria-label={label} type={type} value={String(value[key] ?? "")} maxLength={key === "paragraph" ? 4 : 120} onChange={e => set(key, e.target.value)} className={fieldClass} />
      </label>)}
    </div>
    <p className="text-xs text-muted-foreground">{sk
      ? "Bez dátumu sa hľadá aj v starších rozhodnutiach. Oblasť a paragraf sú filtre metadát — môžu vynechať relevantné texty. NS SR nepodporuje kraj, formu, tento paragrafový filter ani samostatné rodinné právo; pri ich použití sa tento zdroj neprehľadáva."
      : "No date limit includes older decisions. Area and section filter metadata and may miss relevant text. NS SR does not support region, form, this section filter or a separate family-law category; these filters exclude that source."}</p>
    <button type="button" onClick={() => onChange({ source: "all" })} className="min-h-11 text-sm underline">{sk ? "Zrušiť obmedzenia" : "Clear limits"}</button>
  </fieldset>;
}
