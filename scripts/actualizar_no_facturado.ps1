# Actualiza los viajes sin facturar del dashboard (flujo semanal):
#   1. Descargar del TMS la consulta de viajes sin facturar -> Downloads\Consulta(77).xls
#   2. Correr este script:  powershell -File scripts\actualizar_no_facturado.ps1
#   3. Revisar el resumen, luego commit + push (Vercel despliega solo).
param(
  [string]$Xls = "$env:USERPROFILE\Downloads\Consulta(77).xls"
)
$ErrorActionPreference = "Stop"
if (-not (Test-Path $Xls)) { throw "No existe $Xls — descarga primero la consulta del TMS." }

$csv = Join-Path $env:TEMP "consulta77.csv"
if (Test-Path $csv) { Remove-Item $csv -Force }

Write-Host "Convirtiendo $Xls a CSV..."
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
  $wb = $excel.Workbooks.Open($Xls)
  # 62 = xlCSVUTF8 (Excel 2016+); si falla, 6 = CSV ANSI
  try { $wb.Sheets.Item(1).SaveAs($csv, 62) } catch { $wb.Sheets.Item(1).SaveAs($csv, 6) }
  $wb.Close($false)
} finally {
  $excel.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}

node (Join-Path $PSScriptRoot "generar_no_facturado.mjs") $csv
Write-Host ""
Write-Host "Listo. Ahora: git add src/data/noFacturado.js ; git commit ; git push"
