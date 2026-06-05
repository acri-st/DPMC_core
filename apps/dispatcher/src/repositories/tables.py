"""Quoted Postgres table identifiers used in raw SQL fragments.

Centralising these names keeps the SQL strings consistent across
repositories and prevents the casing drift that previously stopped every
loop from running (queries were written against PascalCase identifiers
that do not exist in the snake_case schema produced by Prisma).
"""

from __future__ import annotations


class T:
    BATCH = '"batch"'
    HOST = '"host"'
    JOB = '"job"'
    JOB_ALLOCATION = '"job_x_allocation"'
    PROCESSING_SCRIPT_VERSION = '"processing_script_version"'
    PROCESSING_CHAIN = '"processing_chain"'
    PRODUCT = '"product"'
    PRODUCTION_CHAIN = '"production_chain"'
    PRODUCTION_CHAIN_EDGE = '"production_chain_x_edge"'
    PROJECT = '"project"'
    TASK = '"task"'
