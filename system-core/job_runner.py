#!/usr/bin/env python3
"""
Job Runner - Executes individual batch jobs.

Responsibilities:
- Validate host resources and availability
- Execute jobs (bash/python/plsql/sql/docker) with proper error handling
- Update database status throughout job lifecycle
- Manage processing directories and runtime logs
"""

import os
import sys
import subprocess
import time
import logging
import shlex
import json
from pathlib import Path
from dotenv import load_dotenv


from db_manager import DatabaseManager

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s: %(message)s',
    force=True
)

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path)
    logging.info(f'Loaded environment from {env_path}')


def log_to_runtime(runtime_cfg: str, message: str):
    """Append message to runtime config file."""
    try:
        with open(runtime_cfg, 'a') as f:
            f.write(message)
    except Exception as e:
        logging.error(f'Failed to write to runtime config: {e}')


def send_email(email: str, hostname: str, batch_id: int, message: str):
    """Send email notification."""
    mail_software = os.getenv('MAIL_SOFTWARE', 'echo')
    system_name = os.getenv('SYSTEM_NAME', 'DPMC')
    
    try:
        proc = subprocess.Popen(
            [mail_software, email],
            stdin=subprocess.PIPE,
            universal_newlines=True
        )
        subject = f"Subject: [{system_name}] Job Error - Batch {batch_id}\n\n"
        body = f"Hostname: {hostname}\nBatch ID: {batch_id}\n\n{message}\n"
        proc.stdin.write(subject + body)
        proc.stdin.close()
    except Exception:
        logging.exception('Failed to send email')


