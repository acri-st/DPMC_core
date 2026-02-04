#!/usr/bin/env python3
"""
Job Launcher - Orchestrates batch job execution.

Continuously monitors the database for jobs to execute,
launches job_runner.py processes in background, and manages timeouts.
"""

import os
import sys
import time
import logging
import subprocess
from pathlib import Path
from dotenv import load_dotenv

from db_manager import DatabaseManager

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s: %(message)s",
    force=True
)

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path)
    logging.info(f'Loaded environment from {env_path}')
else:
    logging.warning(f'.env file not found at {env_path}')


def send_email(email: str, title: str, body: str):
    """Send email notification via configured mail software."""
    mail_software = os.getenv('MAIL_SOFTWARE', 'echo')
    system_name = os.getenv('SYSTEM_NAME', 'DPMC')
    
    try:
        proc = subprocess.Popen(
            [mail_software, email],
            stdin=subprocess.PIPE,
            universal_newlines=True
        )
        proc.stdin.write(f"Subject: [{system_name}] {title}\n\n{body}\n")
        proc.stdin.close()
    except Exception:
        logging.exception('Failed to send email notification')


def launch_job_runner(batch_id: int, dpmc_home: str, hostname: str) -> bool:
    """Launch job_runner.py as background process."""
    logging.info(f"Launching job_runner.py for batch {batch_id} on host {hostname}")
    
    system_core = os.path.join(dpmc_home, 'system-core')
    runner_script = os.path.join(system_core, 'job_runner.py')
    
    if not os.path.exists(runner_script):
        logging.error(f'job_runner.py not found at {runner_script}')
        return False
    
    try:
        subprocess.Popen(
            ['python3', runner_script, str(batch_id), dpmc_home, hostname],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True
        )
        return True
    except Exception:
        logging.exception(f'Failed to launch job_runner.py for batch {batch_id}')
        return False


def ensure_host_registered(db: DatabaseManager, hostname: str, comment: str):
    """Ensure current host is registered in processing.hosts table."""
    count = db.execute_scalar(
        "SELECT COUNT(*) FROM processing.hosts WHERE hostname = %s",
        (hostname,)
    )
    
    if count == 0:
        logging.info(f"Registering new host: {hostname}")
        ncpu = os.cpu_count() or 1
        
        db.execute_query(
            """
            WITH select_pool AS (
                SELECT id FROM processing.pool WHERE comment = %s
            ),
            insert_hosts AS (
                INSERT INTO processing.hosts 
                (hostname, ncpu, bogomips, nice, os_type, os_version, 
                 processing_dir, available, ip_address, cache_dir)
                VALUES (%s, %s, 10000, 15, 'Linux', 7, '/tmp', True, '127.0.0.1', '/tmp')
                RETURNING host_id
            )
            INSERT INTO processing.pool_x_hosts (pool, hosts)
            SELECT select_pool.id, insert_hosts.host_id 
            FROM select_pool, insert_hosts
            """,
            (comment, hostname, ncpu),
            fetch=False
        )


def handle_timeouts(db: DatabaseManager, timeout_type: str, operator_email: str):
    """Check and handle launch or run timeouts."""
    function_name = (
        'processing.check_launch_time_outs' if timeout_type == 'launch'
        else 'processing.check_run_time_outs'
    )
    
    requeued_count = db.execute_scalar(f"SELECT {function_name}()") or 0
    
    if requeued_count > 0:
        unavailable_hosts = db.execute_query(
            "SELECT hostname FROM processing.hosts WHERE NOT available"
        )
        body = '\n'.join([row[0] for row in unavailable_hosts]) if unavailable_hosts else 'None'
        title = f"[S3PS-DPMC] {requeued_count} batches requeued due to {timeout_type} timeout"
        
        send_email(operator_email, title, body)


def process_dispatched_jobs(db: DatabaseManager, hostname: str, max_launch: int, dpmc_home: str) -> int:
    """Process jobs with DISPATCHED status for current hostname."""
    jobs_launched = 0
    
    while jobs_launched < max_launch:
        row = db.execute_one(
            """
            SELECT batch.id, hosts.hostname 
            FROM processing.batch 
            JOIN processing.top ON top.batch_id = batch.id 
            JOIN processing.hosts ON top.hostname_id = hosts.host_id 
            WHERE status = 'DISPATCHED' AND hosts.hostname = %s 
            ORDER BY batch.id 
            LIMIT 1
            """,
            (hostname,)
        )
        
        if not row:
            break
        
        batch_id, _ = row
        
        db.execute_query(
            "UPDATE processing.batch SET status = 'LAUNCHED' WHERE id = %s",
            (batch_id,),
            fetch=False
        )
        db.execute_query(
            "UPDATE processing.top SET started = now() WHERE batch_id = %s",
            (batch_id,),
            fetch=False
        )
        
        if not launch_job_runner(batch_id, dpmc_home, hostname):
            db.execute_query(
                "UPDATE processing.batch SET status = 'ERROR' WHERE id = %s",
                (batch_id,),
                fetch=False
            )
        
        jobs_launched += 1
    
    return jobs_launched


def main():
    dpmc_home = os.getenv('DPMC_HOME')
    if not dpmc_home:
        logging.error('DPMC_HOME environment variable not set')
        sys.exit(2)
    
    try:
        db = DatabaseManager.from_env()
    except Exception as e:
        logging.error(f'Failed to initialize database connection: {e}')
        sys.exit(3)
    
    hostname = os.getenv('HOSTNAME') or os.uname().nodename
    comment = os.getenv('COMMENT', '')
    max_launch = int(os.getenv('SCHEDULER_MAX_LAUNCH', '5'))
    sleep_interval = int(os.getenv('SCHEDULER_SLEEP', '10'))
    lock_dir = os.getenv('SYSTEM_LOCK', '/tmp')
    lock_file = os.path.join(lock_dir, 'job_launcher.lock')
    
    logging.info(f'Job Launcher starting on host {hostname} (comment: "{comment}")')
    
    operator_email = db.execute_scalar(
        "SELECT email FROM internal.requester WHERE name LIKE 'Operator'"
    ) or ''
    
    ensure_host_registered(db, hostname, comment)
    
    logging.info(f'Starting scheduler loop (sleep: {sleep_interval}s, max_launch: {max_launch})')
    
    try:
        while True:
            handle_timeouts(db, 'launch', operator_email)
            handle_timeouts(db, 'run', operator_email)
            
            jobs_to_launch = db.execute_scalar(
                "SELECT processing.schedule_batches_docker(%s)",
                (hostname,)
            ) or 0
            
            if jobs_to_launch > 0 and not os.path.exists(lock_file):
                process_dispatched_jobs(db, hostname, max_launch, dpmc_home)
                handle_timeouts(db, 'launch', operator_email)
            
            time.sleep(sleep_interval)
    
    except KeyboardInterrupt:
        logging.info('Job Launcher stopped by user')
    finally:
        db.close()


if __name__ == '__main__':
    main()
