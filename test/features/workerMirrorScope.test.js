const test = require('node:test'), assert = require('node:assert/strict');
require('../_helpers/registerTsRequire');
const { configuredMirrorScope, filterInventoryByScope, mirrorScopeIncludes, normalizeMirrorScope } = require('../../src/features/ProjectMirror.ts');

test('saved worker selection keeps excluded descendants and selected siblings', () => {
 const selected=normalizeMirrorScope(['.'],['work_dirs/run/private']);
 assert.equal(mirrorScopeIncludes('work_dirs/run/private/new',selected),false);
 assert.equal(mirrorScopeIncludes('work_dirs/run/private-other/new',selected),true);
 assert.deepEqual(filterInventoryByScope({'work_dirs/run/private/a':1,'work_dirs/run/public':2},selected.paths,selected.excluded),{'work_dirs/run/public':2});
 assert.deepEqual(configuredMirrorScope({get:key=>key==='serverSync.scope'?selected:undefined}),selected);
 assert.deepEqual(configuredMirrorScope({get:(key,fallback)=>key==='serverSync.paths'?['work_dirs']:fallback}),{paths:['work_dirs'],excluded:[]});
 assert.throws(()=>normalizeMirrorScope(['.'],['../outside']),/不安全/);
});
