import test from 'node:test';import assert from 'node:assert/strict';import {validateAppState} from '../worker/state.js';
const h={id:'h',name:'Habit',group:'Test',points:10,addons:[]};
const state={habitVersion:1,habits:[h],checks:{'2026-09-16':{h:false}},snapshots:{'2026-09-16':{habits:[h],legacy:false}}};
test('accepts explicit failure with versioned day definitions',()=>assert.equal(validateAppState('habit-ican',state).ok,true));
test('rejects lost snapshot, malformed historic definitions, unsupported schema',()=>{
 assert.equal(validateAppState('habit-ican',{...state,snapshots:{}}).code,'missing_habit_snapshot');
 assert.equal(validateAppState('habit-ican',{...state,snapshots:{'2026-09-16':{habits:[{...h,points:-1}],legacy:false}}}).code,'invalid_habit_points');
 assert.equal(validateAppState('habit-ican',{...state,habitVersion:2}).ok,false);
});

test('validates compact definitions and refuses dangling references',()=>{const compact={...state,habitEncoding:'definitions-v1',definitions:[[h]],snapshots:{'2026-09-16':{definition:0,legacy:false}}};assert.equal(validateAppState('habit-ican',compact).ok,true);assert.equal(validateAppState('habit-ican',{...compact,definitions:[]}).ok,false);});
