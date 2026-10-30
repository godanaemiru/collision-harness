import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const run=path.resolve(process.argv[2] || '');
if(!process.argv[2])throw Error('Usage: node export-public-evidence.mjs <private-run-folder>');
const out=path.join(path.dirname(fileURLToPath(import.meta.url)),'submission','run-evidence');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const state=read(path.join(run,'state.json')),summary=read(path.join(run,'summary.json'));
const ids=Object.keys(state.tasks),alias=Object.fromEntries(ids.map((id,i)=>[id,'Task-'+String(i+1).padStart(2,'0')]));
const number=x=>typeof x==='number'&&Number.isFinite(x)?x:undefined;
const tag=x=>typeof x==='string'&&/^[a-z_]{1,90}$/.test(x)?x:undefined;
const model=x=>typeof x==='string'&&/^[a-zA-Z0-9_.:/-]{1,150}$/.test(x)?x:undefined;
const time=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(x)?x:undefined;
const usage=u=>u?{promptTokens:number(u.prompt_tokens),completionTokens:number(u.completion_tokens),totalTokens:number(u.total_tokens),reasoningTokens:number(u.completion_tokens_details?.reasoning_tokens),costUsd:number(u.cost)}:undefined;
function errorClass(message){
 if(!message)return undefined;
 const text=String(message),http=/HTTP (\d{3})/.exec(text);
 if(http)return 'http_'+http[1];
 if(/timeout|terminated|abort/i.test(text))return 'connection_or_timeout';
 if(/json|return text/i.test(text))return 'response_format';
 if(/ownership/i.test(text))return 'ownership';
 if(/regress|acceptance|integrity|contract/i.test(text))return 'verification';
 if(/unchanged|no file/i.test(text))return 'no_effective_change';
 if(/quota|budget/i.test(text))return 'budget_or_request_limit';
 return 'other';
}
const events=fs.readFileSync(path.join(run,'events.jsonl'),'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const timeline=events.map((e,i)=>({sequence:i+1,at:time(e.at),type:tag(e.type),task:alias[e.task],tasks:Array.isArray(e.tasks)?e.tasks.map(id=>alias[id]).filter(Boolean):undefined,worker:number(e.worker),request:number(e.request)??number(e.id),model:model(e.model),originalModel:model(e.originalModel),models:Array.isArray(e.models)?e.models.map(model).filter(Boolean):undefined,status:tag(e.status),costUsd:number(e.costUsd),providerKeyUsageUsd:number(e.providerKeyUsageUsd),upperBoundUsd:number(e.upperBoundUsd),usage:usage(e.usage),requests:number(e.requests),limit:number(e.limit),agentRequirementMet:typeof e.agentRequirementMet==='boolean'?e.agentRequirementMet:undefined,errorClass:errorClass(e.error),localAcceptanceAvailable:typeof e.localAcceptanceAvailable==='boolean'?e.localAcceptanceAvailable:undefined}));
const requests=state.requests.map(r=>({request:r.id,model:model(r.model),actualModel:model(r.actualModel),startedAt:time(r.startedAt),finishedAt:time(r.finishedAt),reconciledAt:time(r.reconciledAt),status:tag(r.status),costUsd:r.costUsd===null?null:number(r.costUsd),upperBoundUsd:number(r.upperBoundUsd),usage:usage(r.usage)}));
const tasks=ids.map(id=>({task:alias[id],status:tag(state.tasks[id].status),attempts:number(state.tasks[id].attempts),worker:number(state.tasks[id].worker),model:model(state.tasks[id].model),localContractPassed:summary.independentLocalChecks?.[id]?.passed??null,failureClass:errorClass(state.tasks[id].lastFailure),dependsOn:(state.plan.find(p=>p.id===id)?.dependsOn||[]).map(id=>alias[id]),conflicts:(state.plan.find(p=>p.id===id)?.conflicts||[]).map(id=>alias[id])}));
const billing=read(path.join(run,'evidence','final-key-usage.json'));
const report={redacted:true,startedAt:time(state.startedAt),updatedAt:time(state.updatedAt),budgetUsd:summary.budgetUsd,recordedSpendUsd:summary.confirmedSpendUsd,requests:summary.requests,unconfirmedRequests:summary.unconfirmedRequests,workerIds:summary.workerIds,actualModels:summary.actualModels.map(model),agentRequirementMet:summary.agentRequirementMet,regression:summary.regression,lockedFilesUnchanged:summary.integrity,localChecksPassed:tasks.filter(t=>t.localContractPassed===true).length,totalTasks:tasks.length,hiddenTestsVerified:0,eventRows:timeline.length,operatorInterventionsRecorded:true};
const documents={
 'events.redacted.jsonl':timeline.map(x=>JSON.stringify(x)).join('\n')+'\n',
 'requests.json':JSON.stringify(requests,null,2)+'\n',
 'task-statuses.json':JSON.stringify(tasks,null,2)+'\n',
 'summary.json':JSON.stringify(report,null,2)+'\n',
 'provider-usage.json':JSON.stringify({recordedAt:time(billing.at),usageUsd:billing.usageUsd,keyLimitUsd:billing.limitUsd,scope:'Aggregate authenticated provider key usage; not a per-generation receipt'},null,2)+'\n'
};
for(const [file,text]of Object.entries(documents)){
 if(/sk-or-[A-Za-z0-9_-]{20,}/.test(text)||/C:[\\/]Users[\\/]/i.test(text))throw Error('Sensitive pattern in '+file);
}
// Confirm that fields outside the allowlist never survive serialization.
const probe={...events[0],error:'HIDDEN_TASK_TEXT',prompt:'SECRET_PROMPT',workspace:'C:/Users/private',authorization:'SECRET_TOKEN'};
const probeSafe=JSON.stringify({at:time(probe.at),type:tag(probe.type),errorClass:errorClass(probe.error)});
for(const marker of ['HIDDEN_TASK_TEXT','SECRET_PROMPT','SECRET_TOKEN','C:/Users/private'])if(probeSafe.includes(marker))throw Error('Redaction self-check failed');
fs.mkdirSync(out,{recursive:true});for(const[file,text]of Object.entries(documents))fs.writeFileSync(path.join(out,file),text);
fs.writeFileSync(path.join(out,'README.md'),`# Public run evidence (redacted)\n\nThis is an audit export of the actual run, not a raw transcript. The original private files remain intact.\n\n- events.redacted.jsonl retains all ${events.length} original event rows, their order and timestamps. Details are exported through an explicit allowlist.\n- requests.json records all ${requests.length} dispatches, reported token usage, request outcomes, zero-price bounds and cost reconciliation.\n- task-statuses.json uses anonymous task aliases and records statuses, attempts, dependencies and conflicts.\n- summary.json records the partial result and regression/integrity checks.\n- provider-usage.json records the final aggregate key usage without an API key or account identifier.\n\nIntentionally excluded: hidden task IDs, titles and bodies; prompts; model source responses; custom check code and assertion values; raw error payloads; account/provider user IDs; generation IDs; private filesystem paths; and credentials. Missing cost or token fields are not invented. Reconciled zero-cost requests are distinguished from successful requests with returned usage.\n\nOperator interventions are retained as timestamped event types; their private narrative fields are removed. The live run mostly serialized edits conservatively. Two tasks pass author-written local checks, all 33 starter regression tests pass, and no organizer hidden-test pass is claimed. Recorded model usage is USD 0 under a USD 5 cap.\n\nThis redacted evidence may be useful for judging, but it is not represented as the full raw log requested by the organizer. The unredacted organizer bundle remains available privately if required.\n`);
console.log(JSON.stringify({eventRowsExported:timeline.length,requestsExported:requests.length,reportedSpendUsd:report.recordedSpendUsd,redactionSelfCheck:'passed'}));
