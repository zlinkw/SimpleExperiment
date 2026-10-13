"""Extract the production collection function; no runtime entry point or research data."""
import json
import pathlib
import sys
repo = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(repo / 'test/_helpers'))
from extractRuntimeFunctions import extract_runtime_functions
agent = extract_runtime_functions(str(repo / 'dist/runtime/cluster_agent.py'), ['parse_results_action'])
agent.read_project_metric_policy = lambda _: {}
agent.selected_result_candidates = lambda *_: ['tmp/result/owned.csv']
agent.structured_result_candidate = lambda _: True
agent.normalize_result_candidate = lambda value: value
agent.plan_suite_value = lambda *_: 'owned'
agent.parse_result_file = lambda *_: [{'metrics': {'custom_project_metric': 0.7}}]
agent.ordered_metric_list = lambda values, _: list(values)
agent.apply_result_ownership = lambda summary, _: summary
agent.apply_final_evidence_summary = lambda _, summary: summary
agent.write_plan_seed_aggregate = lambda *_: None
agent.write_results_summary_v2 = lambda *_: 'summary.csv'
agent.relpath = lambda _, value: value
agent.append_event = lambda *_: None
def forbidden(*_):
    raise AssertionError('automatic scientific claim evaluation')
agent.evaluate_claim_evidence = forbidden
agent.apply_claim_evidence_summary = forbidden
summary = agent.parse_results_action('fixture', selected=['tmp/result/owned.csv'], plan='experiments/plans/owned.yaml')
assert summary['results'][0]['metrics'] == {'custom_project_metric': 0.7}
assert summary['projectScientificValidation'] == {'executed': False, 'responsibility': 'project'}
assert 'claimEvidence' not in summary
print(json.dumps({'ok': True, 'scientificCalls': 0, 'metric': summary['metrics']}))
