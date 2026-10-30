param(
  [Parameter(Mandatory=$true)][string]$RunFolder,
  [Parameter(Mandatory=$true)][string]$OutputFolder
)
$ErrorActionPreference='Stop'
$taskRunRoot=(Resolve-Path -LiteralPath $RunFolder).Path
$taskHarnessRoot=$PSScriptRoot
New-Item -ItemType Directory -Path $OutputFolder -Force | Out-Null
$taskOutputRoot=(Resolve-Path -LiteralPath $OutputFolder).Path
$taskSummary=Get-Content -Raw -LiteralPath (Join-Path $taskRunRoot 'summary.json') | ConvertFrom-Json
if(Test-Path -LiteralPath (Join-Path $taskRunRoot 'process.lock')){throw 'Wait until the run has stopped before packaging.'}
$taskStage=Join-Path $taskRunRoot ('private-stage-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $taskStage | Out-Null
$taskResultRoot=Join-Path $taskStage 'ledger-result'
New-Item -ItemType Directory -Path $taskResultRoot | Out-Null
foreach($taskName in @('src','docs','test','acceptance','scripts','backlog','AGENTS.md','README.md','package.json','tests.lock.json')){
 $taskSource=Join-Path (Join-Path $taskRunRoot 'integrated') $taskName
 if(Test-Path -LiteralPath $taskSource){Copy-Item -LiteralPath $taskSource -Destination $taskResultRoot -Recurse}
}
$taskEvidenceRoot=Join-Path $taskStage 'run-evidence'
New-Item -ItemType Directory -Path $taskEvidenceRoot | Out-Null
foreach($taskName in @('evidence','checks','events.jsonl','state.json','summary.json','writeup.md')){
 $taskSource=Join-Path $taskRunRoot $taskName
 if(Test-Path -LiteralPath $taskSource){Copy-Item -LiteralPath $taskSource -Destination $taskEvidenceRoot -Recurse}
}
$taskPublicZip=Join-Path $taskOutputRoot 'collision-harness-public.zip'
& git -C $taskHarnessRoot archive --format=zip --output=$taskPublicZip HEAD
if($LASTEXITCODE -ne 0){throw 'Could not export the harness commit'}
Copy-Item -LiteralPath $taskPublicZip -Destination (Join-Path $taskStage 'collision-harness-public.zip')
Copy-Item -LiteralPath (Join-Path $taskRunRoot 'writeup.md') -Destination (Join-Path $taskOutputRoot 'writeup.md')
Copy-Item -LiteralPath (Join-Path $taskRunRoot 'summary.json') -Destination (Join-Path $taskOutputRoot 'summary.json')
$taskPatch=& git -C (Join-Path $taskRunRoot 'integrated') diff --binary $((Get-Content -Raw -LiteralPath (Join-Path $taskRunRoot 'state.json') | ConvertFrom-Json).baseline) $taskSummary.finalCommit -- src
if($LASTEXITCODE -ne 0){throw 'Could not export final source changes'}
[IO.File]::WriteAllLines((Join-Path $taskOutputRoot 'ledger-source-changes.patch'),[string[]]$taskPatch,[Text.UTF8Encoding]::new($false))
$taskPrivateZip=Join-Path $taskOutputRoot 'collision-course-private-submission.zip'
Compress-Archive -Path (Join-Path $taskStage '*') -DestinationPath $taskPrivateZip -Force
# Preserve the staging folder for inspection; no recursive cleanup is performed.
Write-Output "Public harness: $taskPublicZip"
Write-Output "Private organizer bundle: $taskPrivateZip"
Write-Output 'The private bundle includes the hidden backlog. Share it only with the organizer.'
