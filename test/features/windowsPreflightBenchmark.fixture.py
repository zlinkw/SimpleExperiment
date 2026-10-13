"""Same production path checker before/after; synthetic data only, no runtime entrypoint."""
import hashlib
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import time

repo = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(repo / 'test/_helpers'))
from extractRuntimeFunctions import extract_runtime_functions

root = pathlib.Path(tempfile.mkdtemp(prefix='windows-preflight-benchmark-'))
(root / 'experiments/plans').mkdir(parents=True)
(root / 'asset.bin').write_bytes(b'fixture-only' * (1024 * 1024))
(root / 'validator.py').write_text('''import hashlib, pathlib
calls = 0
def validate_result_paths(config, contract):
 global calls
 calls += 1
 with open('callbacks.log','a',encoding='utf-8') as log: log.write('callback\\n')
 digest = hashlib.sha256(pathlib.Path('asset.bin').read_bytes()).hexdigest()
 if not digest: raise ValueError('hash missing')
 return {'ok':True}
''', encoding='utf-8')
(root / 'experiments/simple_project.yaml').write_text('resultPathPolicy: declared\nadapter:\n  resultPathValidator: validator.py\n', encoding='utf-8')
baseline = root / 'before.py'
baseline.write_bytes(subprocess.run(['git','show','0bf05161:dist/runtime/cluster_scheduler.py'], cwd=repo, check=True, capture_output=True, timeout=5).stdout)
os.chdir(root)
records = {}
for name, filename in [('before',baseline),('after',repo / 'dist/runtime/cluster_scheduler.py')]:
 scheduler = extract_runtime_functions(str(filename), ['load_plan','build_jobs','result_path_preflight'])
 plan = {'mode':'train_test', 'seeds':[42,43,44], 'base_config':{}, 'naming':{'sweep_dir':'work_dirs/final','job_name':'{case}_seed{seed}'},
  'runner':{'train_command':'python train.py --config {config}','test_command':'python test.py --result-csv {result_csv}'},
  'paper':{'result_csv':'tmp/result/{case}/seed{seed}/metrics.csv'},'cases':[{'case': 'a'},{'case':'b'}]}
 plan_file = pathlib.Path('experiments/plans/fixture.yaml')
 plan_file.write_text(scheduler.yaml.safe_dump(plan), encoding='utf-8')
 values=[]
 for phase in ['cold','warm']:
  started=time.perf_counter()
  _,jobs=scheduler.build_jobs(scheduler.load_plan(plan_file))
  report=scheduler.result_path_preflight(root,jobs,execution_mode='train_test')
  assert report.get('ok') is True, report
  values.append(round((time.perf_counter()-started)*1000,3))
 calls=len((root/'callbacks.log').read_text(encoding='utf-8').splitlines())
 records[name]={'coldMs':values[0],'warmMs':values[1],'jobCount':len(jobs),'projectCallbacks': calls if name=='before' else calls-records['before']['projectCallbacks']}
 if name=='before': assert calls==12
 else: assert records[name]['projectCallbacks']==0
print(json.dumps(records))
