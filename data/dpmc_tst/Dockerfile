FROM alpine:3.21
# coreutils provides GNU date: L1.sh/L2.sh compute the production-time field with
# `date -d "+3 hours"`, which BusyBox's date doesn't support (it would fail with
# "date: unrecognized option" and abort the job under `set -e`).
RUN apk add --no-cache bash gawk coreutils

# COPY paths are repo-root-relative: the CI build-dpmc-tst job (and any manual
# build) uses the repo root as context — `docker build -f data/dpmc_tst/Dockerfile .`
# The IPF_L1/IPF_L2 executables are baked at /usr/local/components/<comp>/bin so
# the API picks the `positional` self-contained execution mode (see
# worker.service.ts `executableMode`) — runs on the k8s backend, no host mounts.
COPY data/dpmc_tst/components/ /usr/local/components/
COPY data/dpmc_tst/conf/dpmc_tst_conf.txt /data/dpmc_tst_conf.txt
RUN chmod +x /usr/local/components/IPF_L1/bin/L1.sh \
             /usr/local/components/IPF_L2/bin/L2.sh
