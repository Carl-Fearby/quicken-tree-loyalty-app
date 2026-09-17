import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quote,rowPredicate} from '../db.js';
test('identifiers escape quotes and row values stay parameterized',()=>{assert.equal(quote('a"b'),'"a""b"');assert.deepEqual(rowPredicate(['id'],{id:"' OR TRUE --"}),{text:'"id" = $1',values:["' OR TRUE --"]});});
test('deletion requires exact complete primary key',()=>{for(const key of [null,{},[],{other:1},{id:1,other:2},{id:null}])assert.throws(()=>rowPredicate(['id'],key));assert.throws(()=>rowPredicate([],{id:1}));assert.deepEqual(rowPredicate(['a','b'],{a:1,b:2}).values,[1,2]);});
