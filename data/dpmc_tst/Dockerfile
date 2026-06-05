FROM alpine:3.21
RUN apk add --no-cache bash gawk
COPY components/ /usr/local/components/
COPY conf/dpmc_tst_conf.txt /data/dpmc_tst_conf.txt
RUN chmod +x /usr/local/components/IPF_L1/bin/L1.sh \
             /usr/local/components/IPF_L2/bin/L2.sh
