$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $repo
if ((git branch --show-current) -ne 'codex/category-alpha-review') { throw 'Review the branch before publishing.' }
if (git status --porcelain --untracked-files=no) { throw 'Commit tracked changes before publishing.' }
$link = Get-Content -LiteralPath (Join-Path $repo '.vercel/project.json') -Raw | ConvertFrom-Json
if ($link.projectId -ne 'prj_Bfam4j427T9FNcd7Lgd1Y0ND98Ad' -or $link.orgId -ne 'team_xoY8meY5PkChKnt10qSJI7t0') { throw 'Unexpected hosting project. Inspect the link before publishing.' }
$sha = (git rev-parse HEAD).Trim()
$release = Join-Path $repo ('.local/releases/' + $sha)
if (Test-Path -LiteralPath $release) { throw 'Release directory already exists. Inspect it rather than overwriting it.' }
New-Item -ItemType Directory -Path $release -Force | Out-Null
$archive = Join-Path $repo ('.local/releases/' + $sha + '.zip')
git archive --format=zip --output=$archive HEAD
if ($LASTEXITCODE -ne 0) { throw 'Source archive failed.' }
Expand-Archive -LiteralPath $archive -DestinationPath $release
New-Item -ItemType Directory -Path (Join-Path $release '.vercel') | Out-Null
Copy-Item -LiteralPath (Join-Path $repo '.vercel/project.json') -Destination (Join-Path $release '.vercel/project.json')
$env:NODE_USE_SYSTEM_CA = '1'
pnpm dlx vercel@59.26.0 project inspect --non-interactive --cwd $release --scope basla1
if ($LASTEXITCODE -ne 0) { throw 'Hosting project verification failed.' }
pnpm dlx vercel@59.26.0 deploy --prod --yes --cwd $release --scope basla1 --meta "sourceCommit=$sha"
if ($LASTEXITCODE -ne 0) { throw 'Deployment failed; inspect the reported deployment before retrying.' }