def main(argv):
    if len(argv) < 2:
        print('Usage: job_runner.py BATCH_ID [APP_HOME] [HOSTNAME]')
        return 4

    try:
        BATCH_ID = int(argv[1])
    except (ValueError, IndexError):
        logging.error(f'Invalid batch_id argument: {argv[1] if len(argv) > 1 else "missing"}')
        return 4

    APP_HOME = os.getenv('DPMC_HOME') or (argv[2] if len(argv) > 2 else None)
    if not APP_HOME:
        logging.error('DPMC_HOME not set and not provided as argument')
        return 2

    try:
        db = DatabaseManager.from_env()
    except Exception as e:
        logging.error(f'Failed to initialize database: {e}')
        return 3

    EMAIL = db.execute_scalar(
        "SELECT email FROM internal.requester WHERE name LIKE 'Operator'"
    ) or ''

    try:
        PID = os.getpid()
        HOSTNAME = argv[3] if len(argv) > 3 else os.getenv('HOSTNAME', os.uname().nodename)

        db.execute_query(
            """
            UPDATE processing.top SET pid = %s, started = now() WHERE batch_id = %s;
            UPDATE processing.batch SET status = 'RUNNING' WHERE id = %s;
            """,
            (PID, BATCH_ID, BATCH_ID),
            fetch=False
        )

        OUTPUT_DIR = "./tmp_output_dir"
        os.makedirs(OUTPUT_DIR, exist_ok=True)

        host_info = db.execute_one(
            "SELECT host_id, processing_dir, cache_dir FROM processing.hosts WHERE hostname = %s",
            (HOSTNAME,)
        )
        
        if not host_info:
            logging.error(f'Host {HOSTNAME} not found in database')
            return 2

        HOST_ID, PROCESSING_DIR_HOME, CACHE_DIR_HOME = host_info

        def mark_unavailable_and_requeue(reason: str, exit_code: int):
            """Mark host unavailable and requeue batch."""
            db.execute_query(
                "UPDATE processing.hosts SET available = false WHERE host_id = %s",
                (HOST_ID,),
                fetch=False
            )
            db.execute_query(
                """
                UPDATE processing.batch SET status = 'QUEUED' WHERE id = %s;
                DELETE FROM processing.top WHERE batch_id = %s;
                """,
                (BATCH_ID, BATCH_ID),
                fetch=False
            )
            logging.error(reason)
            send_email(EMAIL, HOSTNAME, BATCH_ID, reason)
            sys.exit(exit_code)

        if not os.path.isdir(OUTPUT_DIR):
            mark_unavailable_and_requeue(f"{OUTPUT_DIR} not available on {HOSTNAME}", 5)

        if not PROCESSING_DIR_HOME:
            mark_unavailable_and_requeue(f"processing_dir not defined on {HOSTNAME}", 6)
        if not CACHE_DIR_HOME:
            mark_unavailable_and_requeue(f"cache_dir not defined on {HOSTNAME}", 6)

        if not os.path.isdir(PROCESSING_DIR_HOME):
            mark_unavailable_and_requeue(f"{PROCESSING_DIR_HOME} not available on {HOSTNAME}", 7)
        if not os.path.isdir(CACHE_DIR_HOME):
            mark_unavailable_and_requeue(f"{CACHE_DIR_HOME} not available on {HOSTNAME}", 7)

        PROCESSING_DIR = os.path.join(PROCESSING_DIR_HOME, str(PID))
        try:
            os.makedirs(PROCESSING_DIR, exist_ok=True)
        except Exception:
            mark_unavailable_and_requeue(f"{PROCESSING_DIR} could not be created on {HOSTNAME}", 8)

        RUNTIME_CFG = os.path.join(PROCESSING_DIR, 'runtime_config.txt')
        with open(RUNTIME_CFG, 'w') as f:
            f.write('----------------------------------------------\n')
            f.write(f" Start time : {time.ctime()}\n")
            f.write('----------------------------------------------\n')
            f.write(f" Batch ID : {BATCH_ID}\n")
            f.write(f" HOSTNAME : {HOSTNAME}\n")
            f.write(f" OS : {os.uname().sysname}\n")
            f.write(f" PID : {PID}\n")

        job_info = db.execute_one(
            """
            SELECT pt.s_type, psd.function_name, b.input, b.output
            FROM processing.batch AS b 
            JOIN processing.request AS r ON r.id = b.request_id 
            JOIN processing.processing_script AS ps ON r.processing_script_id = ps.id
            JOIN processing.processing_script_detail AS psd ON ps.id = psd.id 
            JOIN processing.processing_type AS pt ON pt.id = psd.type
            WHERE b.id = %s AND psd.seq_index = 1 
            ORDER BY psd.seq_index
            """,
            (BATCH_ID,)
        )

        if not job_info:
            logging.error(f'No job found for batch {BATCH_ID}')
            return 2

        JOB_TYPE, JOB_NAME, BATCH_INPUT, BATCH_OUTPUT = job_info
        
        # Parse input JSON if present
        if BATCH_INPUT:
            try:
                BATCH_INPUT = json.loads(BATCH_INPUT) if isinstance(BATCH_INPUT, str) else BATCH_INPUT
            except json.JSONDecodeError as e:
                logging.warning(f'Failed to parse batch input JSON: {e}')
                BATCH_INPUT = None
        
        # Parse output JSON if present
        if BATCH_OUTPUT:
            try:
                BATCH_OUTPUT = json.loads(BATCH_OUTPUT) if isinstance(BATCH_OUTPUT, str) else BATCH_OUTPUT
            except json.JSONDecodeError as e:
                logging.warning(f'Failed to parse batch output JSON: {e}')
                BATCH_OUTPUT = None

        with open(RUNTIME_CFG, 'a') as f:
            f.write('----------------------------------------------\n')
            f.write(f" Start {JOB_NAME} ({JOB_TYPE}) at {time.ctime()}\n")
            f.write('----------------------------------------------\n')

        ERROR = 0
        SPECIFIC_BATCH = os.path.join(APP_HOME, 'specific-batch')

        if JOB_TYPE in ('bash', 'pgbash'):
            script_path = os.path.join(SPECIFIC_BATCH, JOB_NAME)

            # Prepare arguments
            args = [str(BATCH_ID)]
            if isinstance(BATCH_INPUT, dict):
                input_args = BATCH_INPUT.get('args') or []
                for arg in input_args:
                    if isinstance(arg, str):
                        args.append(arg)

            try:
                with open(RUNTIME_CFG, 'a') as fout:
                    proc = subprocess.run(
                        [script_path] + args,
                        stdout=fout,
                        stderr=subprocess.STDOUT
                    )
                ERROR = proc.returncode
            except Exception as e:
                logging.exception('Failed to run bash script')
                ERROR = 1
                log_to_runtime(RUNTIME_CFG, f"Exception: {str(e)}\n")

        elif JOB_TYPE == 'plsql':
            try:
                result = db.execute_scalar(f"SELECT {JOB_NAME}(%s)", (BATCH_ID,))
                log_to_runtime(RUNTIME_CFG, f"Result: {result}\n")
            except Exception as e:
                logging.exception('Failed to run plsql function')
                ERROR = 1
                log_to_runtime(RUNTIME_CFG, f"Exception: {str(e)}\n")

        elif JOB_TYPE == 'sql':
            try:
                result = db.execute_query(JOB_NAME)
                log_to_runtime(RUNTIME_CFG, f"Result: {result}\n")
            except Exception as e:
                logging.exception('Failed to run sql query')
                ERROR = 1
                log_to_runtime(RUNTIME_CFG, f"Exception: {str(e)}\n")

        elif JOB_TYPE == 'python':
            script_path = os.path.join(SPECIFIC_BATCH, JOB_NAME)
            
            # Prepare arguments
            args = [str(BATCH_ID)]
            if isinstance(BATCH_INPUT, dict):
                input_args = BATCH_INPUT.get('args') or []
                for arg in input_args:
                    if isinstance(arg, str):
                        args.append(arg)
            try:
                with open(RUNTIME_CFG, 'a') as fout:
                    proc = subprocess.run(
                        ['python3', script_path] + args,
                        stdout=fout,
                        stderr=subprocess.STDOUT
                    )
                ERROR = proc.returncode
            except Exception as e:
                logging.exception('Failed to run python script')
                ERROR = 1
                log_to_runtime(RUNTIME_CFG, f"Exception: {str(e)}\n")

        elif JOB_TYPE == 'docker':
            docker_cmd = None
            docker_volumes = []

            if isinstance(BATCH_INPUT, dict):
                docker_cmd = BATCH_INPUT.get('cmd')
                raw_volumes = BATCH_INPUT.get('volumes') or []
                docker_volumes = [v for v in raw_volumes if isinstance(v, str)]
            
            if not docker_cmd:
                logging.error(f'No "cmd" field in input JSON for batch {BATCH_ID}')
                ERROR = 1
                log_to_runtime(RUNTIME_CFG, f"Error: No 'cmd' field in input JSON for batch {BATCH_ID}\n")
            else:
                try:
                    docker_image = JOB_NAME
                    
                    # Ensure local work directory exists and is mounted to /work in the container
                    work_dir = os.path.join(APP_HOME, 'work')
                    os.makedirs(work_dir, exist_ok=True)
                    has_work_mount = any(
                        len(vol.split(':')) >= 2 and vol.split(':')[1].split(':')[0] == '/work'
                        for vol in docker_volumes
                    )
                    if not has_work_mount:
                        docker_volumes.append(f'{work_dir}:/work')
                    
                    log_to_runtime(RUNTIME_CFG, f"Running Docker image: {docker_image}\n")
                    log_to_runtime(RUNTIME_CFG, f"Work directory: {work_dir}\n")
                    if docker_volumes:
                        log_to_runtime(RUNTIME_CFG, f"Volumes: {docker_volumes}\n")
                    log_to_runtime(RUNTIME_CFG, f"Command: {docker_cmd}\n")
                    
                    # Parse command into list of arguments
                    cmd_args = shlex.split(docker_cmd)
                    docker_run_cmd = ['docker', 'run', '--rm']
                    for volume in docker_volumes:
                        docker_run_cmd.extend(['-v', volume])
                    docker_run_cmd.append(docker_image)
                    docker_run_cmd.extend(cmd_args)
                    
                    with open(RUNTIME_CFG, 'a') as fout:
                        proc = subprocess.run(
                            docker_run_cmd,
                            stdout=fout,
                            stderr=subprocess.STDOUT
                        )
                    ERROR = proc.returncode
                except Exception as e:
                    logging.exception('Failed to run docker container')
                    ERROR = 1
                    log_to_runtime(RUNTIME_CFG, f"Exception: {str(e)}\n")
        
        else:
            logging.error(f'Unknown job type: {JOB_TYPE}')
            ERROR = 1

        log_to_runtime(RUNTIME_CFG, f"\nJob {JOB_NAME} returned error code {ERROR}\n")
        log_to_runtime(RUNTIME_CFG, f"End time: {time.ctime()}\n")

        ERROR_STATUS = 'DONE' if ERROR == 0 else 'ERROR'
        
        BATCH_STATUS = db.execute_scalar(
            "SELECT status FROM processing.batch WHERE id = %s",
            (BATCH_ID,)
        )
        
        if BATCH_STATUS == 'RESET_QUEUED':
            db.execute_query(
                """
                DELETE FROM processing.top WHERE batch_id = %s;
                DELETE FROM processing.history WHERE batch_id = %s;
                UPDATE processing.batch SET status = 'QUEUED' WHERE id = %s;
                """,
                (BATCH_ID, BATCH_ID, BATCH_ID),
                fetch=False
            )
        else:
            db.execute_query(
                "SELECT processing.delete_top_item(%s, %s)",
                (BATCH_ID, ERROR_STATUS),
                fetch=False
            )

        log_to_runtime(RUNTIME_CFG, f"Batch status: {BATCH_STATUS}, Error status: {ERROR_STATUS}\n")

        return ERROR
    
    except Exception as e:
        logging.exception(f'Job execution failed: {e}')
        return 1
    finally:
        db.close()


if __name__ == '__main__':
    rc = main(sys.argv)
    sys.exit(rc if isinstance(rc, int) else 0)
