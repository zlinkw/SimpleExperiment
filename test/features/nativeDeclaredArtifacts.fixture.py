"""Exercise declaration, final-manifest production and active observation in one private project."""
import json, os, pathlib, sys, tempfile
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]/'_helpers'))
from extractRuntimeFunctions import extract_runtime_functions

repository = pathlib.Path(__file__).resolve().parents[2]
scheduler = extract_runtime_functions(str(repository/'dist/runtime/cluster_scheduler.py'),
    ['build_jobs', 'verify_declared_outputs', 'native_job_result'])
agent = extract_runtime_functions(str(repository/'dist/runtime/cluster_agent.py'), ['task_manifest_observation'])
root = pathlib.Path(tempfile.mkdtemp(prefix='declared-artifacts-'))
os.chdir(root)
plan = {'_file': 'plans/generic.yaml', '_revision': 'fixture', 'suite': 'export', 'seeds': [42],
    'mode': 'train', 'cases': [{'case': 'segmentation'}], 'output_dir': 'work_dirs/{case}/{seed}',
    'runner': {'train_command': 'python export.py', 'collect_metrics': False,
               'outputs': ['{output_dir}/model.onnx', '{output_dir}/marker.txt']},
    'expectedResults': ['{output_dir}/labels.json', '{output_dir}/features.bin']}
_, jobs = scheduler.build_jobs(plan)
job = jobs[0]
assert set(job.outputs) == {job.output_dir+'/'+name for name in ('model.onnx','marker.txt','labels.json','features.bin')}, job.outputs
out = root/job.output_dir
out.mkdir(parents=True)
for relative in job.outputs:
    (root/relative).write_bytes(b'' if relative.endswith('marker.txt') else b'fixture artifact')
scheduler.verify_declared_outputs(job)
(out/'artifact_manifest.json').write_text(json.dumps({'consumer': {'retained': True}}), encoding='utf-8')
scheduler.native_job_result(job, {'commandId': 'generic-command'}, 'train', 'completed')
document = json.loads((out/'artifact_manifest.json').read_text(encoding='utf-8'))
assert document['consumer'] == {'retained': True}
assert document['simpleExperiment']['weights'] == []
query = dict(commandId='generic-command', outputDir=job.output_dir, executionMode='train',
             experimentIndex=0, case=job.case, seed=job.seed)
assert agent.task_manifest_observation(str(root), query)['artifactsComplete']
copy = root/'missing-copy'
# Copy the exact manifest and all but one output, without deleting any fixture.
for relative in [*job.outputs, job.output_dir+'/artifact_manifest.json']:
    if relative.endswith('labels.json'): continue
    target = copy/relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes((root/relative).read_bytes())
assert not agent.task_manifest_observation(str(copy), query)['artifactsComplete']
os.chdir(copy)
try:
    scheduler.verify_declared_outputs(job)
    raise AssertionError('missing expectedResults accepted')
except SystemExit as error:
    assert 'labels.json' in str(error), str(error)
os.chdir(root)
(root/job.outputs[0]).write_bytes(b'changed artifact size')
assert not agent.task_manifest_observation(str(root), query)['artifactsComplete']
print(json.dumps(dict(manifest=document, outputs=list(job.outputs), missingRejected=True, changedRejected=True)))
