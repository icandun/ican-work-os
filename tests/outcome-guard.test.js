import test from 'node:test';
import assert from 'node:assert/strict';
import {guardOutcomeState,OUTCOME_COLLECTIONS} from '../worker/outcome-guard.js';
const current={oesVersion:1,...Object.fromEntries(OUTCOME_COLLECTIONS.map(k=>[k,[]])),kpis:[{id:'k',target:100}]};
test('legacy writes remain compatible before upgrade',()=>{const old={triage:[],execLog:[]};assert.equal(guardOutcomeState(old,old),old);});
test('old client and legacy restore cannot erase new target layer',()=>{assert.throws(()=>guardOutcomeState(current,{triage:[],execLog:[]}),e=>e.code==='work_client_update_required'&&e.status===426);});
test('upgraded client must include every additive collection',()=>{const next={...current};delete next.kpis;assert.throws(()=>guardOutcomeState(current,next));});
test('duplicate record IDs cannot silently overwrite check-ins',()=>{assert.throws(()=>guardOutcomeState(current,{...current,kpiEntries:[{id:'same'},{id:'same'}]}));});
test('new valid state accepted without changing timer/history',()=>{const next={...current,execLog:[{id:'s',duration:90,status:'Selesai'}]};assert.strictEqual(guardOutcomeState(current,next),next);});
