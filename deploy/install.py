"""Deploy or roll back the API and browser files on the existing Linux ECS host."""
import argparse
import contextlib
import ctypes
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
from urllib.request import urlopen

SOURCE = Path(__file__).resolve().parent.parent
SITE = Path('/var/www/eco-quest')
APP = Path('/opt/eco-quest-kernel')
UNIT = Path('/etc/systemd/system/eco-quest-kernel.service')
NGINX = '/usr/sbin/nginx'
VHOST = Path('/etc/blue-hour-nginx.conf')
SERVICE = UNIT.name
CHECKPOINTS = Path('/var/backups/eco-quest-kernel')
FRONT = ['index.html', 'learning.js', 'learning.css', 'optimization.js', 'studio.js',
         'classroom/eco-quest-presentation.pptx', 'classroom/eco-quest-presentation.pdf']
KERNEL = ['lesson_model.py', 'score_distribution.py', 'score_distribution.sql', 'chart.py', 'server.py']
PUBLIC = ['kernel/lesson_model.py', 'kernel/score_distribution.sql']
INCLUDE = 'include /opt/eco-quest-kernel/current/location.conf;'
ANCHOR = re.compile(r'(?m)^([ \t]*)location\s+\^~\s+/eco-quest/\s*\{')
UNIT_TEXT = """[Unit]
Description=Eco Quest classroom computation service
After=network.target

[Service]
User=nobody
WorkingDirectory=/opt/eco-quest-kernel/current/kernel
ExecStart=/usr/bin/python3 -B server.py --port 8766
Restart=on-failure
RestartSec=2
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
MemoryMax=120M
TasksMax=48

[Install]
WantedBy=multi-user.target
"""
LOCATION = """location ^~ /eco-quest/api/ {
    proxy_pass http://127.0.0.1:8766/api/;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_connect_timeout 3s;
    proxy_read_timeout 12s;
}
location = /eco-quest/kernel/lesson_model.py {
    root /var/www;
    types { }
    default_type text/plain;
    charset utf-8;
}
location = /eco-quest/kernel/score_distribution.sql {
    root /var/www;
    types { }
    default_type text/plain;
    charset utf-8;
}
"""

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write_atomic(path, data, mode):
    with tempfile.NamedTemporaryFile(dir=str(path.parent), delete=False) as tmp:
        tmp.write(data)
    os.chmod(tmp.name, mode)
    os.replace(tmp.name, str(path))

def update_link(target):
    link = APP / 'current'
    replacement = Path(tempfile.mkdtemp(dir=str(APP))) / 'link'
    try:
        replacement.symlink_to(target)
        os.replace(str(replacement), str(link))
    finally:
        replacement.parent.rmdir()

def exchange(a, b):
    # Both directories reside in the same parent filesystem.
    fn = ctypes.CDLL(None, use_errno=True).renameat2
    if fn(-100, os.fsencode(a), -100, os.fsencode(b), 2) != 0:
        raise OSError(ctypes.get_errno(), 'Unable to exchange website directories')

def nginx(arg):
    subprocess.check_call([NGINX, '-c', str(VHOST)] + arg)

def ctl(*args):
    subprocess.check_call(['systemctl'] + list(args))

def service_state(action):
    return subprocess.call(['systemctl', action, '--quiet', SERVICE]) == 0

def check_api(base):
    err = None
    for _ in range(14):
        try:
            with urlopen(base + 'health', timeout=2) as res:
                if json.loads(res.read().decode()).get('engine') != 'python':
                    raise ValueError('Unexpected health response')
            return
        except (OSError, ValueError) as ex:
            err = ex
            time.sleep(.25)
    raise RuntimeError('API check failed at {}: {}'.format(base, err))

def save_state(checkpoint, state):
    write_atomic(checkpoint / 'state.json', json.dumps(state).encode(), 0o600)

def rollback(checkpoint, state):
    # Validate ownership before moving the site or restoring Nginx on a later rollback.
    current = APP / 'current'
    if current.is_symlink() and os.readlink(str(current)) not in [state['next'], state['previous']]:
        raise RuntimeError('A different kernel release is now active')
    if state['site_switched'] and any(digest(SITE / n) != h for n, h in state['web_hashes'].items()):
        raise RuntimeError('Published website files changed after this release')
    if digest(VHOST) not in [state['old_config_hash'], state['new_config_hash']]:
        raise RuntimeError('Nginx configuration changed after this release')
    if state['site_switched']:
        exchange(Path(state['stage']), SITE)
        state['site_switched'] = False
        save_state(checkpoint, state)
    # Remove the include before removing the target it references.
    shutil.copy2(str(checkpoint / 'vhost.before'), str(VHOST))
    if state['previous']:
        update_link(state['previous'])
    elif current.is_symlink():
        current.unlink()
    if state['had_unit']:
        shutil.copy2(str(checkpoint / 'service.before'), str(UNIT))
    else:
        subprocess.call(['systemctl', 'disable', '--now', SERVICE])
        if UNIT.exists():
            UNIT.unlink()
    ctl('daemon-reload')
    if state['had_unit']:
        ctl('enable' if state['enabled'] else 'disable', SERVICE)
        ctl('restart' if state['active'] else 'stop', SERVICE)
    nginx(['-t'])
    nginx(['-s', 'reload'])
    state['rolled_back'] = True
    save_state(checkpoint, state)

