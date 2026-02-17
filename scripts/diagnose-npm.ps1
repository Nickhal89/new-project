$ErrorActionPreference = 'Continue'

function Write-Title {
  param([string]$Text)
  Write-Host "" 
  Write-Host "===============================================" -ForegroundColor Cyan
  Write-Host " $Text" -ForegroundColor Cyan
  Write-Host "===============================================" -ForegroundColor Cyan
}

function Write-Ok { param([string]$Text) Write-Host "OK: $Text" -ForegroundColor Green }
function Write-Warn { param([string]$Text) Write-Host "ΠΡΟΣΟΧΗ: $Text" -ForegroundColor Yellow }
function Write-Err { param([string]$Text) Write-Host "ΣΦΑΛΜΑ: $Text" -ForegroundColor Red }

Write-Title "Crossroads HR - npm 403 Diagnostic"
Write-Host "Ασφαλές check: Δεν εμφανίζονται μυστικά κλειδιά." -ForegroundColor DarkGray

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue

if (-not $nodeCmd -or -not $npmCmd) {
  Write-Err "Δεν βρέθηκε Node.js ή npm στο σύστημα."
  Write-Host "Εγκατάσταση από: https://nodejs.org (LTS)"
  exit 1
}

Write-Title "1) Εκδόσεις"
$nodeVersion = node -v
$npmVersion = npm -v
Write-Host "Node.js: $nodeVersion"
Write-Host "npm:     $npmVersion"

Write-Title "2) Τρέχουσες npm ρυθμίσεις δικτύου"
$registry = npm config get registry
$proxy = npm config get proxy
$httpsProxy = npm config get https-proxy
Write-Host "registry:    $registry"
Write-Host "proxy:       $proxy"
Write-Host "https-proxy: $httpsProxy"

Write-Title "3) Reset npm registry"
npm config set registry https://registry.npmjs.org/
if ($LASTEXITCODE -eq 0) { Write-Ok "Το registry ορίστηκε σε https://registry.npmjs.org/" }
else { Write-Warn "Δεν ολοκληρώθηκε σωστά το set registry. Συνεχίζω..." }

Write-Title "4) Διαγραφή npm proxy settings"
npm config delete proxy
if ($LASTEXITCODE -eq 0) { Write-Ok "proxy setting removed" } else { Write-Warn "proxy delete επέστρεψε warning" }
npm config delete https-proxy
if ($LASTEXITCODE -eq 0) { Write-Ok "https-proxy setting removed" } else { Write-Warn "https-proxy delete επέστρεψε warning" }

Write-Title "5) npm ping test"
npm ping
$pingExit = $LASTEXITCODE

if ($pingExit -eq 0) {
  Write-Ok "Το npm ping πέτυχε (δίκτυο ΟΚ)."

  Write-Title "6) npm install"
  npm install
  if ($LASTEXITCODE -eq 0) {
    Write-Ok "Το npm install ολοκληρώθηκε επιτυχώς."
    Write-Host "Επόμενο βήμα: npm run dev"
    exit 0
  }

  Write-Err "Το npm install απέτυχε παρότι το ping πέτυχε."
  Write-Host "Έλεγξε το μήνυμα λάθους παραπάνω (ίσως εταιρικό policy ή package lock θέμα)."
  exit 2
}

Write-Err "Το npm ping απέτυχε."
Write-Host "" 
Write-Host "Κάνε αυτά τα βήματα και ξανατρέξε το script:" -ForegroundColor Yellow
Write-Host "1) Κλείσε VPN / εταιρικό proxy." -ForegroundColor Yellow
Write-Host "2) Κάνε προσωρινό pause antivirus Web Shield." -ForegroundColor Yellow
Write-Host "3) Δοκίμασε άλλο δίκτυο (π.χ. mobile hotspot)." -ForegroundColor Yellow
Write-Host "4) Ξανατρέξε: powershell -ExecutionPolicy Bypass -File .\scripts\diagnose-npm.ps1" -ForegroundColor Yellow
exit 3
