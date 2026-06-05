FROM python:3.12-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends imagemagick \
 && rm -rf /var/lib/apt/lists/* \
 && pip install --no-cache-dir boto3 requests

ENV PYTHONPATH=/dpmc_lib
WORKDIR /work