def deploy(revision):
    if not re.fullmatch('[0-9a-f]{40}', revision):
        raise ValueError('Supply the full revision of the checked-out source')
    for path in [SITE, VHOST, UNIT, APP]:
        if path.is_symlink():
            raise RuntimeError('Unexpected symlink: '+str(path))
    if not (SITE / 'index.html').is_file() or not VHOST.is_file():
        raise RuntimeError('The established virtual host and website must already exist')
    if UNIT.exists() and UNIT.read_text() != UNIT_TEXT:
        raise RuntimeError('Service name is already owned by another unit')
    current = APP / 'current'
    if current.exists() and not current.is_symlink():
        raise RuntimeError('Unexpected current release path')
    frontend = FRONT + PUBLIC
    for relpath in frontend + ['kernel/'+f for f in KERNEL]:
        if not (SOURCE / relpath).is_file():
            raise RuntimeError('Missing release file: '+relpath)
    config = VHOST.read_text()
    if INCLUDE not in config:
        if len(ANCHOR.findall(config)) != 1 or 'location ^~ /eco-quest/api/' in config:
            raise RuntimeError('Could not identify one existing Eco Quest location')
        next_config = ANCHOR.sub(lambda m:m[1]+INCLUDE+'\n'+m[0], config, count=1)
    else:
        next_config = config
    nginx(['-t'])
    active, enabled = service_state('is-active'), service_state('is-enabled')
    if not active:
        with contextlib.closing(socket.socket()) as probe:
            probe.bind(('127.0.0.1', 8766))
    if not sqlite3.connect(':memory:').execute('select 1').fetchone()[0]:
        raise RuntimeError('SQLite unavailable')
    subprocess.check_call([sys.executable, '-B', '-m', 'unittest', 'discover', '-s', str(SOURCE/'kernel')])
    APP.mkdir(mode=0o755, exist_ok=True)
    releases = APP/'releases'
    releases.mkdir(mode=0o755,exist_ok=True)
    release = releases/revision
    if not release.exists():
        new = Path(tempfile.mkdtemp(dir=str(releases)))
        (new/'kernel').mkdir(mode=0o755)
        for n in KERNEL:
            shutil.copyfile(str(SOURCE/'kernel'/n),str(new/'kernel'/n))
        (new/'location.conf').write_text(LOCATION)
        new.chmod(0o755)
        os.rename(str(new), str(release))
    for n in KERNEL:
        if digest(release/'kernel'/n) != digest(SOURCE/'kernel'/n):
            raise RuntimeError('Existing kernel release has unexpected content')
    if (release/'location.conf').read_text() != LOCATION:
        raise RuntimeError('Unexpected Nginx snippet in release')
    stage_root = Path(tempfile.mkdtemp(prefix='.eco-quest-before-', dir=str(SITE.parent)))
    stage = stage_root/'site'
    shutil.copytree(str(SITE), str(stage), symlinks=True)
    for f in frontend:
        dest = stage/f
        if dest.resolve() != dest:
            raise RuntimeError('Unexpected link inside project')
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(str(SOURCE/f), str(dest))
        dest.chmod(0o644)
    CHECKPOINTS.mkdir(mode=0o700, parents=True, exist_ok=True)
    checkpoint = Path(tempfile.mkdtemp(prefix=revision[:10]+'-', dir=str(CHECKPOINTS)))
    shutil.copy2(str(VHOST), str(checkpoint/'vhost.before'))
    if UNIT.exists():
        shutil.copy2(str(UNIT), str(checkpoint/'service.before'))
    state = {'previous':os.readlink(str(current)) if current.is_symlink() else None,
             'next':str(release), 'had_unit':UNIT.exists(), 'enabled':enabled, 'active':active,
             'site_switched':False, 'stage':str(stage), 'old_config_hash':digest(VHOST),
             'new_config_hash':hashlib.sha256(next_config.encode()).hexdigest(),
             'web_hashes':{n:digest(stage/n) for n in frontend}, 'rolled_back':False}
    save_state(checkpoint,state)
    print('Recovery checkpoint:', checkpoint, flush=True)
    try:
        update_link(str(release))
        write_atomic(UNIT, UNIT_TEXT.encode(), 0o644)
        ctl('daemon-reload')
        ctl('enable', SERVICE)
        ctl('restart', SERVICE)
        check_api('http://127.0.0.1:8766/api/')
        write_atomic(VHOST,next_config.encode(),VHOST.stat().st_mode & 0o777)
        nginx(['-t'])
        nginx(['-s','reload'])
        check_api('http://127.0.0.1/eco-quest/api/')
        exchange(stage, SITE)
        state['site_switched'] = True
        save_state(checkpoint,state)
        for n in PUBLIC:
            with urlopen('http://127.0.0.1/eco-quest/'+n, timeout=4) as res:
                if res.read() != (SOURCE/n).read_bytes():
                    raise RuntimeError('Source route differs from executable release')
    except BaseException:
        rollback(checkpoint, state)
        raise
    print('Published {}. Rollback checkpoint {}'.format(revision, checkpoint))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--revision')
    group.add_argument('--rollback', type=Path)
    options = parser.parse_args()
    if os.geteuid() != 0:
        parser.error('Run on the existing ECS host as an administrator')
    os.umask(0o022)
    with open('/run/lock/eco-quest-kernel.lock','a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        if options.revision:
            deploy(options.revision)
        else:
            saved=options.rollback.resolve()
            if saved.parent != CHECKPOINTS:
                parser.error('Specify a recovery checkpoint printed by this installer')
            info=json.loads((saved/'state.json').read_text())
            if info['rolled_back']:
                parser.error('This release was already rolled back')
            rollback(saved,info)
            print('Restored the release preceding',saved)
