import argparse
import json
import time
import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import random
import string


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

def get_params(batch_id, cursor):
    cursor.execute(f"SELECT value FROM processing.parameters_set WHERE id = {batch_id}")
    return cursor.fetchall()

def get_pccs(pdc_id, cursor):
    cursor.execute(f"""
        SELECT pcc_id, parent_pcc_id, parent_dependency_mode FROM processing.pdc_x_pcc
        WHERE pdc_id = {pdc_id};
    """)
    return cursor.fetchall()

def retrieve_hostname(cursor, batch_id):
    result = None
    while result is None:
        cursor.execute(f"""
            SELECT ho.hostname FROM processing.hosts AS ho JOIN processing.history AS hi ON hi.host_id = ho.host_id
            WHERE hi.batch_id = {batch_id};
        """)
        result = cursor.fetchone()
        time.sleep(1)
    return result[0] if result else None

def create_pcr(tag_pdc, pcc_id, tag_pcc, cursor, input, hostname):
    cursor.execute(f"""
        INSERT INTO processing.processing_chain_run (pdc_run_tag, pcc_id, block_index, tag, sxac_id, input, status, start_time)
        VALUES ('{tag_pdc}', {pcc_id}, 0, '{tag_pcc}', 0, '{json.dumps(input)}'::jsonb, 'RUNNING', NOW());
    """)

def create_pcr_batch(pcc_id, tag, cursor, input, hostname):
    tag_pcc = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    
    cursor.execute(f"""
        INSERT INTO processing.batch (request_id, status)
        SELECT req.id, 'QUEUED'
        FROM processing.request AS req JOIN processing.processing_script AS proc_script ON req.processing_script_id = proc_script.id
        WHERE proc_script.pcomment = 'PCR'
        RETURNING id;
    """)
    batch_id = cursor.fetchone()[0]
    print (f"Created batch with ID: {batch_id}")
    create_pcr(tag, pcc_id, tag_pcc, cursor, input, hostname)
    cursor.execute(f"""
        INSERT INTO processing.parameters_set (id, keyword_index, keyword, value)
        VALUES ({batch_id}, 0, 'PCC_ID', '{pcc_id}'),
            ({batch_id}, 1, 'TAG_PDR', '{tag}'),
            ({batch_id}, 2, 'TAG_PCC', '{tag_pcc}');
    """)
    return batch_id

def get_pdr(tag, cursor):
    cursor.execute(f"""
        UPDATE processing.production_chain_run
        SET status = 'RUNNING', start_time = NOW()
        WHERE tag = '{tag}';
    """)
    cursor.execute(f"""
        SELECT * FROM processing.production_chain_run WHERE tag = '{tag}';
    """)
    return cursor.fetchone()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Scan products on data source')
    parser.add_argument('batch_id', type=str, help='Batch id')
    args = parser.parse_args()

    db_conn = connect_db()
    cursor = db_conn.cursor()
    params = get_params(args.batch_id, cursor)
    print(f"Parameters for batch ID {args.batch_id}: {params}")

    pdc_id = params[0][0]
    task_id = params[1][0]
    tag = params[2][0]

    try:
        pccs = get_pccs(pdc_id, cursor)
        print(f"PCCs for PDC ID {pdc_id}: {pccs}")

        pdr = get_pdr(tag, cursor)
        print(f"PDR for tag {tag}: {pdr}")
        input = pdr[6]
        finished = False

        cursor.execute(f"""
            UPDATE processing.task SET status = 'RUNNING' WHERE id = {task_id};
            UPDATE processing.task SET start_time = NOW() WHERE id = {task_id};
        """)
        
        batch_status = []

        for pcc in pccs:
            if pcc[1] is None:
                batch_id = create_pcr_batch(pcc[0], tag, cursor, input, None)
                batch_status.append((batch_id, 'QUEUED', pcc[0]))
                pccs.remove(pcc)
                break
        
        hostname = retrieve_hostname(cursor, batch_id)
        print(f"Initial batch is running on host: {hostname}")
        print(pccs)

        while not finished:
            for pcc in pccs:
                if pcc[1] is None:
                    batch_id = create_pcr_batch(pcc[0], tag, cursor, input, hostname)
                    batch_status.append((batch_id, 'QUEUED', pcc[0]))
                    print(pccs)
                    pccs.remove(pcc)
                else:
                    parent_batch = next((b for b in batch_status if b[2] == pcc[1]), None)
                    print(f"Parent batch for PCC {pcc}: {parent_batch}")
                    if (pcc[2] == "ON_SUCCESS" and parent_batch[1] == "DONE") or (pcc[2] == "ON_FAILURE" and parent_batch[1] == "ERROR"):
                        batch_id = create_pcr_batch(pcc[0], tag, cursor, input, hostname)
                        batch_status.append((batch_id, 'QUEUED', pcc[0]))
                        pccs.remove(pcc)
                        print(pccs)
                    elif parent_batch[1] in ['ERROR', 'DONE']:
                        cursor.execute(f"""
                            UPDATE processing.task SET status = 'ERROR' WHERE id = {task_id};
                        """)
                        pccs.remove(pcc)
        
            cursor.execute(f"""
                SELECT batch_id, status FROM processing.history WHERE batch_id IN ({','.join(str(b[0]) for b in batch_status)});
            """)
            history = cursor.fetchall()
            for record in history:
                print(f"Batch ID: {record[0]}, Status: {record[1]}")
                batch_status = [(b[0], record[1], b[2]) if b[0] == record[0] else b for b in batch_status]
            
            if len(pccs) == 0:
                finished = True
            time.sleep(5)




        cursor.execute(f"""
            UPDATE processing.production_chain_run
            SET status = 'DONE', stop_time = NOW()
            WHERE tag = '{tag}';
        """)
        cursor.execute(f"""
            UPDATE processing.task SET status = 'DONE' WHERE id = {task_id};
        """)
    except Exception as exc:
        cursor.execute(f"""
            UPDATE processing.production_chain_run
            SET status = 'ERROR', stop_time = NOW()
            WHERE tag = '{tag}';
        """)
        cursor.execute(f"""
            UPDATE processing.task SET status = 'ERROR' WHERE id = {task_id};
        """)
        print(f"Error during processing chain: {exc}")
    finally:
        print("Production chain completed.")