import argparse
import json
import os
import time
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import random
import string
import json
import re


def connect_db(fallback=None):
    """Connect to the DB using environment variables and an optional fallback dict.

    The precedence is: os.environ -> fallback.
    Supported variable names: DB_SERVER or PGHOST, DB_USER or PGUSER, DB_PASSWORD or PGPASSWORD,
    DB_NAME or PGDATABASE, DB_PORT or PGPORT. Returns a psycopg2 connection with autocommit enabled.
    """
    env_map = dict(os.environ)
    if fallback:
        # fallback should provide values when environment variables are not set
        for k, v in fallback.items():
            env_map.setdefault(k, v)

    host = env_map.get('DB_SERVER') or env_map.get('PGHOST')
    user = env_map.get('DB_USER') or env_map.get('PGUSER')
    password = env_map.get('DB_PASSWORD') or env_map.get('PGPASSWORD')
    dbname = env_map.get('DB_NAME') or env_map.get('PGDATABASE')
    port = env_map.get('PGPORT') or env_map.get('DB_PORT') or 5432

    if not (host and user and dbname):
        raise RuntimeError("Missing DB connection info (DB_SERVER/DB_USER/DB_NAME). Provide environment variables or pass a fallback dict.")

    try:
        conn = psycopg2.connect(
            dbname=dbname,
            user=user,
            password=password,
            host=host,
            port=int(port)
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        print("Connected to database")
    except Exception as exc:
        raise RuntimeError(f"Failed to connect to DB: {exc}") from exc

    return conn

def get_input(batch_id, cursor):
    cursor.execute(f"""
        SELECT input FROM processing.batch WHERE id = {batch_id};
    """)
    return cursor.fetchone()

def get_params(batch_id, cursor):
    cursor.execute(f"SELECT value FROM processing.parameters_set WHERE id = {batch_id}")
    return cursor.fetchall()

def get_processing_script(pcc_id, cursor):
    cursor.execute(f"""
        SELECT processing_script_id FROM processing.processing_chain WHERE id = {pcc_id};
    """)
    return cursor.fetchone()

def get_pcc_configuration(pcc_id, cursor):
    """Retrieve the configuration JSON from processing_chain table."""
    cursor.execute(f"""
        SELECT configuration FROM processing.processing_chain WHERE id = {pcc_id};
    """)
    result = cursor.fetchone()
    if result and result[0]:
        return json.loads(result[0]) if isinstance(result[0], str) else result[0]
    return None

def get_pcr_input(tag, cursor):
    """Retrieve the input JSON from processing_chain_run table."""
    cursor.execute(f"""
        SELECT input FROM processing.processing_chain_run WHERE tag = '{tag}';
    """)
    result = cursor.fetchone()
    if result and result[0]:
        return json.loads(result[0]) if isinstance(result[0], str) else result[0]
    return None

def build_docker_command(cmd_template, params):
    """Replace placeholders like %INPUT% with values from params dict."""
    if not cmd_template or not params:
        return cmd_template
    
    # Replace all %KEY% patterns with corresponding values from params
    def replace_placeholder(match):
        key = match.group(1)
        return str(params.get(key, match.group(0)))  # Keep original if key not found
    
    return re.sub(r'%(\w+)%', replace_placeholder, cmd_template)

def get_request_id(processing_script_id, cursor):
    cursor.execute(f"""
        SELECT id FROM processing.request WHERE processing_script_id = {processing_script_id};
    """)
    return cursor.fetchone()

def get_pcr(tag_pcc, cursor):
    cursor.execute(f"""
        UPDATE processing.processing_chain_run
        SET status = 'RUNNING', start_time = NOW()
        WHERE tag = '{tag_pcc}';
    """)

    cursor.execute(f"""
        SELECT * FROM processing.processing_chain_run WHERE tag = '{tag_pcc}';
    """)
    return cursor.fetchone()


def extract_batch_parameters(batch_id, cursor):
    """Extract and parse batch parameters (pcc_id, tag_pdr, tag_pcr) from the database.
    
    Args:
        batch_id: ID of the batch to process
        cursor: Database cursor
        
    Returns:
        tuple: (pcc_id, tag_pdr, tag_pcr, input_data)
    """
    params = get_params(batch_id, cursor)
    print(f"Parameters for batch ID {batch_id}: {params}")
    
    pcc_id = params[0][0]
    tag_pdr = params[1][0]
    tag_pcr = params[2][0]
    input_data = get_input(batch_id, cursor)[0]
    
    return pcc_id, tag_pdr, tag_pcr, input_data


def prepare_batch_configuration(pcc_id, tag_pdr, tag_pcr, cursor):
    """Retrieve and build batch configuration from PCC and PCR data.
    
    Args:
        pcc_id: Processing chain configuration ID
        tag_pdr: Processing data run tag
        tag_pcr: Processing chain run tag
        cursor: Database cursor
        
    Returns:
        tuple: (docker_cmd, docker_volumes, script_args, pcr_input) - built command, volumes list, resolved script args, and input params
    """
    # Get PCC configuration (contains command template or script_args)
    pcc_config = get_pcc_configuration(pcc_id, cursor)
    print(f"PCC configuration: {pcc_config}")
    
    # Get PCR input parameters (for placeholder replacement)
    pcr_input = get_pcr_input(tag_pcr, cursor)
    print(f"PCR input parameters: {pcr_input}")
    
    # Build docker command and collect volumes from PCC config
    docker_cmd = None
    docker_volumes = []
    script_args = None
    
    if pcc_config:
        docker_cmd = None
        docker_volumes = None
        script_args = None

        # Handle docker command configuration
        if isinstance(pcc_config, dict) and 'docker' in pcc_config:
            docker_cfg = pcc_config.get('docker')
            cmd_template = docker_cfg.get('cmd') or None
            docker_volumes = docker_cfg.get('volumes') or None
            if cmd_template is None:
                raise RuntimeError("Docker configuration must include a 'cmd' field.")


            docker_cmd = build_docker_command(cmd_template, pcr_input or {})
            print(f"Built docker command: {docker_cmd}")
            if docker_volumes:
                print(f"Using docker volumes: {docker_volumes}")
        
        # Handle script_args configuration
        if isinstance(pcc_config, dict) and 'script_args' in pcc_config:
            script_args_template = pcc_config['script_args']
            if script_args_template and isinstance(script_args_template, list):
                # Always start with tag_pdr and tag_pcr as first arguments
                script_args = [tag_pdr, tag_pcr]
                # Resolve script_args by replacing arg names with values from pcr_input
                for arg_name in script_args_template:
                    if pcr_input and arg_name in pcr_input:
                        # Convert value to string
                        script_args.append(str(pcr_input[arg_name]))
                    else:
                        # Keep placeholder if value not found
                        script_args.append(arg_name)
                print(f"Resolved script_args: {script_args}")
    
    return docker_cmd, docker_volumes, script_args


def create_batch_with_payload(request_id, docker_cmd, docker_volumes, script_args, cursor):
    """Create a new batch in the database with Docker configuration or script args.
    
    Args:
        request_id: Request ID to associate with the batch
        docker_cmd: Docker command to execute
        docker_volumes: List of Docker volumes to mount
        script_args: List of resolved script arguments
        cursor: Database cursor
        
    Returns:
        int: ID of the created batch
    """
    # Build the input payload
    batch_input_payload = {}
    if docker_cmd is not None:
        batch_input_payload['cmd'] = docker_cmd
    if docker_volumes:
        batch_input_payload['volumes'] = docker_volumes
    if script_args is not None:
        batch_input_payload['args'] = script_args
    
    batch_input_json = json.dumps(batch_input_payload) if batch_input_payload else None
    input_value = f"'{batch_input_json}'::jsonb" if batch_input_json else 'NULL'
    
    cursor.execute(f"""
        INSERT INTO processing.batch (request_id, status, input)
        SELECT {request_id} AS id, 'QUEUED', {input_value}
        RETURNING id;
    """)
    batch_id = cursor.fetchone()[0]
    print(f"Created batch with ID: {batch_id}")
    
    return batch_id


def wait_for_batch_completion(batch_id, cursor, poll_interval=5):
    """Poll the database until the batch processing is complete.
    
    Args:
        batch_id: ID of the batch to monitor
        cursor: Database cursor
        poll_interval: Seconds between each status check (default: 5)
    """
    finished = False
    
    while not finished:
        cursor.execute(f"""
            SELECT batch_id, status FROM processing.history WHERE batch_id = {batch_id};
        """)
        result = cursor.fetchone()
        if result:
            print(f"Batch ID {result[0]} is {result[1]}")
            finished = True
        time.sleep(poll_interval)


def finalize_processing_chain_run(tag_pcr, cursor):
    """Mark the processing chain run as completed in the database.
    
    Args:
        tag_pcr: Processing chain run tag
        cursor: Database cursor
    """
    cursor.execute(f"""
        UPDATE processing.processing_chain_run
        SET status = 'DONE', stop_time = NOW()
        WHERE tag = '{tag_pcr}';
    """)
    print("Processing chain completed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Scan products on data source')
    parser.add_argument('batch_id', type=str, help='Batch id')
    args = parser.parse_args()

    # Connect to database
    db_conn = connect_db()
    cursor = db_conn.cursor()
    
    # Extract batch parameters
    pcc_id, tag_pdr, tag_pcr, input_data = extract_batch_parameters(args.batch_id, cursor)
    
    # Start processing chain run
    pcr = get_pcr(tag_pcr, cursor)
    print(f"PCR for tag {tag_pcr}: {pcr}")
    
    # Get request ID
    processing_script_id = get_processing_script(pcc_id, cursor)[0]
    request_id = get_request_id(processing_script_id, cursor)[0]
    
    # Prepare batch configuration
    docker_cmd, docker_volumes, script_args = prepare_batch_configuration(pcc_id, tag_pdr, tag_pcr, cursor)
    
    # Create and queue the batch
    batch_id = create_batch_with_payload(request_id, docker_cmd, docker_volumes, script_args, cursor)
    
    # Wait for batch completion
    wait_for_batch_completion(batch_id, cursor)
    
    # Finalize processing chain run
    finalize_processing_chain_run(tag_pcr, cursor)