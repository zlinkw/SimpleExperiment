/** Shared by Agent and Scheduler, including the final adapter/wrapper launch. */
export const TASK_SHELL_ENVIRONMENT_PYTHON = String.raw`
TASK_SHELL_ENV_FIELDS = (
    "SIMPLE_EXPERIMENT_FORMAL_JOB_IDENTITY", "SIMPLE_EXPERIMENT_JOB_COMMAND_ID", "SIMPLE_EXPERIMENT_JOB_PROJECT_ID",
    "SIMPLE_EXPERIMENT_MANAGED_JOB", "SIMPLE_EXPERIMENT_CHECKPOINT_TEST_ONLY", "SIMPLE_EXPERIMENT_DISTRIBUTED_RESULTS",
    "SIMPLE_EXPERIMENT_TMUX_SESSION", "SIMPLE_EXPERIMENT_TMUX_LOG_DIR", "SIMPLE_EXPERIMENT_EXIT_CODE_PATH",
    "SIMPLE_EXPERIMENT_CONDA_ENV", "SIMPLE_EXPERIMENT_REQUIRE_CONDA_ENV", "CUDA_VISIBLE_DEVICES", "PYTHONUNBUFFERED",
    "SIMPLE_EXPERIMENT_NVJITLINK_PROOF", "SIMPLE_EXPERIMENT_TASK_LIFECYCLE",
)

TASK_LIBRARY_SETUP_CODE = r'''
import hashlib, json, os, pathlib, shlex, sys, sysconfig
prefix = pathlib.Path(sys.prefix).resolve()
selected = sys.argv[1].strip().rstrip('/')
if selected.endswith('/bin/python'): selected = selected[:-len('/bin/python')]
if selected and pathlib.Path(selected).resolve() != prefix:
    raise RuntimeError('EXECUTION_ENVIRONMENT_CHANGED: selected Python prefix')
# Only this interpreter's environment is eligible; never search the machine or import torch here.
directories = []
for key in ('purelib', 'platlib'):
    directory = pathlib.Path(sysconfig.get_paths()[key]) / 'nvidia/nvjitlink/lib'
    if directory not in directories: directories.append(directory)
directories.append(prefix / 'lib')
proof = None
for directory in directories:
    if not directory.is_dir(): continue
    candidates = sorted(directory.glob('libnvJitLink.so*'))
    if not candidates: continue
    files = {}
    for candidate in candidates:
        path = candidate.resolve(strict=True)
        if not path.is_file() or not path.is_relative_to(prefix):
            raise RuntimeError('NVJITLINK_ENVIRONMENT_ESCAPE: ' + str(candidate))
        files[str(path)] = path
    if len(files) != 1:
        raise RuntimeError('NVJITLINK_AMBIGUOUS_ENVIRONMENT: ' + str(directory))
    path = next(iter(files.values()))
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1048576), b''): digest.update(block)
    proof = dict(python=os.path.abspath(sys.executable), prefix=str(prefix), library=str(path),
                 directory=str(directory.resolve()), sha256=digest.hexdigest())
    break
previous = os.environ.get('SIMPLE_EXPERIMENT_NVJITLINK_PROOF')
if previous and json.loads(previous) != proof:
    raise RuntimeError('NVJITLINK_PROOF_CHANGED: interpreter/library fingerprint changed since preflight')
values = dict(SIMPLE_EXPERIMENT_NVJITLINK_PROOF=json.dumps(proof,ensure_ascii=False,separators=(',',':')))
if proof:
    directories = [proof['directory']]
    for entry in os.environ.get('LD_LIBRARY_PATH','').split(':'):
        if entry and entry not in directories: directories.append(entry)
    values['LD_LIBRARY_PATH'] = ':'.join(directories)
values['PATH'] = str(pathlib.Path(sys.executable).parent) + ':' + os.environ.get('PATH','')
for key, value in values.items(): print('export ' + key + '=' + shlex.quote(value) + ';')
'''

TASK_EXECUTION_PROBE_CODE = r'''
import ctypes, hashlib, importlib.util, json, os, pathlib, sys
proof = json.loads(os.environ.get('SIMPLE_EXPERIMENT_NVJITLINK_PROOF','null'))
if proof:
    library = pathlib.Path(proof['library'])
    if hashlib.sha256(library.read_bytes()).hexdigest() != proof['sha256']:
        raise RuntimeError('NVJITLINK_PROOF_CHANGED: bytes')
    ctypes.CDLL(library.name)  # Exercise the real loader using the post-login search order.
    maps = pathlib.Path('/proc/self/maps')
    if maps.is_file():
        loaded = {pathlib.Path(line.split(None,5)[-1].strip()).resolve() for line in maps.read_text().splitlines()
                  if 'libnvJitLink.so' in line}
        if loaded != {library.resolve()}:
            raise RuntimeError('NVJITLINK_LOADER_CONFLICT: ' + ','.join(map(str,loaded)))
imports = {}
if importlib.util.find_spec('torch') is not None:
    import torch  # Import only; never call torch.cuda, start a model or allocate a GPU tensor.
    imports['torch'] = str(getattr(torch,'__version__','unknown'))
print(json.dumps(dict(python=sys.executable,prefix=sys.prefix,
    identity=os.environ.get('SIMPLE_EXPERIMENT_FORMAL_JOB_IDENTITY',''),nvJitLink=proof,cpuImports=imports),ensure_ascii=False))
'''

def task_shell_args(args, env, python):
    """Rebind allowlisted controls AFTER login scripts, before any task interpreter starts."""
    if os.name == "nt":
        return args
    shell = env.get("SHELL") or ("/bin/bash" if os.path.isfile("/bin/bash") else "/bin/sh")
    assignments = []
    for key in TASK_SHELL_ENV_FIELDS:
        value = env.get(key)
        assignments.append("export " + key + "=" + shlex.quote(str(value)) if value not in (None, "") else "unset " + key)
    resolve = shlex.join([str(python), "-I", "-B", "-X", "utf8", "-c", TASK_LIBRARY_SETUP_CODE,
                          str(env.get("SIMPLE_EXPERIMENT_CONDA_ENV") or "")])
    # A renderer may already request a login shell. Execute its body in this prepared
    # login shell instead of starting another shell that could reset library/identity controls.
    nested = len(args) == 3 and str(args[1]) == "-lc" and str(args[0]) == str(shell)
    command = str(args[2]) if nested else "exec " + shlex.join([str(item) for item in args])
    # No eval of project/user output: only the bounded, stdlib resolver emits quoted export assignments.
    body = "; ".join(assignments) + "; " + "__simple_library_setup=$(" + resolve + ") && eval \"$__simple_library_setup\" && " + command
    return [shell, "-lc", body]
`;
