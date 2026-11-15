"""Actual Worker CSV parser and mapping preview, without loading its service."""
import ast, json, pathlib, re, sys, tempfile
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
expected = {'AP': .1, 'AUPRC': .2, 'macro_f1': .3, 'micro_f1': .4, 'weighted_f1': .5}
csv.write_text('average_precision,auprc,f1_macro,f1_micro,f1_weighted\n0.1,0.2,0.3,0.4,0.5\n', encoding='utf-8')
metrics = agent.parse_csv_result_file(str(root), relative, policy)[0]['metrics']
assert {name: value['value'] for name, value in metrics.items()} == expected, metrics
csv.write_text('metric,value\n' + ''.join(f'{name},{value}\n' for name, value in expected.items()), encoding='utf-8')
metrics = {}
for row in agent.parse_csv_result_file(str(root), relative, policy):
    metrics.update({name: value['value'] for name, value in row['metrics'].items()})
assert metrics == expected, metrics
assert agent.metric_name('AP', {'AP': 'AUPRC'}) == 'AUPRC'
writer = ast.parse(sys.stdin.read())
normalizer = next(node for node in writer.body if isinstance(node, ast.FunctionDef) and node.name == 'normalize_metric_name')
namespace = {'re': re}
exec(compile(ast.Module(body=[normalizer], type_ignores=[]), '<generated result_writer.py>', 'exec'), namespace)
for source, name in [('average_precision', 'AP'), ('test_ap', 'AP'), ('auprc', 'AUPRC'),
                     ('f1_macro', 'macro_f1'), ('test_macro_f1', 'macro_f1'), ('f1_weighted', 'weighted_f1'),
                     ('micro_f1', 'micro_f1'), ('macro_precision', 'macro_precision'), ('weighted_recall', 'weighted_recall')]:
    assert agent.metric_name(source) == name, (source, agent.metric_name(source))
    assert namespace['normalize_metric_name'](source) == name, (source, namespace['normalize_metric_name'](source))
csv.write_text('metric,value,unit,higher_is_better\nlatency,1,ms,invalid\n', encoding='utf-8')
try:
    agent.parse_csv_result_file(str(root), relative, policy)
    raise AssertionError('invalid direction accepted')
except ValueError as error:
    assert 'METRIC_DIRECTION_INVALID' in str(error)
print(json.dumps({'rows': len(rows), 'dimensionsPreserved': True}))
