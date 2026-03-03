$ErrorActionPreference = 'Continue'

function Show-Header {
  Clear-Host
  Write-Host "===============================================" -ForegroundColor Cyan
  Write-Host "         CROSSROADS HR - GUIDED LAUNCHER       " -ForegroundColor Cyan
  Write-Host "===============================================" -ForegroundColor Cyan
  Write-Host "Για αρχάριους: διάλεξε μόνο αριθμό και Enter." -ForegroundColor Yellow
  Write-Host ""
}

function Pause-Back {
  Write-Host ""
  Read-Host "Πάτα Enter για επιστροφή στο μενού"
}

function Open-File-Friendly {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    Write-Host "Δεν βρέθηκε: $Path" -ForegroundColor Red
    return
  }

  $codeCmd = Get-Command code -ErrorAction SilentlyContinue
  if ($codeCmd) {
    Start-Process "code" -ArgumentList "`"$Path`""
  } else {
    Start-Process "notepad.exe" -ArgumentList "`"$Path`""
  }
}

function Ask-Value {
  param(
    [string]$Label,
    [string]$Help,
    [bool]$Secret = $false,
    [bool]$MustHttps = $false
  )

  while ($true) {
    Write-Host ""
    Write-Host "• $Label" -ForegroundColor Cyan
    Write-Host "  $Help" -ForegroundColor DarkGray

    if ($Secret) {
      $secure = Read-Host "  Δώσε τιμή" -AsSecureString
      $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
      try {
        $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
      } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
      }
    } else {
      $value = Read-Host "  Δώσε τιμή"
    }

    $value = "$value".Trim()

    if ([string]::IsNullOrWhiteSpace($value)) {
      Write-Host "  Σφάλμα: Δεν μπορεί να είναι κενό." -ForegroundColor Red
      continue
    }

    if ($MustHttps -and (-not $value.StartsWith('https://'))) {
      Write-Host "  Σφάλμα: Πρέπει να ξεκινά με https://" -ForegroundColor Red
      continue
    }

    return $value
  }
}

function Parse-EnvFile {
  param([string]$Path)

  $map = @{}
  if (-not (Test-Path $Path)) { return $map }

  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if ([string]::IsNullOrWhiteSpace($line)) { return }
    if ($line.StartsWith('#')) { return }
    $idx = $line.IndexOf('=')
    if ($idx -lt 1) { return }
    $k = $line.Substring(0, $idx).Trim()
    $v = $line.Substring($idx + 1).Trim()
    $map[$k] = $v
  }

  return $map
}

function Option-Open-Guides {
  Write-Host "Άνοιγμα οδηγών..." -ForegroundColor Green
  Open-File-Friendly (Join-Path (Get-Location) "README.md")
  Open-File-Friendly (Join-Path (Get-Location) "DEPLOY_VERCEL.md")
  Open-File-Friendly (Join-Path (Get-Location) "RUN_ME_FIRST_WINDOWS.md")
  Write-Host "OK: Οι οδηγοί άνοιξαν." -ForegroundColor Green
}

function Option-Create-Or-Fix-Env {
  $envPath = Join-Path (Get-Location) ".env.local"
  $existing = Parse-EnvFile $envPath

  if (Test-Path $envPath) {
    Write-Host "Βρέθηκε .env.local. Υπάρχουν τα κλειδιά:" -ForegroundColor Yellow
    if ($existing.Keys.Count -gt 0) {
      $existing.Keys | Sort-Object | ForEach-Object { Write-Host " - $_" }
    } else {
      Write-Host " - (κανένα έγκυρο key)" -ForegroundColor DarkYellow
    }
  } else {
    Write-Host "Δεν βρέθηκε .env.local. Θα δημιουργηθεί τώρα." -ForegroundColor Yellow
  }

  $supabaseUrl = Ask-Value -Label "NEXT_PUBLIC_SUPABASE_URL" -Help "Το βρίσκεις στο Supabase → Project Settings → API → Project URL" -MustHttps $true
  $anonKey = Ask-Value -Label "NEXT_PUBLIC_SUPABASE_ANON_KEY" -Help "Το βρίσκεις στο Supabase → Project Settings → API → anon public key" -Secret $true
  $serviceRole = Ask-Value -Label "SUPABASE_SERVICE_ROLE_KEY" -Help "Το βρίσκεις στο Supabase → Project Settings → API → service_role key" -Secret $true
  $demoViewKey = Ask-Value -Label "DEMO_VIEW_KEY" -Help "Βάλε το passcode που θα πληκτρολογεί ο HR στο /hr/demo"
  $adminToken = Ask-Value -Label "ADMIN_TOKEN" -Help "Βάλε admin token για admin endpoints/presenter πρόσβαση"
  $presenterToken = Ask-Value -Label "PRESENTER_TOKEN" -Help "Βάλε presenter token (μπορεί να είναι ίδιο με ADMIN_TOKEN)"

  $content = @(
    "NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey"
    "SUPABASE_SERVICE_ROLE_KEY=$serviceRole"
    "NEXT_PUBLIC_BASE_URL=http://localhost:3000"
    "DEMO_MODE=true"
    "DEMO_VIEW_KEY=$demoViewKey"
    "ADMIN_TOKEN=$adminToken"
    "PRESENTER_TOKEN=$presenterToken"
  ) -join "`r`n"

  Set-Content -Path $envPath -Value $content -Encoding UTF8
  Write-Host "OK: .env.local created/updated" -ForegroundColor Green
}

