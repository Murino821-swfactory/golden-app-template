# agro-land — Slovak farmland quality and use per H3 hexagon

Built for Agromapa (`demo/agromapa`, apps.tokenwise.sk/newapp/agromapa). Licences verified
2026-10-17 in the national open-data catalogue (data.slovensko.sk, SPARQL `termsOfUse`).

| Source | Publisher | Licence | Version used |
|---|---|---|---|
| [Bonitované pôdnoekologické jednotky (BPEJ)](https://data.slovensko.sk/datasety/46120bf5-30e4-4031-b471-6d5d1f4dfaba) — shapefile | NPPC-VÚPOP | **CC0 1.0** | `BPEJ_20260508_DS` (141 665 polygons) |
| [LPIS diely pôdnych blokov 2026](https://data.slovensko.sk/datasety/4c408849-80e9-41a2-8c93-08a65b7ce4fb) — shapefile | PPA | **CC BY 4.0** — attribution required | `DPB2026_20261006` (197 506 blocks) |

Attribution shown on the map: *„Zdroj: NPPC-VÚPOP (BPEJ, CC0), PPA (LPIS 2026, CC BY 4.0)"*.

**Not used, on purpose**
- *Hranice užívania* (PPA, CC BY 4.0) — farmers' declared use boundaries; finer, but tied to
  applicants for subsidies. Blocks answer the question without it.
- VÚPOP ArcGIS REST (`portal.vupop.sk/arcgis/rest/services/BPEJ/…`, incl. the €/m² layer
  under vyhláška 38/2005) — public and queryable, but no licence is published for it, and
  NPPC's price list sells the BPEJ vector layer (whole SR: 61 500 € with VAT, 2025). The CC0
  catalogue release is the clean path; the price layer stays out until NPPC confirms terms.

## Output

`{ meta, cultures[], localities[], res6[][], res7[][] }`, each row
`[cell, bh, group, agriShare, arableShare, avgBlockHa, culture, locality]`:

| Column | Meaning |
|---|---|
| `bh` | area-weighted mean BPEJ production-potential points, 0–100 |
| `group` | dominant BPEJ quality group, 1 (best) – 9 |
| `agriShare` | LPIS block area ÷ cell area |
| `arableShare` | arable land (`orná pôda`) ÷ LPIS area |
| `avgBlockHa` | LPIS area ÷ blocks counted in the cell — a fragmentation-of-use proxy, **not** ownership fragmentation |
| `culture`, `locality` | indices into `cultures` / `localities`, by largest area |

No price and no rent: neither source carries them.

## Rebuild

```bash
# downloads (≈ 90 MB + 400 MB zip) — into a fresh scratch directory, never the repo
curl -L -o bpej.zip "https://data.slovensko.sk/download?id=1e65c3b9-ef3f-427a-b39a-a9e13b5e5ff4"
curl -L -o dpb.zip  "https://data.slovensko.sk/download?id=02fd1da6-f051-49a4-b661-be2d530e0761"
unzip bpej.zip -d bpej && unzip dpb.zip -d dpb
npm run build:agro-land -w @tokenwise/hex-map -- \
  --bpej bpej/BPEJ_20260508_DS.shp --lpis dpb/DPB2026_20261006shp/DPB2026_20261006.shp \
  --out agro-land.json
```

Coordinates are S-JTSK / Krovak East North (EPSG:5514), converted with the 7-parameter
`towgs84` shift; checked against a Lužianky block (48.33 N, 18.03 E). The download ids
change when the publishers upload a new year — look the dataset up again in the catalogue.
