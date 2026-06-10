// Verifica que el filtro de filas TOTALES de fetchFinCSV excluya lo correcto
import Papa from "papaparse";
const urls = {
  finDAP: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGj2ZfrfOA8xOPRV4_Z1H2wnCpBfEav9PgbD67iKw4b-R0Inuk_LgiPQ6wJk66N1M3AXIy0ZXhLLcJ/pub?gid=1020614134&single=true&output=csv",
  finCalendario: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGj2ZfrfOA8xOPRV4_Z1H2wnCpBfEav9PgbD67iKw4b-R0Inuk_LgiPQ6wJk66N1M3AXIy0ZXhLLcJ/pub?gid=1876759165&single=true&output=csv",
  leasingDetalle: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGj2ZfrfOA8xOPRV4_Z1H2wnCpBfEav9PgbD67iKw4b-R0Inuk_LgiPQ6wJk66N1M3AXIy0ZXhLLcJ/pub?gid=675670021&single=true&output=csv",
  finFondos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGj2ZfrfOA8xOPRV4_Z1H2wnCpBfEav9PgbD67iKw4b-R0Inuk_LgiPQ6wJk66N1M3AXIy0ZXhLLcJ/pub?gid=1691837276&single=true&output=csv",
};
const esTotal = (v) => /^TOTAL(ES)?$/i.test(v) || /^TOTALES\s/i.test(v);
for (const [k, url] of Object.entries(urls)) {
  const text = await (await fetch(url)).text();
  const rows = Papa.parse(text, { header: false, skipEmptyLines: true }).data;
  let tot = 0; const preservados = [];
  rows.forEach(r => {
    const filled = r.map(c => String(c == null ? "" : c).trim()).filter(v => v !== "");
    if (filled.some(esTotal)) tot++;
    else filled.forEach(v => { if (/^total/i.test(v)) preservados.push(v); });
  });
  console.log(`${k}: filas TOTAL excluidas=${tot}, textos "Total..." legítimos preservados=${JSON.stringify(preservados.slice(0,5))}`);
}
