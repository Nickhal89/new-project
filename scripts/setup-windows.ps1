Write-Host "========================================" -ForegroundColor Cyan
Write-Host "      Crossroads HR Setup (Windows)    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1) Check Node.js availability
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
  Write-Host "Node.js was not found." -ForegroundColor Red
  Write-Host "Please install Node.js 18+ from https://nodejs.org and run this script again." -ForegroundColor Yellow
  exit 1
}

# 2) Check Node.js major version >= 18
$nodeVersionRaw = node -v
$majorVersion = 0
if ($nodeVersionRaw -match '^v(\d+)') {
  $majorVersion = [int]$Matches[1]
}

if ($majorVersion -lt 18) {
  Write-Host "Detected Node.js version: $nodeVersionRaw" -ForegroundColor Red
  Write-Host "Crossroads HR needs Node.js 18 or newer." -ForegroundColor Yellow
  Write-Host "Please update Node.js and run this script again." -ForegroundColor Yellow
  exit 1
}

Write-Host "Node.js OK: $nodeVersionRaw" -ForegroundColor Green

# 3) Install dependencies
Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
  Write-Host "npm install failed. Please review the error above and retry." -ForegroundColor Red
  exit $LASTEXITCODE
}

# 4) Create .env.local interactively if missing
$envPath = Join-Path (Get-Location) ".env.local"
if (-not (Test-Path $envPath)) {
  Write-Host "No .env.local found. Let's create it now." -ForegroundColor Cyan

  $adminToken = Read-Host "Enter ADMIN_TOKEN (choose any secret value)"
  $supabaseUrl = Read-Host "Enter NEXT_PUBLIC_SUPABASE_URL (from Supabase Project Settings -> API)"
  $supabaseAnon = Read-Host "Enter NEXT_PUBLIC_SUPABASE_ANON_KEY (from Supabase Project Settings -> API)"
  $supabaseService = Read-Host "Enter SUPABASE_SERVICE_ROLE_KEY (from Supabase Project Settings -> API)"

  @"
NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabaseAnon
SUPABASE_SERVICE_ROLE_KEY=$supabaseService
NEXT_PUBLIC_BASE_URL=http://localhost:3000
ADMIN_TOKEN=$adminToken
"@ | Set-Content -Path $envPath -Encoding UTF8

  Write-Host ".env.local created successfully." -ForegroundColor Green
} else {
  Write-Host ".env.local already exists. Skipping env creation." -ForegroundColor Yellow
}

# 5) Print final URLs
$adminTokenPreview = "<YOUR_ADMIN_TOKEN>"
if (Test-Path $envPath) {
  $tokenLine = Get-Content $envPath | Where-Object { $_ -like 'ADMIN_TOKEN=*' } | Select-Object -First 1
  if ($tokenLine) {
    $adminTokenPreview = ($tokenLine -replace '^ADMIN_TOKEN=', '').Trim()
  }
}

Write-Host "" 
Write-Host "Setup complete. Starting development server..." -ForegroundColor Green
Write-Host "Open: http://localhost:3000/admin/demo?token=$adminTokenPreview" -ForegroundColor Cyan
Write-Host "Open: http://localhost:3000/admin/health?token=$adminTokenPreview" -ForegroundColor Cyan
Write-Host ""

# 6) Start app
npm run dev
