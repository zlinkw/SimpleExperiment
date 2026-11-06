"""Actual Worker CSV parser and mapping preview, without loading its service."""
import json, pathlib, sys, tempfile
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / '_helpers'))
from extractRuntimeFunctions import extract_runtime_functions
root = pathlib.Path(tempfile.mkdtemp(prefix='metric-dimensions-'))
agent = extract_runtime_functions(str(pathlib.Path(__file__).resolve().parents[2] / 'dist/runtime/cluster_agent.py'),
                                 ['parse_csv_result_file', 'result_column_mapping_preview'])
relative = 'experiments/results/metrics.csv'
csv = root / relative
csv.parent.mkdir(parents=True)
csv.write_text('case,seed,dataset,method,eval_protocol,split,fold,metric,value,unit,higher_is_better\n'
               'one,42,set,demo,clean,val,0,latency,1,ms,false\n'
               'one,42,set,demo,clean,test,0,latency,2,ms,false\n'
               'one,42,set,demo,clean,test,1,latency,3,ms,false\n', encoding='utf-8')
policy = {'csvColumnMapping': {}, 'metricAliases': {}}
rows = agent.parse_csv_result_file(str(root), relative, policy)
assert len(rows) == 3, rows
assert {(r['dimensions']['split'], r['dimensions']['fold']) for r in rows} == {('val', 0), ('test', 0), ('test', 1)}, rows
assert all(r['metrics']['latency']['unit'] == 'ms' and r['metrics']['latency']['higherIsBetter'] is False for r in rows)
preview = agent.result_column_mapping_preview(str(root), relative, policy)
assert all(preview['mapping'][key] == key for key in ('fold', 'unit', 'higher_is_better')), preview
csv.write_text('metric,value,unit,higher_is_better\nlatency,1,ms,invalid\n', encoding='utf-8')
try:
    agent.parse_csv_result_file(str(root), relative, policy)
    raise AssertionError('invalid direction accepted')
except ValueError as error:
    assert 'METRIC_DIRECTION_INVALID' in str(error)
print(json.dumps({'rows': len(rows), 'dimensionsPreserved': True}))
