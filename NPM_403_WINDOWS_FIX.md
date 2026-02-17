# npm 403 σε Windows — Γρήγορη διόρθωση

Αν το `npm install` γράφει `403 Forbidden`:

1. Κλείσε VPN/εταιρικό proxy.
2. Τρέξε στο PowerShell:
   - `npm config set registry https://registry.npmjs.org/`
   - `npm config delete proxy`
   - `npm config delete https-proxy`
   - `npm cache clean --force`
   - `npm ping`
3. Αν το `npm ping` πετύχει, τρέξε `npm install`.
4. Αν αποτύχει, δοκίμασε hotspot από κινητό και προσωρινό pause στο antivirus web shield.

## Αυτόματη διάγνωση
- `powershell -ExecutionPolicy Bypass -File .\scripts\diagnose-npm.ps1`
- (προαιρετικά) διπλό κλικ στο `DIAGNOSE_NPM.bat`
