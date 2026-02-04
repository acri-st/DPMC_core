FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    bash \
    && rm -rf /var/lib/apt/lists/*

COPY ./system-core/requirements.txt /tmp/requirements.txt
RUN pip3 install --no-cache-dir -r /tmp/requirements.txt

RUN mkdir -p /root/system-core /root/specific-batch /exports/dpmc/tmp /exports/dpmc/scripts
COPY ./definitions.include /root/
COPY ./system-core/* /root/system-core
COPY ./specific-batch/* /root/specific-batch
