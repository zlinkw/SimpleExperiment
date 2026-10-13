const test = require('node:test');
const assert = require('node:assert/strict');
const { ReleaseClient } = require('../../dist/updates/ReleaseClient');
const { EXPERIMENT_EXTENSION_ID, SFTP_EXTENSION_ID } = require('../../dist/features/ExtensionUpdates');
function release(repo) {
  const experiment = repo.endsWith('SimpleExperiment'), slug = experiment ? 'simple-experiment' : 'simple-sftp';
  return { tag_name: 'v1.1.0', html_url: `https://github.com/${repo}/releases/tag/v1.1.0`, draft: false, prerelease: false,
    assets: [{ name: `${slug}-1.1.0.vsix`, browser_download_url: `https://github.com/${repo}/releases/download/v1.1.0/${slug}-1.1.0.vsix`, size: 100, digest: 'sha256:' + 'a'.repeat(64) }] };
}
test('maps real GitHub snake_case responses and uses the Windows identities', async () => {
  let requests = 0;
  const client = new ReleaseClient(async url => { requests++; return Response.json(release(new URL(url).pathname.slice(7, -16))); });
  const plan = await client.check(() => '1.0.0');
  assert.equal(plan.status, 'update_available'); assert.equal(plan.experiment.id, EXPERIMENT_EXTENSION_ID); assert.equal(plan.sftp.id, SFTP_EXTENSION_ID);
  assert.equal(plan.experiment.latestVersion, '1.1.0'); assert.equal(requests, 2);
  await client.check(() => '1.0.0'); assert.equal(requests, 2);
});
test('coalesces requests, validates ETag 304, and recomputes installed versions', async () => {
  let time = 0, calls = 0;
  const url = 'https://api.github.com/repos/zlinkw/SimpleExperiment/releases/latest';
  const client = new ReleaseClient(async (_url, options) => {
    calls++; if (calls > 1) { assert.equal(options.headers['If-None-Match'], 'revision'); return new Response(null, { status: 304 }); }
    return Response.json({ value: 1 }, { headers: { etag: 'revision' } });
  }, () => time);
  const a = client.request(url, 1000), b = client.request(url, 1000); assert.equal(a, b); await a;
  time = 300001; assert.equal(JSON.parse((await client.request(url, 1000)).toString()).value, 1); assert.equal(calls, 2);
});
test('ordinary 403 remains retryable; proven rate limits cannot be bypassed by manual checks', async () => {
  let calls = 0, time = 0;
  const url = 'https://api.github.com/repos/zlinkw/SimpleExperiment/releases/latest';
  const ordinary = new ReleaseClient(async () => { calls++; return calls === 1 ? new Response('Forbidden', { status: 403, headers: { 'x-ratelimit-remaining': '59', 'x-ratelimit-reset': '3600' } }) : Response.json({ ok: true }); }, () => time);
  await assert.rejects(ordinary.request(url, 1000, true), /未确认限流/); await ordinary.request(url, 1000, true); assert.equal(calls, 2);
  calls = 0; const rate = new ReleaseClient(async () => { calls++; return new Response('rate', { status: 429, headers: { 'retry-after': '60' } }); }, () => time);
  await assert.rejects(rate.request(url, 1000), /限流/); await assert.rejects(rate.request(url, 1000, true), /限流/); assert.equal(calls, 1);
  time = 60001; await assert.rejects(rate.request(url, 1000), /限流/); assert.equal(calls, 2);
});
test('unavailable, oversized, prerelease and foreign assets never report up to date', async () => {
  const url = 'https://api.github.com/repos/zlinkw/SimpleExperiment/releases/latest';
  const large = new ReleaseClient(async () => new Response('a'.repeat(20))); await assert.rejects(large.request(url, 10), /上限/);
  const offline = new ReleaseClient(async () => { throw Error('offline'); }); await assert.rejects(offline.check(() => '1.0.0'), /offline/);
  const preview = new ReleaseClient(async () => Response.json({ ...release('zlinkw/SimpleExperiment'), prerelease: true })); await assert.rejects(preview.check(() => '1.0.0'), /稳定/);
  assert.throws(() => large.request('https://github.com/zlinkw/SimpleExperiment-Mac/releases/download/v1/file.vsix', 1000), /Windows/);
});
test('checksum text must bind the exact VSIX filename', async () => {
  const c = { repo: 'zlinkw/SimpleExperiment', label: 'Experiment', vsix: { name: 'right.vsix' }, checksum: { url: 'https://github.com/zlinkw/SimpleExperiment/releases/download/v1/right.vsix.sha256' } };
  await assert.rejects(new ReleaseClient(async () => new Response('a'.repeat(64) + '  other.vsix')).checksum(c), /精确/);
  assert.equal(await new ReleaseClient(async () => new Response('a'.repeat(64) + '  right.vsix')).checksum(c), 'a'.repeat(64));
});