function Option-Run-App {
  Write-Host "Έλεγχος Node.js..." -ForegroundColor Cyan
  $nodeCmd = Get-Command node -ErrorAction SilentlyContinue

  if (-not $nodeCmd) {
    Write-Host "Δεν βρέθηκε Node.js." -ForegroundColor Red
    Write-Host "Θα ανοίξει η σελίδα εγκατάστασης: https://nodejs.org" -ForegroundColor Yellow
    Start-Process "https://nodejs.org"
    return
  }

  $v = node -v
  Write-Host "Node.js OK: $v" -ForegroundColor Green

  Write-Host "Τρέχω npm install..." -ForegroundColor Cyan
  npm install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Το npm install απέτυχε. Έλεγξε το μήνυμα παραπάνω." -ForegroundColor Red
    return
  }

  Write-Host "Άνοιγμα browser: http://localhost:3000/demo" -ForegroundColor Green
  Start-Process "http://localhost:3000/demo"

  Write-Host "Τρέχω npm run dev..." -ForegroundColor Cyan
  Write-Host "(Μείνε σε αυτό το παράθυρο όσο τρέχει η εφαρμογή)" -ForegroundColor DarkGray
  npm run dev
}

function Option-Show-Vercel-Steps {
  Write-Host "========== VERCEL DEPLOY (10 ΒΗΜΑΤΑ) ==========" -ForegroundColor Cyan
  Write-Host "1) Μπες στο vercel.com και κάνε login με GitHub."
  Write-Host "2) Πάτα Add New → Project."
  Write-Host "3) Βρες το repo Crossroads HR και πάτα Import."
  Write-Host "4) Άφησε Framework: Next.js (auto)."
  Write-Host "5) Στα Environment Variables βάλε:"
  Write-Host "   - NEXT_PUBLIC_SUPABASE_URL"
  Write-Host "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
  Write-Host "   - SUPABASE_SERVICE_ROLE_KEY"
  Write-Host "   - DEMO_MODE=true"
  Write-Host "   - DEMO_VIEW_KEY=π.χ. hrdemo2026"
  Write-Host "   - ADMIN_TOKEN=π.χ. admin2026"
  Write-Host "   - PRESENTER_TOKEN=π.χ. presenter2026"
  Write-Host "6) Πάτα Deploy."
  Write-Host "7) Άνοιξε /demo και έλεγξε ότι φορτώνει."
  Write-Host "8) Άνοιξε /hr/demo, βάλε DEMO_VIEW_KEY, και μπες."
  Write-Host "9) Πάτα Simulate Candidates και έλεγξε ranking/KPIs."
  Write-Host "10) Άνοιξε /demo/health και έλεγξε PASS checks."
  Write-Host "===============================================" -ForegroundColor Cyan
}

function Option-Health-Check {
  $running = $false
  try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3000/demo" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) { $running = $true }
  } catch {
    $running = $false
  }

  if ($running) {
    Write-Host "Η εφαρμογή φαίνεται ενεργή. Άνοιγμα /demo/health..." -ForegroundColor Green
    Start-Process "http://localhost:3000/demo/health"
  } else {
    Write-Host "Η εφαρμογή δεν φαίνεται να τρέχει." -ForegroundColor Yellow
    $choice = Read-Host "Θες να ξεκινήσεις τώρα με επιλογή [3]; (Y/N)"
    if ($choice.Trim().ToUpper() -eq 'Y') {
      Option-Run-App
    } else {
      Write-Host "OK. Πρώτα τρέξε την επιλογή [3]." -ForegroundColor Yellow
    }
  }
}

while ($true) {
  Show-Header
  Write-Host "[1] Άνοιγμα σημαντικών οδηγών"
  Write-Host "[2] Δημιουργία / Διόρθωση .env.local (αυτόματα)"
  Write-Host "[3] Εγκατάσταση + Εκκίνηση εφαρμογής (one-click)"
  Write-Host "[4] Προβολή Vercel Deploy Steps"
  Write-Host "[5] Demo Health Check τοπικά"
  Write-Host "[0] Έξοδος"
  Write-Host ""

  $opt = Read-Host "Διάλεξε επιλογή"

  try {
    switch ($opt) {
      '1' { Option-Open-Guides; Pause-Back }
      '2' { Option-Create-Or-Fix-Env; Pause-Back }
      '3' { Option-Run-App; Pause-Back }
      '4' { Option-Show-Vercel-Steps; Pause-Back }
      '5' { Option-Health-Check; Pause-Back }
      '0' { break }
      default {
        Write-Host "Μη έγκυρη επιλογή. Δοκίμασε 0-5." -ForegroundColor Red
        Pause-Back
      }
    }
  } catch {
    Write-Host "Κάτι πήγε στραβά, αλλά συνεχίζουμε με ασφάλεια." -ForegroundColor Red
    Write-Host "Λεπτομέρεια: $($_.Exception.Message)" -ForegroundColor DarkYellow
    Pause-Back
  }
}

Write-Host "Έξοδος launcher. Καλή συνέχεια!" -ForegroundColor Cyan
