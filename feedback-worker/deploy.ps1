# Puts the feedback server on Cloudflare and gives it the owner key from .owner-key.txt (kept out of git).
Set-Location $PSScriptRoot
npx --yes wrangler@3 deploy
if (-not (Test-Path .owner-key.txt)) { node -e "require('fs').writeFileSync('.owner-key.txt', require('crypto').randomBytes(24).toString('base64url'))" }
Get-Content .owner-key.txt -Raw | npx --yes wrangler@3 secret put OWNER_KEY
Write-Host "Done. Your owner key is in $PSScriptRoot\.owner-key.txt - paste it into Feedback > Owner in the game."
