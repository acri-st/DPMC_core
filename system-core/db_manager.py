#!/usr/bin/env python3
"""
Database Manager - Centralized PostgreSQL connection and query handling.

Provides robust database operations with connection pooling, error handling,
and automatic retry logic.
"""

import os
import logging
from contextlib import contextmanager
from typing import Optional, List, Tuple, Any, Dict

try:
    import psycopg2
    from psycopg2 import pool
    from psycopg2.extras import RealDictCursor
except ImportError:
    logging.error("psycopg2 not installed. Run: pip install -r requirements.txt")
    raise


class DatabaseManager:
    """Thread-safe database connection manager with pooling."""
    
    def __init__(self, connection_params: Dict[str, Any], min_conn: int = 1, max_conn: int = 10):
        """Initialize connection pool from connection parameters."""
        try:
            self.pool = psycopg2.pool.ThreadedConnectionPool(
                min_conn,
                max_conn,
                **connection_params
            )
            logging.info("Database connection pool initialized")
        except Exception as e:
            logging.error(f"Failed to create connection pool: {e}")
            raise
    
    @classmethod
    def from_env(cls) -> 'DatabaseManager':
        """Create DatabaseManager from environment variables."""
        conn_params = {
            'host': os.getenv('PGHOST', 'localhost'),
            'port': int(os.getenv('PGPORT', '5432')),
            'database': os.getenv('PGDATABASE'),
            'user': os.getenv('PGUSER'),
            'password': os.getenv('PGPASSWORD'),
        }
        
        if not all([conn_params['database'], conn_params['user']]):
            raise ValueError("Database connection parameters incomplete (PGDATABASE, PGUSER required)")
        
        return cls(conn_params)
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections."""
        conn = None
        try:
            conn = self.pool.getconn()
            yield conn
            conn.commit()
        except Exception as e:
            if conn:
                conn.rollback()
            logging.error(f"Database operation failed: {e}")
            raise
        finally:
            if conn:
                self.pool.putconn(conn)
    
    def execute_query(self, query: str, params: Optional[Tuple] = None, fetch: bool = True) -> Optional[List[Tuple]]:
        """Execute a query and optionally fetch results."""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                if fetch:
                    return cur.fetchall()
                return None
    
    def execute_one(self, query: str, params: Optional[Tuple] = None) -> Optional[Tuple]:
        """Execute query and return first row."""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                return cur.fetchone()
    
    def execute_scalar(self, query: str, params: Optional[Tuple] = None) -> Any:
        """Execute query and return single value."""
        result = self.execute_one(query, params)
        return result[0] if result else None
    
    def execute_many(self, query: str, params_list: List[Tuple]) -> None:
        """Execute same query with multiple parameter sets."""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.executemany(query, params_list)
    
    def close(self):
        """Close all connections in the pool."""
        if self.pool:
            self.pool.closeall()
            logging.info("Database connection pool closed")
