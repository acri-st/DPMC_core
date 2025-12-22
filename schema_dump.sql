--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

--
-- Name: internal; Type: SCHEMA; Schema: -; Owner: srv_dpmc
--

CREATE SCHEMA internal;


ALTER SCHEMA internal OWNER TO srv_dpmc;

--
-- Name: lta; Type: SCHEMA; Schema: -; Owner: srv_dpmc
--

CREATE SCHEMA lta;


ALTER SCHEMA lta OWNER TO srv_dpmc;

--
-- Name: processing; Type: SCHEMA; Schema: -; Owner: srv_dpmc
--

CREATE SCHEMA processing;


ALTER SCHEMA processing OWNER TO srv_dpmc;

--
-- Name: SCHEMA processing; Type: COMMENT; Schema: -; Owner: srv_dpmc
--

COMMENT ON SCHEMA processing IS 'Schema containing all the specific table for the processing';


--
-- Name: s3ome; Type: SCHEMA; Schema: -; Owner: srv_dpmc
--

CREATE SCHEMA s3ome;


ALTER SCHEMA s3ome OWNER TO srv_dpmc;

--
-- Name: temporary; Type: SCHEMA; Schema: -; Owner: srv_dpmc
--

CREATE SCHEMA temporary;


ALTER SCHEMA temporary OWNER TO srv_dpmc;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = internal, pg_catalog;

--
-- Name: transcription_status; Type: TYPE; Schema: internal; Owner: srv_dpmc
--

CREATE TYPE transcription_status AS ENUM (
    'full',
    'partial',
    'null'
);


ALTER TYPE internal.transcription_status OWNER TO srv_dpmc;

SET search_path = lta, pg_catalog;

--
-- Name: enum_product_status; Type: TYPE; Schema: lta; Owner: srv_dpmc
--

CREATE TYPE enum_product_status AS ENUM (
    'NEW',
    'FAILED',
    'IN_PROGRESS',
    'ARCHIVED',
    'DELETED',
    'NOT_FOUND',
    'IN_TRANSFER',
    'ABORTED'
);


ALTER TYPE lta.enum_product_status OWNER TO srv_dpmc;

--
-- Name: enum_request_outcome; Type: TYPE; Schema: lta; Owner: srv_dpmc
--

CREATE TYPE enum_request_outcome AS ENUM (
    'OK',
    'NOK'
);


ALTER TYPE lta.enum_request_outcome OWNER TO srv_dpmc;

--
-- Name: enum_transaction_status; Type: TYPE; Schema: lta; Owner: srv_dpmc
--

CREATE TYPE enum_transaction_status AS ENUM (
    'NEW',
    'PENDING',
    'ACTIVE',
    'ABORTED',
    'FAILED',
    'FINISHED'
);


ALTER TYPE lta.enum_transaction_status OWNER TO srv_dpmc;

--
-- Name: transaction_status; Type: TYPE; Schema: lta; Owner: srv_dpmc
--

CREATE TYPE transaction_status AS ENUM (
    'NEW',
    'PENDING',
    'ACTIVE',
    'ABORTED',
    'FAILED',
    'FINISHED'
);


ALTER TYPE lta.transaction_status OWNER TO srv_dpmc;

SET search_path = internal, pg_catalog;

--
-- Name: add_product_to_dataset(integer, integer); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION add_product_to_dataset(integer, integer) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
declare
  dataset_ alias for $1;
  product_ alias for $2;
  aux_ integer;
begin
  if not exists (select * from internal.dataset where id = dataset_) then
    raise exception 'specified dataset id % not found', dataset_;
  end if;
  if not exists (select * from internal.product where id = product_) then
    raise exception 'specified product id % not found', product_;
  end if;
  if exists (select * from internal.dataset_x_product as dxp where dxp.dataset_id = dataset_ and dxp.product_id = product_) then
    raise exception 'product id % already included in dataset id %', product_, dataset_;
  else
    insert into internal.dataset_x_product (dataset_id, product_id) values (dataset_, product_);
  end if;
  return 0;
end;
$_$;


ALTER FUNCTION internal.add_product_to_dataset(integer, integer) OWNER TO srv_dpmc;

--
-- Name: add_product_to_dataset_by_name(character varying, character varying); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION add_product_to_dataset_by_name(character varying, character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
declare
  dataset_name_ alias for $1;
  product_name_ alias for $2;
  dataset_id_ integer;
  product_id_ integer;
begin
  if not exists (select * from internal.dataset where dataset.name = dataset_name_) then
    raise exception 'specified dataset % not found', dataset_name_;
  else
    select dataset.id into dataset_id_ from internal.dataset where dataset.name = dataset_name_;
  end if;
  if not exists (select * from internal.product where product.name = product_name_) then
    raise exception 'specified product % not found', product_name_;
  else
    select product.id into product_id_ from internal.product where product.name = product_name_;
  end if;
  
  if exists (select * from internal.dataset_x_product as dxp where dxp.dataset_id = dataset_id_ and dxp.product_id = product_id_) then
    raise exception 'product % already included in dataset %', product_name_, dataset_name_;
  else
    insert into internal.dataset_x_product (dataset_id, product_id) values (dataset_id_, product_id_);
  end if;
  return 0;
end;
$_$;


ALTER FUNCTION internal.add_product_to_dataset_by_name(character varying, character varying) OWNER TO srv_dpmc;

--
-- Name: clean_dataset(integer); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION clean_dataset(integer) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
declare
  dataset_id_ alias for $1;
begin
  if not exists (select * from internal.dataset where id = dataset_id_) then
    raise exception 'specified dataset id % not found', dataset_id_;
  else
    delete from internal.dataset_x_product as dxp where dxp.dataset_id = dataset_id_;
  end if;
  return 0;
end;
$_$;


ALTER FUNCTION internal.clean_dataset(integer) OWNER TO srv_dpmc;

--
-- Name: clean_dataset_by_name(character varying); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION clean_dataset_by_name(character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
declare
  dataset_name_ alias for $1;
  dataset_id_ integer;
begin
  if not exists (select * from internal.dataset where dataset.name = dataset_name_) then
    raise exception 'specified dataset % not found', dataset_name_;
  else
    select dataset.id into dataset_id_ from internal.dataset where dataset.name = dataset_name_;
    delete from internal.dataset_x_product as dxp where dxp.dataset_id = dataset_id_;
  end if;
  return 0;
end;
$_$;


ALTER FUNCTION internal.clean_dataset_by_name(character varying) OWNER TO srv_dpmc;

--
-- Name: create_media_from_name(character varying); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION create_media_from_name(character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
declare

media_name_ alias for $1;
media_type_name_ varchar;
media_id_ integer;
index_ integer;

begin

	media_type_name_ := split_part(media_name_, '-', 2);

	if length(media_type_name_) = 0 then
		raise exception 'no media_type name matches';
	end if;

	media_id_ := nextval( 'internal.media_id' );

	insert into internal.media(id, media_type, name)
	select media_id_, media_type.id, media_name_
	from internal.media_type
	where media_type.name = media_type_name_;

	return media_id_;

end;$_$;


ALTER FUNCTION internal.create_media_from_name(character varying) OWNER TO srv_dpmc;

--
-- Name: delete_dataset(integer); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION delete_dataset(integer) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
declare
  dataset_id_ alias for $1;
begin
  if not exists (select * from internal.dataset where id = dataset_id_) then
    raise exception 'specified dataset id % not found', dataset_id_;
  else
    delete from internal.dataset_x_product as dxp where dxp.dataset_id = dataset_id_;
  end if;
  delete from internal.dataset where id = dataset_id_;
  return 0;
end;
$_$;


ALTER FUNCTION internal.delete_dataset(integer) OWNER TO srv_dpmc;

--
-- Name: delete_dataset_by_name(character varying); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION delete_dataset_by_name(character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
declare
  dataset_name_ alias for $1;
  dataset_id_ integer;
begin
  if not exists (select * from internal.dataset where dataset.name = dataset_name_) then
    raise exception 'specified dataset % not found', dataset_name_;
  else
    select dataset.id into dataset_id_ from internal.dataset where dataset.name = dataset_name_;
    delete from internal.dataset_x_product as dxp where dxp.dataset_id = dataset_id_;
    delete from internal.dataset where dataset.id = dataset_id_;
  end if;
  return 0;
end;
$_$;


ALTER FUNCTION internal.delete_dataset_by_name(character varying) OWNER TO srv_dpmc;

--
-- Name: delete_product_from_database(character varying); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION delete_product_from_database(character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $_$declare
  product_name_ alias for $1;
  v_product_id_ integer;
begin

  if not exists (select * from internal.product where product.name = product_name_) then
    raise exception 'specified product % not found', product_name_;
  else
    select product.id into v_product_id_ from internal.product where product.name = product_name_;
    delete from internal.footprint where product_id = v_product_id_;
    delete from public.prd_geoloc where product_id = v_product_id_;
    delete from internal.sensing_product where product = v_product_id_;
    delete from internal.error_type_x_product where product = v_product_id_;
    delete from processing.history_x_product where product = v_product_id_;
    delete from internal.processing_input where product = v_product_id_;
    delete from internal.product_x_media_catalog_entry where product = v_product_id_;
    delete from internal.sensing_product where product = v_product_id_;
    delete from internal.auxiliary_product where product = v_product_id_;
    delete from internal.dataset_x_product where product_id = v_product_id_;
    -- Update gb 18/06/2018
    -- create temporary table zzz as (select * from internal.product_x_media_catalog_entry where product = v_product_id_);
    -- delete from internal.product_x_media_catalog_entry where product = v_product_id_;
    -- delete from internal.media_catalog_entry where id in (select media_catalog_entry from zzz);
    -- drop table zzz;
    update internal.orbit set anx_date_time_source_product=0 where anx_date_time_source_product=v_product_id_;
    delete from internal.media_catalog_entry where id in (select media_catalog_entry from internal.product_x_media_catalog_entry where product = v_product_id_);
    delete from internal.product_x_media_catalog_entry where product = v_product_id_;
    delete from internal.product where id = v_product_id_;
  end if;

  return 0;

end;

$_$;


ALTER FUNCTION internal.delete_product_from_database(character varying) OWNER TO srv_dpmc;

--
-- Name: delete_product_from_dataset(integer, integer); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION delete_product_from_dataset(integer, integer) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
declare
  dataset_id_ alias for $1;
  product_id_ alias for $2;
  aux_ integer;
begin
  if not exists (select * from internal.dataset where id = dataset_id_) then
    raise exception 'specified dataset id % not found', dataset_id_;
  end if;
  if not exists (select * from internal.product where id = product_id_) then
    raise exception 'specified product id % not found', product_id_;
  end if;
  if not exists (select * from internal.dataset_x_product as dxp where dxp.dataset_id = dataset_id_ and dxp.product_id = product_id_) then
    raise exception 'product id % not found in dataset id %', product_id_, dataset_id_;
  else
    delete from internal.dataset_x_product as dxp where dxp.dataset_id = dataset_id_ and dxp.product_id = product_id_;
  end if;
  return 0;
end;
$_$;


ALTER FUNCTION internal.delete_product_from_dataset(integer, integer) OWNER TO srv_dpmc;

--
-- Name: delete_product_from_dataset_by_name(character varying, character varying); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION delete_product_from_dataset_by_name(character varying, character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
declare
  dataset_name_ alias for $1;
  product_name_ alias for $2;
  dataset_id_ integer;
  product_id_ integer;
begin
  if not exists (select * from internal.dataset where dataset.name = dataset_name_) then
    raise exception 'specified dataset % not found', dataset_name_;
  else
    select dataset.id into dataset_id_ from internal.dataset where dataset.name = dataset_name_;
  end if;
  if not exists (select * from internal.product where product.name = product_name_) then
    raise exception 'specified product % not found', product_name_;
  else
    select product.id into product_id_ from internal.product where product.name = product_name_;
  end if;
  
  if not exists (select * from internal.dataset_x_product as dxp where dxp.dataset_id = dataset_id_ and dxp.product_id = product_id_) then
    raise exception 'product % not found in dataset %', product_name_, dataset_name_;
  else
    delete from internal.dataset_x_product as dxp where dxp.dataset_id = dataset_id_ and dxp.product_id = product_id_;
  end if;
  return 0;
end;
$_$;


ALTER FUNCTION internal.delete_product_from_dataset_by_name(character varying, character varying) OWNER TO srv_dpmc;

--
-- Name: disk_location_create(character varying, character varying); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION disk_location_create(character varying, character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
declare
	product_name_ alias for $1;
	disk_location_ alias for $2;
	product_id_ integer;
	media_ varchar(2500);
	media_id_ integer;
	media_catalog_ varchar(255);
	media_catalog_id_ integer;
	media_catalog_entry_ varchar(255);
	media_catalog_entry_id_ integer;
	level_ integer;
	part_ varchar(255);
	next_part_ varchar(255);
	result_ integer;
begin
-- preconditions
	-- product with name product_name exists
	if not exists (	select	*
			from	internal.product
			where	name = product_name_) then
		raise exception 'precondition violation : product named % exists', product_name_;
	end if;
	-- valid disk_location format
	if not (	split_part(disk_location_, '/', 1) = ''
			and length(split_part(disk_location_, '/', 2)) > 0 -- media
			and length(split_part(disk_location_, '/', 3)) > 0 -- media_catalog
			and length(split_part(disk_location_, '/', 4)) > 0 -- media_catalog_entry
			and substring(disk_location_, length(disk_location_), 1) <> '/') then
		raise exception 'precondition violation : % is a valid disk_location format', disk_location_;
	end if;
-- main
	select 	into product_id_ id 
	from	internal.product
	where	name = product_name_;

	media_ := '/' || split_part(disk_location_, '/', 2);
	media_catalog_ := split_part(disk_location_, '/', 3);
	level_ := 4;
	part_ := split_part(disk_location_, '/', level_);
	next_part_ := split_part(disk_location_, '/', level_ + 1);
	while next_part_ <> '' loop
		media_catalog_ := media_catalog_ || '/' || part_;
		level_ := level_ + 1;
		part_ := next_part_;
		next_part_ := split_part(disk_location_, '/', level_ + 1);
	end loop;
	media_catalog_entry_ := part_;
	
		-- check
		if length(media_) <= 1 then
			raise exception 'check violation : media % is valid', media_;
		end if;
		if length(media_catalog_) = 0 then
			raise exception 'check violation : media_catalog % is valid', media_catalog_;
		end if;
		if length(media_catalog_entry_) = 0 then
			raise exception 'check violation : media_catalog_entry % is valid', media_catalog_entry_;
		end if;

	if not exists (	select	*
			from	internal.media join
				internal.media_type on (media_type.id = media.media_type)
			where	media.name = media_
				and media_type.name = 'HARD-DISK'
			) then
		insert into internal.media(media_type, name)
		select	media_type.id, media_
		from 	internal.media_type
		where	media_type.name = 'HARD-DISK';
	end if;
	media_id_ := null;
	select 	into media_id_ media.id
	from	internal.media join 
		internal.media_type on (media_type.id = media.media_type)
	where	media.name = media_
		and media_type.name = 'HARD-DISK';

		-- check
		if media_id_ is null then
			raise exception 'check violation : media id is valid';
		end if;

	if not exists (	select	*
			from	internal.media_catalog
			where	media = media_id_
				and name = media_catalog_) then
		insert into internal.media_catalog(media, name)
		values( media_id_, media_catalog_);
	end if;
	select 	into media_catalog_id_ id
	from	internal.media_catalog
		where media = media_id_
		and name = media_catalog_;

		-- check
		if media_catalog_id_ is null then
			raise exception 'check violation : media_catalog id is valid';
		end if;

	if not exists (	select	*
			from	internal.media_catalog_entry
			where	media_catalog = media_catalog_id_
				and name = media_catalog_entry_) then
		insert into internal.media_catalog_entry(media_catalog, name)
		values( media_catalog_id_, media_catalog_entry_);
	end if;
	select	into media_catalog_entry_id_ id
	from	internal.media_catalog_entry
		where media_catalog = media_catalog_id_
		and name = media_catalog_entry_;

		-- check
		if media_catalog_entry_id_ is null then
			raise exception 'check violation : media_catalog_entry id is valid';
		end if;

	if not exists (	select	*
			from	internal.product_x_media_catalog_entry
			where	product = product_id_
				and media_catalog_entry = media_catalog_entry_id_) then
		insert into internal.product_x_media_catalog_entry(product, media_catalog_entry)
		values( product_id_, media_catalog_entry_id_);
	end if;

	update processing.batch
	set state = 'Queued'
	where file_input_id = product_id_
		and state = 'Waiting for input';

-- postconditions
	-- disk_location exists in database
/*	if not exists (	select	*
			from	internal.product join 
				internal.product_x_media_catalog_entry on (product.id = product_x_media_catalog_entry.product) join 
				internal.media_catalog_entry on (product_x_media_catalog_entry.media_catalog_entry = media_catalog_entry.id) join
				internal.media_catalog on (media_catalog_entry.media_catalog = media_catalog.id) join 
				internal.media on (media_catalog.media = media.id) join 
				internal.media_type on (media.media_type = media_type.id)
			where	product.name = product_name_
				and media.name = media_
				and media_type.name = 'HARD-DISK'
				and media_catalog.name = media_catalog_
				and media_catalog_entry.name = media_catalog_entry_) then
		raise exception 'postcondition violation : disk_location exists in database';
	end if;
*/
	return result_;
end;$_$;


ALTER FUNCTION internal.disk_location_create(character varying, character varying) OWNER TO srv_dpmc;

--
-- Name: disk_location_delete(character varying); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION disk_location_delete(character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
declare
	disk_location_ alias for $1;
	media_ varchar(255);
	media_catalog_ varchar(255);
	media_catalog_entry_ varchar(255);
	media_id_ integer;
	media_catalog_id_ integer;
	media_catalog_entry_id_ integer;
	level_ integer;
	part_ varchar(255);
	next_part_ varchar(255);
	result_ integer;
begin

-- preconditions
	-- valid disk_location format
	if not (	split_part(disk_location_, '/', 1) = ''
			and length(split_part(disk_location_, '/', 2)) > 0 -- media
			and length(split_part(disk_location_, '/', 3)) > 0 -- media_catalog
			and length(split_part(disk_location_, '/', 4)) > 0 -- media_catalog_entry
			and substring(disk_location_, length(disk_location_), 1) <> '/') then
		raise exception 'precondition violation : % is a valid disk_location format', disk_location_;
	end if;
-- main

	media_ := '/' || split_part(disk_location_, '/', 2);
	media_catalog_ := split_part(disk_location_, '/', 3);
	level_ := 4;
	part_ := split_part(disk_location_, '/', level_);
	next_part_ := split_part(disk_location_, '/', level_ + 1);
	while next_part_ <> '' loop
		media_catalog_ := media_catalog_ || '/' || part_;
		level_ := level_ + 1;
		part_ := next_part_;
		next_part_ := split_part(disk_location_, '/', level_ + 1);
	end loop;
	media_catalog_entry_ := part_;
	
		-- check
		if length(media_) <= 1 then
			raise exception 'check violation : media % is valid', media_;
		end if;
		if length(media_catalog_) = 0 then
			raise exception 'check violation : media_catalog % is valid', media_catalog_;
		end if;
		if length(media_catalog_entry_) = 0 then
			raise exception 'check violation : media_catalog_entry % is valid', media_catalog_entry_;
		end if;

	media_id_ := null;
	media_catalog_id_ := null;
	media_catalog_entry_id_ := null;

	select 	into media_id_, media_catalog_id_, media_catalog_entry_id_ media.id, media_catalog.id, media_catalog_entry.id
	from	internal.media join 
		internal.media_type on (media_type.id = media.media_type) join 
		internal.media_catalog on (media_catalog.media = media.id) join 
		internal.media_catalog_entry on (media_catalog_entry.media_catalog = media_catalog.id)
	where	media.name = media_
		and media_type.name = 'HARD-DISK'
		and media_catalog.name = media_catalog_
		and media_catalog_entry.name = media_catalog_entry_;

	if media_catalog_entry_id_ is not null then 

		delete 
		from internal.product_x_media_catalog_entry
		where media_catalog_entry = media_catalog_entry_id_;
		
		delete
		from internal.media_catalog_entry
		where id = media_catalog_entry_id_;

	end if;

-- postconditions
	-- disk_location exists in database
	if exists (	select	*
			from	internal.media_catalog_entry join
				internal.media_catalog on (media_catalog_entry.media_catalog = media_catalog.id) join 
				internal.media on (media_catalog.media = media.id) join 
				internal.media_type on (media.media_type = media_type.id)
			where	media.name = media_
				and media_type.name = 'HARD-DISK'
				and media_catalog.name = media_catalog_
				and media_catalog_entry.name = media_catalog_entry_) then
		raise exception 'postcondition violation : disk_location does not exist in database';
	end if;
	return result_;

end;$_$;


ALTER FUNCTION internal.disk_location_delete(character varying) OWNER TO srv_dpmc;

--
-- Name: exists_product(integer); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION exists_product(integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $_$begin
  return exists ( select * 
from import.mph, internal.product, internal.processing , internal.center where mph.product_id = $1
and product.name = mph.product_name
and product.generation_date_time = mph.processing_time
and processing.id = product.processing
and processing.center = center.id
and center.code = mph.processing_center);
end;$_$;


ALTER FUNCTION internal.exists_product(integer) OWNER TO srv_dpmc;

--
-- Name: interval_to_seconds(interval); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION interval_to_seconds(interval) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
declare
  result integer;
begin
  result := extract(day from $1) * 86400 +extract( hour from $1) *3600 + extract (minute from $1) * 60+round(extract (second from $1));
  return result;
end;
$_$;


ALTER FUNCTION internal.interval_to_seconds(interval) OWNER TO srv_dpmc;

--
-- Name: media_catalog_create(integer, character varying); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION media_catalog_create(integer, character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
declare
	media_ alias for $1;
	media_catalog_name_ alias for $2;
	media_catalog_id_ integer;
	result_ integer;
begin
-- preconditions
	-- media exists
	if not exists (	select	*
			from	internal.media
				join internal.media_type on media_type.id = media.media_type
			where	media.id = media_
				and not media_type.sequential) then
		raise exception 'precondition violation : media % exists and is not sequential', media_;
	end if;
	-- valid catalog name
	if length(media_catalog_name_) = 0 then
		raise exception 'precondition violation : length(media_catalog_name %) > 0', media_catalog_name_;
	end if;
-- main

	if not exists (	select	*
			from	internal.media_catalog
			where	media = media_
				and name = media_catalog_name_) then
		insert into internal.media_catalog(media, name)
		values( media_, media_catalog_name_);
	end if;
	select 	into media_catalog_id_ id
	from	internal.media_catalog
		where media = media_
		and name = media_catalog_name_;

		-- check
		if media_catalog_id_ is null then
			raise exception 'check violation : media_catalog id is valid';
		end if;

	return media_catalog_id_;
end;$_$;


ALTER FUNCTION internal.media_catalog_create(integer, character varying) OWNER TO srv_dpmc;

--
-- Name: merge_datasets(integer, integer, integer); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION merge_datasets(integer, integer, integer) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
declare
  dataset_in1_id_ alias for $1;
  dataset_in2_id_ alias for $2;
  dataset_out_id_ alias for $3;
begin
  if not exists (select * from internal.dataset where id = dataset_in1_id_) then
    raise exception 'specified dataset id % not found', dataset_in1_id_;
  end if;
  if not exists (select * from internal.dataset where id = dataset_in2_id_) then
    raise exception 'specified dataset id % not found', dataset_in2_id_;
  end if;
  if not exists (select * from internal.dataset where id = dataset_out_id_) then
    raise exception 'specified dataset id % not found', dataset_out_id_;
  end if;
  insert into internal.dataset_x_product (dataset_id, product_id)
    select dataset_out_id_, product_id from internal.dataset_x_product
    where dataset_x_product.dataset_id = dataset_in1_id_ 
    except 
    select dataset_out_id_, product_id from internal.dataset_x_product
    where dataset_x_product.dataset_id = dataset_out_id_;
  insert into internal.dataset_x_product (dataset_id, product_id)
    select dataset_out_id_, product_id from internal.dataset_x_product
    where dataset_x_product.dataset_id = dataset_in2_id_ 
    except 
    select dataset_out_id_, product_id from internal.dataset_x_product
    where dataset_x_product.dataset_id = dataset_out_id_;
  return 0;
end;
$_$;


ALTER FUNCTION internal.merge_datasets(integer, integer, integer) OWNER TO srv_dpmc;

--
-- Name: new_image_processing_from_request(integer, integer, integer, timestamp without time zone, timestamp without time zone); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION new_image_processing_from_request(integer, integer, integer, timestamp without time zone, timestamp without time zone) RETURNS integer
    LANGUAGE plpgsql
    AS $_$

declare
	request_ alias for $1;
	product_ alias for $2;
	target_product_type_ alias for $3;
	start_date_time_ alias for $4;
	stop_date_time_ alias for $5;
	x_rec record;
	target_processing_level_ varchar;
	source_product_type_ integer;
	source_product_type_chain_id_ integer;
	source_processing_level_ varchar;
	processing_ integer;
	previous_processing_ integer;
	half_duration_ interval;
	modified_start_date_time_ timestamp;
	modified_stop_date_time_ timestamp;
	sensing_start_date_time_ timestamp;
	sensing_stop_date_time_ timestamp;
	time_radius_ interval;
	job_type_ integer;
	root_processing_ integer;
	media_catalog_ integer;
	directory_ varchar;
begin
	select into source_product_type_ product_type from internal.product where id = product_;
	
	if not exists (
		select *
		from 	internal.product,
				internal.mode_x_product_type,
				internal.imaging_instrument
		where	product.id = product_
				and mode_x_product_type.product_type = product.product_type
				and imaging_instrument.satellite = mode_x_product_type.satellite
				and imaging_instrument.instrument = mode_x_product_type.instrument)
	then
		raise exception 'input product does not come from an imaging instrument';
	end if;
	if not exists (
		select 	*
		from	internal.product_type_chain,
				internal.product
		where	product.id = product_
				and source = product.product_type
				and target = target_product_type_)
	then
		raise exception 'bad combination of source and target product_types %, %', source_product_type_, target_product_type_;
	end if;
	select into
		source_product_type_chain_id_, 
		source_product_type_,
		sensing_start_date_time_,
		sensing_stop_date_time_,
		source_processing_level_,
		target_processing_level_
		product_type_chain.id,
		product_type_chain.source,
		start_date_time,
		stop_date_time,
		product_type.processing_level,
		ptt.processing_level
	from	internal.product_type_chain,
			internal.product,
			internal.sensing_product,
			internal.product_type,
			internal.product_type as ptt
	where	product.id = product_
			and source = product.product_type
			and target = target_product_type_
			and sensing_product.product = product.id
			and product_type.id = product.product_type
			and ptt.id = target_product_type_;
	select into
		time_radius_
		import.ascii_seconds_to_interval( to_char(imaging_instrument.min_product_frame_count * scan_configuration.line_time_interval, '99.999'))/2
	from
		internal.mode_x_product_type,
		internal.imaging_instrument,
		internal.scan_configuration
	where
		internal.mode_x_product_type.product_type = source_product_type_
		and internal.imaging_instrument.satellite = mode_x_product_type.satellite
		and internal.imaging_instrument.instrument = mode_x_product_type.instrument
		and internal.scan_configuration.satellite = mode_x_product_type.satellite
		and internal.scan_configuration.instrument = mode_x_product_type.instrument
		and internal.scan_configuration.mode = mode_x_product_type.mode
		and internal.scan_configuration.id = 1;
	half_duration_ := ( stop_date_time_ - start_date_time_) / 2;
	if half_duration_ < time_radius_ then
		modified_start_date_time_ := start_date_time_ + half_duration_ - time_radius_;
		modified_stop_date_time_ := start_date_time_ + half_duration_ + time_radius_ ;
	else
		modified_start_date_time_ := start_date_time_;
		modified_stop_date_time_ := stop_date_time_;
	end if;
	if ( modified_start_date_time_ < sensing_start_date_time_) then
		modified_start_date_time_ := sensing_start_date_time_;
	end if;
	if ( sensing_stop_date_time_ < modified_stop_date_time_) then
		modified_stop_date_time_ := sensing_stop_date_time_;
	end if;
	processing_ := null;
	previous_processing_ := null;
	for x_rec in
		select	source as target_product_type
		from 	internal.product_type_chain
		where	target = target_product_type_
				and id > source_product_type_chain_id_
		order by id
	loop
raise notice '%', x_rec.target_product_type;
		if previous_processing_ is null then
			processing_ := internal.new_processing( product_, x_rec.target_product_type, 'N', true );
			root_processing_ := processing_;
			if ( source_processing_level_ = '0') then
			insert into internal.image_processing_input( processing, product, start_date_time, stop_date_time)
				values( processing_, product_, modified_start_date_time_, modified_stop_date_time_);
 			end if; 
		else
			processing_ := internal.new_processing( previous_processing_, x_rec.target_product_type, 'N', false );
		end if;
		insert into internal.request_x_processing( request, processing)
		values( request_, processing_);
		previous_processing_ := processing_;
	end loop;
raise notice '%', target_product_type_;
	if previous_processing_ is null then
		processing_ := internal.new_processing( product_, target_product_type_, 'N', true );
		root_processing_ := processing_;
		insert into internal.image_processing_input( processing, product, start_date_time, stop_date_time)
		values( processing_, product_, modified_start_date_time_, modified_stop_date_time_);
	else
		processing_ := internal.new_processing( previous_processing_, target_product_type_, 'N', false );
	end if;
	insert into internal.request_x_processing( request, processing)
	values( request_, processing_);

	select 	into media_catalog_ coalesce( request.media_catalog, requester.media_catalog, global.output_media_catalog)
	from	internal.request,
			internal.requester,
			internal.global
	where	request.id = request_
			and requester.id = request.requester;

	select 	into directory_ media.name || '/' || media_catalog.name
	from	internal.media_catalog,
			internal.media
	where	media_catalog.id = media_catalog_
			and media.id = media_catalog.media;

	perform public.new_meris_job( 
		root_processing_, 
		case
			when source_processing_level_ = '0' and target_processing_level_ = '1b' then 1
			when source_processing_level_ = '1b' and target_processing_level_ = '2' then 2
			when source_processing_level_ = '0' and target_processing_level_ = '2' then 3
			when source_processing_level_ = '0' and target_processing_level_ = '3' then 7
		end, 
		directory_);
	
	raise notice 'created processing %', processing_;
	
	return processing_;
end;$_$;


ALTER FUNCTION internal.new_image_processing_from_request(integer, integer, integer, timestamp without time zone, timestamp without time zone) OWNER TO srv_dpmc;

--
-- Name: new_image_processings_from_product(integer); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION new_image_processings_from_product(integer) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
declare
	product_ alias for $1;
	rec record;
	rec_global record;
begin

	if not exists (	select	*
				from	internal.imaging_instrument,
						internal.mode_x_product_type,
						internal.product
				where	product.id = product_
						and mode_x_product_type.product_type = product.product_type
						and imaging_instrument.satellite = mode_x_product_type.satellite
						and imaging_instrument.instrument = mode_x_product_type.instrument)
	then
		raise exception 'product does not come from an imaging instrument';
	end if;

	for rec in 
	
	select
		request.id as request, 
		product.id as product, 
		request.product_type as product_type, 
		case when orbit.anx_date_time + site_coverage.start_anx_interval > sensing_product.start_date_time 
		then orbit.anx_date_time + site_coverage.start_anx_interval
		else sensing_product.start_date_time end as coverage_start_date_time, 
		case when  orbit.anx_date_time + site_coverage.stop_anx_interval < sensing_product.stop_date_time 
		then orbit.anx_date_time + site_coverage.stop_anx_interval
		else sensing_product.stop_date_time end as coverage_stop_date_time
	from
		internal.request, 
		internal.living_request,
		internal.site_coverage,
		internal.orbit, 
		internal.sensing_product,
		internal.product,
		internal.mode_x_product_type,
		internal.product_type_chain
	where
		site_coverage.site = request.site
		and living_request.request = request.id
		and orbit.satellite = site_coverage.satellite
		and orbit.cycle_relative_number = site_coverage.relative_orbit_number 
		and sensing_product.start_absolute_orbit_number = orbit.absolute_number 
		and sensing_product.start_date_time < orbit.anx_date_time + site_coverage.stop_anx_interval
		and orbit.anx_date_time + site_coverage.start_anx_interval < sensing_product.stop_date_time
		and product.id = sensing_product.product
		and mode_x_product_type.product_type = product.product_type
		and mode_x_product_type.satellite = site_coverage.satellite
		and mode_x_product_type.instrument = site_coverage.instrument 
		and request.min_date_time < sensing_product.stop_date_time
		and sensing_product.start_date_time < request.max_date_time
		and product_type_chain.target = request.product_type
		and product_type_chain.source = product.product_type
		and product.id = product_
	loop
		raise notice 'inserted !!!!';
		perform internal.new_image_processing_from_request(
		rec.request, 
		rec.product, 
		rec.product_type, 
		rec.coverage_start_date_time, 
		rec.coverage_stop_date_time);
	
	end loop;
	
	for rec_global in 
	
	select
		request.id as request, 
		product.id as product, 
		request.product_type as product_type, 
		sensing_product.start_date_time as coverage_start_date_time, 
		sensing_product.stop_date_time as coverage_stop_date_time
	from
		internal.global, 
		internal.request, 
		internal.living_request,
		internal.sensing_product,
		internal.product,
		internal.product_type_chain
	where
		request.site = global.global_site
		and living_request.request = request.id
		and product.id = sensing_product.product
		and request.min_date_time < sensing_product.stop_date_time
		and sensing_product.start_date_time < request.max_date_time
		and product_type_chain.target = request.product_type
		and product_type_chain.source = product.product_type
		and product.id = product_
	loop
		raise notice 'global inserted !!!!';
		perform internal.new_image_processing_from_request(
		rec_global.request, 
		rec_global.product, 
		rec_global.product_type, 
		rec_global.coverage_start_date_time, 
		rec_global.coverage_stop_date_time);
	
	end loop;
		
	return 1;
end;
$_$;


ALTER FUNCTION internal.new_image_processings_from_product(integer) OWNER TO srv_dpmc;

--
-- Name: new_image_processings_from_request(integer); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION new_image_processings_from_request(integer) RETURNS integer
    LANGUAGE plpgsql
    AS $_$

declare
	request_ alias for $1;
	cand_rec record;
	global_rec record;
begin

	if not exists (	select	*
				from	internal.imaging_instrument,
						internal.mode_x_product_type,
						internal.request
				where	mode_x_product_type.product_type = request.product_type
						and imaging_instrument.satellite = mode_x_product_type.satellite
						and imaging_instrument.instrument = mode_x_product_type.instrument)
	then
		raise exception 'target product type does not come from an imaging instrument';
	end if;

	for cand_rec in 
	select
		request.id as request, 
		product.id as product, 
		request.product_type as product_type, 
		case when orbit.anx_date_time + site_coverage.start_anx_interval > sensing_product.start_date_time 
		then orbit.anx_date_time + site_coverage.start_anx_interval
		else sensing_product.start_date_time end as coverage_start_date_time, 	
		case when  orbit.anx_date_time + site_coverage.stop_anx_interval < sensing_product.stop_date_time 
		then orbit.anx_date_time + site_coverage.stop_anx_interval
		else sensing_product.stop_date_time end as coverage_stop_date_time
	from
		internal.request, 
		internal.site_coverage, 
		internal.orbit, 
		internal.sensing_product,
		internal.product,
		internal.mode_x_product_type,
		internal.product_type_chain
	where
		site_coverage.site = request.site
		and orbit.satellite = site_coverage.satellite
		and orbit.cycle_relative_number = site_coverage.relative_orbit_number 
		and sensing_product.start_absolute_orbit_number = orbit.absolute_number 
		and sensing_product.start_date_time < orbit.anx_date_time + site_coverage.stop_anx_interval
		and orbit.anx_date_time + site_coverage.start_anx_interval < sensing_product.stop_date_time	
		and product.id = sensing_product.product
		and mode_x_product_type.product_type = product.product_type
		and mode_x_product_type.satellite = site_coverage.satellite
		and mode_x_product_type.instrument = site_coverage.instrument 
		and request.min_date_time < sensing_product.stop_date_time
		and sensing_product.start_date_time < request.max_date_time
		and product_type_chain.target = request.product_type
		and product_type_chain.source = product.product_type
		and request.id = request_
	loop
		perform internal.new_image_processing_from_request(
		cand_rec.request, 
		cand_rec.product, 
		cand_rec.product_type, 
		cand_rec.coverage_start_date_time, 
		cand_rec.coverage_stop_date_time);
	end loop;
	
	for global_rec in 
	select
		request.id as request, 
		product.id as product, 
		request.product_type as product_type, 
		sensing_product.start_date_time as coverage_start_date_time, 	
		sensing_product.stop_date_time as coverage_stop_date_time
	from
        internal.global,
		internal.request, 
		internal.sensing_product,
		internal.product,
		internal.product_type_chain
	where
		request.site = global.global_site
		and product.id = sensing_product.product
		and request.min_date_time < sensing_product.stop_date_time
		and sensing_product.start_date_time < request.max_date_time
		and product_type_chain.target = request.product_type
		and product_type_chain.source = product.product_type
		and request.id = request_
	loop
		perform internal.new_image_processing_from_request(
		global_rec.request, 
		global_rec.product, 
		global_rec.product_type, 
		global_rec.coverage_start_date_time, 
		global_rec.coverage_stop_date_time);
	end loop;
	
	return 1;
end;$_$;


ALTER FUNCTION internal.new_image_processings_from_request(integer) OWNER TO srv_dpmc;

--
-- Name: new_processing(integer, integer, character, boolean); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION new_processing(integer, integer, character, boolean) RETURNS integer
    LANGUAGE plpgsql
    AS $_$

declare
	product_ alias for $1;
	previous_processing_ alias for $1;
	target_product_type_ alias for $2;
	stage_ alias for $3;
	root_processing_ alias for $4;
	source_product_type_ integer;
	processing_ integer;
begin
	if root_processing_ then
		select into source_product_type_ product_type
		from internal.product
		where id = product_;
	else
		select into source_product_type_ product_type
		from internal.processing
		where id = previous_processing_;
	end if;
	if not exists (
		select 	*
		from	internal.product_type_chain
		where	source = source_product_type_
				and target = target_product_type_)
	then
		raise exception 'bad combination of source and target product_types %, %', target_product_type_, source_product_type_;
	end if;
	if not exists (
		select 	*
		from	internal.current_software,
				internal.software_x_product_type,
				internal.global
		where 	current_software.center = global.center
				and current_software.software = software_x_product_type.software
				and software_x_product_type.product_type = target_product_type_)
	then
		raise exception 'no software giving this product type in the current center';
	end if;

--	select into processing_ coalesce(max(id),0)+1 from internal.processing;
	processing_ := nextval('internal.processing_seq');
	insert into internal.processing(
		id,
		product_type,
		center,
		software,
		stage,
		state)
	select
		processing_,
		target_product_type_,
		global.center,
		current_software.software,
		stage_,
		1
	from
		internal.global,
		internal.current_software,
		internal.software_x_product_type
	where
		current_software.center = global.center
		and software_x_product_type.software = current_software.software
		and software_x_product_type.product_type = target_product_type_;
	if root_processing_ then
		insert into internal.processing_input( processing, product)
		values( processing_, product_);
	else
		insert into internal.processing_chain( before, after)
		values( previous_processing_, processing_);
	end if;
	return processing_;
end;$_$;


ALTER FUNCTION internal.new_processing(integer, integer, character, boolean) OWNER TO srv_dpmc;

--
-- Name: new_processings_from_product(integer); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION new_processings_from_product(integer) RETURNS integer
    LANGUAGE plpgsql
    AS $_$declare
	product_ alias for $1;
	cand_rec record;
	cand_rec_2 record;
begin

	for cand_rec in 
	select
		image_request_x_product.request,
		image_request_x_product.start_date_time,
		image_request_x_product.stop_date_time	
	from
		internal.living_request
		join image_request_x_product on living_request.request = image_request_x_product.request
	where
		product = product_
	loop

		perform new_image_batch(
		cand_rec.request, 
		product_, 
		cand_rec.start_date_time, 
		cand_rec.stop_date_time);

	end loop;

	for cand_rec_2 in 
	select
		occultation_request_x_product.request,
		occultation_request_x_product.position	
	from
		internal.living_request
		join occultation_request_x_product on living_request.request = occultation_request_x_product.request
	where
		product = product_
	loop
		perform new_occultation_batch(
		cand_rec_2.request, 
		product_, 
		cand_rec_2.position);
	end loop;
	



	return 1;
end;$_$;


ALTER FUNCTION internal.new_processings_from_product(integer) OWNER TO srv_dpmc;

--
-- Name: new_processings_from_product_old(integer); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION new_processings_from_product_old(integer) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
declare
	product_ alias for $1;
begin
	if exists (
		select *
		from 	internal.product,
				internal.mode_x_product_type,
				internal.occulting_instrument
		where	product.id = product_
				and mode_x_product_type.product_type = product.product_type
				and occulting_instrument.satellite = mode_x_product_type.satellite
				and occulting_instrument.instrument = mode_x_product_type.instrument)
	then
		perform internal.new_occultation_processings_from_product( product_);
	else
		if exists (	select	*
				from	internal.imaging_instrument,
						internal.mode_x_product_type,
						internal.product
				where	product.id = product_
						and mode_x_product_type.product_type = product.product_type
						and imaging_instrument.satellite = mode_x_product_type.satellite
						and imaging_instrument.instrument = mode_x_product_type.instrument)
		then
			perform internal.new_image_processings_from_product( product_);
		else
			raise notice 'product does not come from a imaging or occulting instrument';
		end if;
	end if;
	return 1;
end;$_$;


ALTER FUNCTION internal.new_processings_from_product_old(integer) OWNER TO srv_dpmc;

--
-- Name: new_processings_from_request(integer); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION new_processings_from_request(integer) RETURNS integer
    LANGUAGE plpgsql
    AS $_$

declare
	request_ alias for $1;
	cand_rec record;
	cand_rec_2 record;
begin

	for cand_rec in 
	select
		start_date_time,
		stop_date_time,
		product		
	from
		image_request_x_product
	where
		request = request_
	loop
		perform new_image_batch(
		request_, 
		cand_rec.product, 
		cand_rec.start_date_time, 
		cand_rec.stop_date_time);
	end loop;

	for cand_rec_2 in 
	select
		position,
		product		
	from
		occultation_request_x_product
	where
		request = request_
	loop
		perform new_occultation_batch(
		request_, 
		cand_rec_2.product, 
		cand_rec_2.position);
	end loop;
	
	return 1;
end;$_$;


ALTER FUNCTION internal.new_processings_from_request(integer) OWNER TO srv_dpmc;

--
-- Name: new_processings_from_request_and_product(integer, integer); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION new_processings_from_request_and_product(integer, integer) RETURNS integer
    LANGUAGE plpgsql
    AS $_$declare
	request_ alias for $1;
	product_ alias for $2;
	cand_rec record;
begin

	for cand_rec in 
	select
		start_date_time,
		stop_date_time
	from
		image_request_x_product
	where
		request = request_
		and product = product_
	loop
		perform new_image_batch(
		request_, 
		product_, 
		cand_rec.start_date_time, 
		cand_rec.stop_date_time);
	end loop;

	return 1;

end;$_$;


ALTER FUNCTION internal.new_processings_from_request_and_product(integer, integer) OWNER TO srv_dpmc;

--
-- Name: new_product(integer); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION new_product(integer) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
declare
	mph_rec record;
	product_id_ integer;
	processing_id_ integer;
	envisat_id_ integer;
	sv_source_id_ integer;
	only_name_ boolean;
	sensing_product_id_ integer;
	length_ integer;
begin

	select into mph_rec * from import.mph where product_id = $1;
	product_id_ := null;
	processing_id_ := null;
	sensing_product_id_ := null;
	select 	into product_id_, processing_id_, sensing_product_id_, only_name_ 
			product.id, processing.id, sensing_product.product, (product.generation_date_time is null)
	from	internal.product, 
			internal.processing,
			internal.sensing_product
	where	product.name = mph_rec.product_name
			and processing.id = product.processing
			and sensing_product.product = product.id;
	if product_id_ is not null then
		if only_name_ then
			insert into import.log values( $1, 'already partially imported product : ' || mph_rec.product_name, false);
			raise notice 'already partially imported product %', mph_rec.product_name;
		else
			insert into import.log values( $1, 'already imported product : ' || mph_rec.product_name, true);
			raise exception 'already imported product %, delete it first', mph_rec.product_name;
			-- perform internal.delete_sensing_product(product_id_);
			-- raise notice 'already imported product %, deleted before', mph_rec.product_name;
		end if;
	end if;
	select into envisat_id_ id from internal.satellite where acronym like 'ENVISAT%' order by satellite.id desc limit 1;
	-- processing creation
	if not exists ( 	select * 
						from internal.software
						where name = substring( mph_rec.software, 1, strpos( mph_rec.software, '/')-1)
					  	and version = substring( mph_rec.software, strpos( mph_rec.software, '/')+1)) then
--                                insert into internal.software( id, name, version)
--                                values ( (select coalesce( max(id),0) + 1 from internal.software) , 
--                                substring( mph_rec.software, 1, strpos( mph_rec.software, '/')-1),
--                                substring( mph_rec.software, strpos( mph_rec.software, '/')+1));

                                insert into internal.software( name, version)
                                values ( substring( mph_rec.software, 1, strpos( mph_rec.software, '/')-1),
                                substring( mph_rec.software, strpos( mph_rec.software, '/')+1));

		insert into import.log values (mph_rec.product_id, 'created software : ' || mph_rec.software, false);
		return 0;
	end if;
	if not exists ( 	select *
						from internal.center
						where name = mph_rec.processing_center) then
		insert into import.log values ( mph_rec.product_id, 'unknown center : ' || mph_rec.processing_center, true);
		raise exception 'unknown center y%y', mph_rec.processing_center;
		return 0;
	end if;
	if processing_id_ is null then
--		select into processing_id_ coalesce(max(id), 0)+1 from internal.processing;
		processing_id_ := nextval('internal.processing_seq');
		insert into internal.processing(
		  	id, 
	  		center, 
		  	software, 
	  		stage,
	  		product_type)
		select
		  	processing_id_,
	  		center.id,
	  		software.id,
	  		mph_rec.processing_stage_flag,
	  		product_type.id
		from
	  		internal.center,
	  		internal.software,
	  		internal.product_type
		where
		  	center.code = mph_rec.processing_center
		  	and software.name = substring( mph_rec.software, 1, strpos( mph_rec.software, '/')-1)
		  	and software.version = substring( mph_rec.software, strpos( mph_rec.software, '/')+1)
		  	and product_type.acronym = internal.product_type_acronym_from_name(mph_rec.product_name);
	else
		update 	internal.processing
		set 	software = software.id
		from 	internal.software
		where 	processing.id = processing_id_
			  	and software.name = substring( mph_rec.software, 1, strpos( mph_rec.software, '/')-1)
			  	and software.version = substring( mph_rec.software, strpos( mph_rec.software, '/')+1);
	end if;
	-- processing input creation

	if exists (	select *
			from import.dsd
			where product_id = mph_rec.product_id
			and ds_type = 'R'
			and trim(both from filename) = '') then
		raise exception 'Found some reference DSD with empty filename. exiting.';
	end if;

	declare
		input_file_name record;
	begin
		for input_file_name in  
			select filename 
			from import.dsd
			where product_id = mph_rec.product_id
			and ds_type = 'R'
			and trim( both from filename) not in ('NOT USED', 'MISSING') loop

--			if not exists ( select * from internal.product where name = input_file_name.filename) then
			if coalesce(
				(select product.id
				from internal.product
				where product.name = input_file_name.filename),
				(select x.product
				from internal.product_x_media_catalog_entry as x join
				internal.media_catalog_entry as mce on (mce.id = x.media_catalog_entry)
				where  mce.name = input_file_name.filename)) is null then 

				perform internal.new_product_from_name( input_file_name.filename);

			end if;
			insert into internal.processing_input( processing, product)
--			values ( processing_id_, ( select id from internal.product where name = input_file_name.filename));
			values ( processing_id_, coalesce(
				(select product.id
				from internal.product
				where product.name = input_file_name.filename),
				(select x.product
				from internal.product_x_media_catalog_entry as x join
				internal.media_catalog_entry as mce on (mce.id = x.media_catalog_entry)
				where  mce.name = input_file_name.filename)));

		end loop;
	end;

	-- product creation
	if not exists ( 	select *
						from internal.product_type
						where acronym = internal.product_type_acronym_from_name(mph_rec.product_name)) then
		insert into import.log values ( mph_rec.product_id, 'unknown product type : ' || internal.product_type_acronym_from_name(mph_rec.product_name));
		raise exception 'unknown product type %', mph_rec.product_name;
		return 0;
	end if;
	if not exists ( 	select *
						from internal.document
						where name = mph_rec.reference_document) then
--		insert into internal.document( id, name) values ( (select coalesce(max(id),0)+1 from internal.document), mph_rec.reference_document);
		insert into internal.document( name) values ( mph_rec.reference_document);
		insert into import.log values ( mph_rec.product_id, 'inserted document : ' || mph_rec.reference_document, false);
	end if;
	if product_id_ is null then
--	 	select into product_id_ coalesce(max(id), 0)+1 from internal.product;
		product_id_ := nextval('internal.product_seq');
	 	insert into internal.product(
		  	id, 
		  	processing, 
		  	product_type, 
		  	document, 
		  	name, 
		  	generation_date_time, 
		  	size, 
		  	dataset_descriptor_count)
		select  
			product_id_,
			processing_id_,
			product_type.id,
			document.id,
			mph_rec.product_name,
			mph_rec.processing_time,
			mph_rec.total_size,
			mph_rec.num_data_sets
		from
		  	internal.product_type,
		  	internal.document
		where
		  	product_type.acronym = internal.product_type_acronym_from_name(mph_rec.product_name)
		  	and document.name = mph_rec.reference_document;
	else
		update 	internal.product
		set		document = document.id,
				generation_date_time = mph_rec.processing_time,
				size = mph_rec.total_size,
				dataset_descriptor_count = mph_rec.num_data_sets
		from	internal.document
		where	product.id = product_id_
				and document.name = mph_rec.reference_document;
	end if;
	-- acquisition chain creation
	declare
	    start_id integer;
	    stop_id integer;
	    center_code varchar(100);
	    rank integer;
  	begin
  		rank := 1;
	    start_id := 1;
	    if (length( mph_rec.acquisition_station) > 0) then 
	    loop
	      stop_id := strpos( substring( mph_rec.acquisition_station, start_id), ',') - 1;
	      if ( stop_id = -1) then
	        stop_id := length( mph_rec.acquisition_station);
	      end if;
	      center_code := substring( mph_rec.acquisition_station, start_id, stop_id - start_id + 1);
	      if not exists (
	        select *
	        from internal.center
	        where code = center_code) then
			insert into import.log values ( mph_rec.product_id, 'unknown center : ' || center_code, true);
			raise exception 'unknown center x%x', center_code;
			return 0;
	      end if;
	      insert into internal.acquisition_chain(product, center, center_rank)
	      select product_id_, center.id, rank
	      from internal.center
	      where center.code = center_code;
	      exit when ( stop_id = length( mph_rec.acquisition_station));
	      start_id := stop_id + 2;
	      rank := rank + 1;
	    end loop;
	    end if;
	end;
	-- orbit creation	
	if not exists ( select *
					from internal.orbit
					where orbit.satellite = envisat_id_
					and orbit.absolute_number = mph_rec.absolute_orbit) then
		insert into internal.orbit( satellite, absolute_number, mission_phase, phase_cycle, cycle_relative_number)
		values ( envisat_id_, mph_rec.absolute_orbit, mph_rec.phase, mph_rec.cycle, mph_rec.relative_orbit);
		insert into import.log values ( mph_rec.product_id, 'inserted envisat orbit : ' || to_char( mph_rec.absolute_orbit, '99999'), false); 
	end if;

	-- state vector creation, if level in ('0', '1b') and any orbit file referenced in DSDR

	if exists (select *
		from	internal.product join
			internal.product_type on (product.product_type = product_type.id) join
			internal.processing_input on (product.processing = processing_input.processing) join 
			internal.product as prd_src on (prd_src.id = processing_input.product) join 
			internal.state_vector_source on (state_vector_source.product_type = prd_src.product_type)			
		where	product.id = product_id_
			and product_type.processing_level in ('0', '1b')) then

		select into sv_source_id_ prd_src.id
		from internal.product, internal.processing_input, internal.product as prd_src, internal.state_vector_source
		where product.id = product_id_
		and product.processing = processing_input.processing
		and prd_src.id = processing_input.product
		and prd_src.product_type = state_vector_source.product_type
		limit 1;

		if not exists ( 	select *
							from internal.state_vector
							where satellite = envisat_id_
							and absolute_orbit_number = mph_rec.absolute_orbit
							and date_time = mph_rec.state_vector_time
							and source = sv_source_id_) then
/*
			insert into internal.state_vector( id, satellite, absolute_orbit_number, date_time, delta_ut1, 
				x_position, y_position, z_position, x_velocity, y_velocity, z_velocity, source)
			values ( (select coalesce(max(id),0)+1 from  internal.state_vector), envisat_id_, mph_rec.absolute_orbit, mph_rec.state_vector_time,
				mph_rec.delta_ut1, mph_rec.x_position, mph_rec.y_position, mph_rec.z_position, mph_rec.x_velocity, mph_rec.y_velocity,
				mph_rec.z_velocity, sv_source_id_);
*/


			insert into internal.state_vector( satellite, absolute_orbit_number, date_time, delta_ut1, 
				x_position, y_position, z_position, x_velocity, y_velocity, z_velocity, source)
			values ( envisat_id_, mph_rec.absolute_orbit, mph_rec.state_vector_time,
				mph_rec.delta_ut1, mph_rec.x_position, mph_rec.y_position, mph_rec.z_position, mph_rec.x_velocity, mph_rec.y_velocity,
				mph_rec.z_velocity, sv_source_id_);

		end if;

	end if;

	-- sensing product creation
	if sensing_product_id_ is null then
		insert into  internal.sensing_product( 
			product, 
			start_date_time, 
			stop_date_time, 
			start_absolute_orbit_number,
			state_vector, 
			product_type_counter,
			error)
		values ( 
			product_id_, 
			mph_rec.sensing_start_time, 
			mph_rec.sensing_stop_time, 
			mph_rec.absolute_orbit,
			(	select id 
				from  internal.state_vector 
				where satellite = envisat_id_ 
				and absolute_orbit_number = mph_rec.absolute_orbit 
				and date_time = mph_rec.state_vector_time
				and source = sv_source_id_),
			internal.sensing_product_type_file_counter_from_name( mph_rec.product_name),
			mph_rec.product_error);
	else
		update 	internal.sensing_product
		set		start_date_time = mph_rec.sensing_start_time,
				stop_date_time = mph_rec.sensing_stop_time,
				start_absolute_orbit_number = mph_rec.absolute_orbit,
				state_vector = 	(	select id 
									from  internal.state_vector 
									where satellite = envisat_id_ 
									and absolute_orbit_number = mph_rec.absolute_orbit 
									and date_time = mph_rec.state_vector_time
									and source = sv_source_id_),
				error = mph_rec.product_error
		where	product = sensing_product_id_;
	end if;
	-- leap_second_x_product creation

	if mph_rec.leap_error then
		if not exists (	select *
						from  internal.leap_second
						where date_time = mph_rec.leap_utc
						and is_positive = ( mph_rec.leap_sign = 1)) then
--			insert into  internal.leap_second( id, date_time, is_positive)
--			values ( (select coalesce(max(id),0)+1 from  internal.leap_second), mph_rec.leap_utc, (mph_rec.leap_sign = 1));
--			insert into import.log values ( mph_rec.product_id, 'inserted leap second : ' || mph_rec.leap_utc, false);

			insert into  internal.leap_second( date_time, is_positive)
			values ( mph_rec.leap_utc, (mph_rec.leap_sign = 1));
			insert into import.log values ( mph_rec.product_id, 'inserted leap second : ' || mph_rec.leap_utc, false);


		end if;
		insert into  internal.leap_second_x_product( leap_second, product)
		select id, product_id_
		from  internal.leap_second
		where date_time = mph_rec.leap_utc
		and is_positive = ( mph_rec.leap_sign = 1);
	end if;
	-- specific product creation
	declare
		prd_type varchar(20);
	begin
		prd_type := internal.product_type_acronym_from_name( mph_rec.product_name);
		if exists ( 	select * 
						from  internal.product_type,  internal.mode_x_product_type
						where mode_x_product_type.satellite = envisat_id_
						and mode_x_product_type.product_type = product_type.id
						and product_type.processing_level = '0'
						and product_type.acronym = prd_type) then
			perform  internal.new_level0_product( product_id_);
		elsif exists ( select * 
						from  internal.product_type,  internal.mode_x_product_type, internal.instrument
						where mode_x_product_type.instrument = instrument.id
						and instrument.acronym = 'MERIS'
						and mode_x_product_type.product_type = product_type.id
						and product_type.processing_level in ( '1b', '2', 'B')
						and product_type.acronym = prd_type) then
			perform internal.new_meris_level12_product( product_id_);
		elsif exists ( select * 
						from  internal.product_type,  internal.mode_x_product_type,  internal.instrument
						where mode_x_product_type.instrument = instrument.id
						and instrument.acronym = 'GOMOS'
						and mode_x_product_type.product_type = product_type.id
						and product_type.processing_level in ( '1b', '2')
						and product_type.acronym = prd_type
						and product_type.acronym <> 'GOM_RR__2P') then
			perform internal.new_gomos_level12_product( product_id_);
		elsif (prd_type = 'GOM_RR__2P') then
			raise notice 'GOM_RR__2P product inserted with auxiliary SPH';
		else
			raise exception 'product type % not handled', prd_type;
        end if;
--	raise notice 'update obsolescence';
--	perform internal.update_obsolescence(product_id_);
	raise notice 'any batches to create ?';
        perform internal.new_processings_from_product( product_id_);
	end;
	-- return successfull
	return 1;
end;
$_$;


ALTER FUNCTION internal.new_product(integer) OWNER TO srv_dpmc;

--
-- Name: new_product_from_name(character varying); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION new_product_from_name(character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $_$DECLARE

result integer;
untrimed_name_ alias for $1;
name_ varchar;
product_id_ INTEGER;
processing_id_ integer;

product_type_acronym_ varchar;
product_type_id_ integer;
center_code_ varchar;
processing_stage_ char(1);
is_auxiliary boolean;

generation_date_time_ timestamp;
validity_start_date_time_ timestamp;
validity_stop_date_time_ timestamp;

start_date_time_ timestamp;
stop_date_time_ timestamp;
phase_ char(1);
cycle_ integer;
relative_orbit_number_ integer;
start_absolute_orbit_number_ integer;
product_type_counter_ integer;
duration_ interval;
orbit_id_ integer;
envisat_id_ integer;

BEGIN

result := 0;

name_ := trim( both from untrimed_name_);

if not (length(name_) = 61 or length(name_) = 62) then
  raise exception 'name length must be 61 or 62 characters';
end if;

if not exists ( select *
                from internal.product
                where name = name_) then

	product_type_acronym_ := internal.product_type_acronym_from_name( name_);
	center_code_ := internal.product_processing_center_from_name( name_);
	processing_stage_ := internal.product_processing_stage_flag_from_name( name_);

	if exists ( select * from internal.product_type where acronym = product_type_acronym_) then 

		select into product_type_id_, is_auxiliary
		id, (processing_level is null)
		from internal.product_type 
		where acronym = product_type_acronym_;

		if is_auxiliary then 

			generation_date_time_ := internal.auxiliary_product_processing_date_time_from_name( name_);
			validity_start_date_time_ := internal.auxiliary_product_start_validity_date_time_from_name( name_);
			validity_stop_date_time_ := internal.auxiliary_product_stop_validity_date_time_from_name( name_);

			if product_type_id_ between 37 and 39 and generation_date_time_ < validity_stop_date_time_ then 
				raise exception 'precondition exception in product % : product_type in (AUX_FRO_AX, DOR_POR_AX, DOR_VOR_AX) implies generation_date_time >= validity_stop_date_time', name_;
			end if;

		else

			phase_ := internal.sensing_product_mission_phase_from_name( name_);
			cycle_ := internal.sensing_product_phase_cycle_from_name( name_);
			relative_orbit_number_ := internal.sensing_product_relative_orbit_number_from_name( name_);
			start_absolute_orbit_number_ := internal.sensing_product_absolute_orbit_number_from_name( name_);
			product_type_counter_ := internal.sensing_product_type_file_counter_from_name( name_);
			start_date_time_ := internal.sensing_product_start_date_time_from_name( name_);
			duration_ := internal.sensing_product_duration_from_name( name_);
			stop_date_time_ := start_date_time_ + duration_;

		end if;
	
		if not exists ( select * from internal.center where code_in_product_name = center_code_) then
			raise exception 'unknown center %', center_code_;
		end if;

--		select into processing_id_ coalesce(max(id),0)+1 from internal.processing;
		processing_id_ := nextval('internal.processing_seq');

		insert into internal.processing( id, center, stage, product_type)
		select processing_id_, center.id, processing_stage_, product_type_id_
		from internal.center
		where code_in_product_name = center_code_;

--		select into product_id_ coalesce(max(id),0)+1 from internal.product;
		product_id_ := nextval('internal.product_seq');

		insert into internal.product( id, processing, product_type, name)
		values ( product_id_, processing_id_, product_type_id_, name_);


		if is_auxiliary then

			update internal.product 
			set generation_date_time = generation_date_time_ 
			where id = product_id_;

			insert into internal.auxiliary_product( product, validity_start_date_time, validity_stop_date_time)
			values( product_id_, validity_start_date_time_, validity_stop_date_time_);

		else

			select into envisat_id_ id from internal.satellite where acronym like 'ENVISAT%' order by satellite.id desc limit 1;
			if not exists ( select *
					from internal.orbit
					where orbit.satellite = envisat_id_
					and orbit.absolute_number = start_absolute_orbit_number_) then
				insert into internal.orbit( satellite, absolute_number, mission_phase, phase_cycle, cycle_relative_number)
				values ( envisat_id_, start_absolute_orbit_number_, phase_, cycle_, relative_orbit_number_);
			end if;
			insert into internal.sensing_product(
				product, 
				start_date_time,
				stop_date_time,
				start_absolute_orbit_number,
				product_type_counter)
			values( product_id_, 
				start_date_time_,
				stop_date_time_,
				start_absolute_orbit_number_,
				product_type_counter_);

		end if;
		
		result := 1;

	end if;

end if;

return result;


END;
$_$;


ALTER FUNCTION internal.new_product_from_name(character varying) OWNER TO srv_dpmc;

--
-- Name: new_product_from_name_old(character varying); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION new_product_from_name_old(character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $_$DECLARE

result integer;
name_ alias for $1;
product_id_ INTEGER;
processing_id_ integer;

product_type_acronym_ varchar;
product_type_id_ integer;
center_code_ varchar;
processing_stage_ char(1);
is_auxiliary boolean;

generation_date_time_ timestamp;
validity_start_date_time_ timestamp;
validity_stop_date_time_ timestamp;

start_date_time_ timestamp;
stop_date_time_ timestamp;
phase_ char(1);
cycle_ integer;
relative_orbit_number_ integer;
start_absolute_orbit_number_ integer;
product_type_counter_ integer;
duration_ interval;
orbit_id_ integer;
envisat_id_ integer;

BEGIN

result := 0;

if not (length(name_) = 61 or length(name_) = 62) then
  raise exception 'name length must be 61 or 62 characters';
end if;

if not exists ( select *
                from internal.product
                where name = trim( both from name_)) then

	product_type_acronym_ := internal.product_type_acronym_from_name( name_);
	center_code_ := internal.product_processing_center_from_name( name_);
	processing_stage_ := internal.product_processing_stage_flag_from_name( name_);

	if exists ( select * from internal.product_type where acronym = product_type_acronym_) then 

		select into product_type_id_, is_auxiliary
		id, (processing_level is null)
		from internal.product_type 
		where acronym = product_type_acronym_;

		if is_auxiliary then 

			generation_date_time_ := internal.auxiliary_product_processing_date_time_from_name( name_);
			validity_start_date_time_ := internal.auxiliary_product_start_validity_date_time_from_name( name_);
			validity_stop_date_time_ := internal.auxiliary_product_stop_validity_date_time_from_name( name_);

		else

			phase_ := internal.sensing_product_mission_phase_from_name( name_);
			cycle_ := internal.sensing_product_phase_cycle_from_name( name_);
			relative_orbit_number_ := internal.sensing_product_relative_orbit_number_from_name( name_);
			start_absolute_orbit_number_ := internal.sensing_product_absolute_orbit_number_from_name( name_);
			product_type_counter_ := internal.sensing_product_type_file_counter_from_name( name_);
			start_date_time_ := internal.sensing_product_start_date_time_from_name( name_);
			duration_ := internal.sensing_product_duration_from_name( name_);
			stop_date_time_ := start_date_time_ + duration_;

		end if;
	
		if not exists ( select * from internal.center where code_in_product_name = center_code_) then
			raise exception 'unknown center %', center_code_;
		end if;

--		select into processing_id_ coalesce(max(id),0)+1 from internal.processing;
		processing_id_ := nextval('internal.processing_seq');

		insert into internal.processing( id, center, stage, product_type)
		select processing_id_, center.id, processing_stage_, product_type_id_
		from internal.center
		where code_in_product_name = center_code_;

--		select into product_id_ coalesce(max(id),0)+1 from internal.product;
		product_id_ := nextval('internal.product_seq');

		insert into internal.product( id, processing, product_type, name)
		values ( product_id_, processing_id_, product_type_id_, trim( both from name_));

		if is_auxiliary then

			update internal.product 
			set generation_date_time = generation_date_time_ 
			where id = product_id_;

			insert into internal.auxiliary_product( product, validity_start_date_time, validity_stop_date_time)
			values( product_id_, validity_start_date_time_, validity_stop_date_time_);

		else

			select into envisat_id_ id from internal.satellite where acronym like 'ENVISAT%' order by satellite.id desc limit 1;
			if not exists ( select *
					from internal.orbit
					where orbit.satellite = envisat_id_
					and orbit.absolute_number = start_absolute_orbit_number_) then
				insert into internal.orbit( satellite, absolute_number, mission_phase, phase_cycle, cycle_relative_number)
				values ( envisat_id_, start_absolute_orbit_number_, phase_, cycle_, relative_orbit_number_);
			end if;
			insert into internal.sensing_product(
				product, 
				start_date_time,
				stop_date_time,
				start_absolute_orbit_number,
				product_type_counter)
			values( product_id_, 
				start_date_time_,
				stop_date_time_,
				start_absolute_orbit_number_,
				product_type_counter_);

		end if;
		
		result := 1;

	end if;

end if;

return result;


END;
$_$;


ALTER FUNCTION internal.new_product_from_name_old(character varying) OWNER TO srv_dpmc;

--
-- Name: next_media_name(character varying); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION next_media_name(character varying) RETURNS character varying
    LANGUAGE plpgsql
    AS $_$
declare

media_type_name_ alias for $1;
media_name_ varchar;
media_name_pattern_ varchar;
index_ integer;
begin

	select into media_name_
		'CMG-' || media_type.name || '-' || center.code_in_product_name || '-'
	from
		internal.global,
		internal.center,
		internal.media_type
	where
		media_type.name = $1
		and global.center = center.id;

	media_name_pattern_ := media_name_ || '0%';

	select into index_
		coalesce( max(to_number( substring(name, length(media_name_) + 1, length(name) - length(media_name_)), '00000')) + 1, 1)
	from
		internal.media
	where
		name like media_name_pattern_;

	return media_name_ || substring( to_char( index_, '00000'), 2, 5) ;


end;$_$;


ALTER FUNCTION internal.next_media_name(character varying) OWNER TO srv_dpmc;

--
-- Name: next_media_suffixed_name(character varying, character varying); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION next_media_suffixed_name(character varying, character varying) RETURNS character varying
    LANGUAGE plpgsql
    AS $_$
declare

media_type_name_ alias for $1;
suffix_ alias for $2;
media_name_ varchar;
media_name_pattern_ varchar;
index_ integer;
begin

	select into media_name_
		'CMG-' || media_type.name || '-' || center.code_in_product_name || '-'
	from
		internal.global,
		internal.center,
		internal.media_type
	where
		media_type.name = $1
		and global.center = center.id;

	if (coalesce (trim( both from suffix_), '') <> '') then
		media_name_ := media_name_ || upper (suffix_) || '-';
	end if;

	media_name_pattern_ := media_name_ || '%';

	select into index_
		coalesce( max(to_number( substring(name, length(media_name_) + 1, length(name) - length(media_name_)), '00000')) + 1, 1)
	from
		internal.media
	where
		name like media_name_pattern_;

	return media_name_ || substring( to_char( index_, '00000'), 2, 5) ;


end;$_$;


ALTER FUNCTION internal.next_media_suffixed_name(character varying, character varying) OWNER TO srv_dpmc;

--
-- Name: product_processing_center_from_name(character varying); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION product_processing_center_from_name(character varying) RETURNS character varying
    LANGUAGE plpgsql
    AS $_$begin
  return substring( $1, 12, 3);
end;$_$;


ALTER FUNCTION internal.product_processing_center_from_name(character varying) OWNER TO srv_dpmc;

--
-- Name: product_processing_stage_flag_from_name(character varying); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION product_processing_stage_flag_from_name(character varying) RETURNS character
    LANGUAGE plpgsql
    AS $_$begin
  return substring( $1, 11, 1);
end;$_$;


ALTER FUNCTION internal.product_processing_stage_flag_from_name(character varying) OWNER TO srv_dpmc;

--
-- Name: product_type_acronym_from_name(character varying); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION product_type_acronym_from_name(character varying) RETURNS character varying
    LANGUAGE plpgsql
    AS $_$begin
  if substring( $1, 10, 1) = 'C' then 
	return substring( $1, 1, 9) || 'P';
  else
	return substring( $1, 1, 10);
  end if;
end;$_$;


ALTER FUNCTION internal.product_type_acronym_from_name(character varying) OWNER TO srv_dpmc;

--
-- Name: remove_scheduler_lock_file(); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION remove_scheduler_lock_file() RETURNS integer
    LANGUAGE plpgsql
    AS $$
declare

	temp_duration interval;
	max_duration interval;
	result integer;

begin

	result := 0;

	select into temp_duration, max_duration 
	now () - last_schedule_date_time, scheduler_time_out
	from internal.global;

	if temp_duration > max_duration then
		result := 1;
	end if;

return result;

end;$$;


ALTER FUNCTION internal.remove_scheduler_lock_file() OWNER TO srv_dpmc;

SET search_path = processing, pg_catalog;

--
-- Name: add_host2pool(character varying, character varying); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION add_host2pool(character varying, character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $_$
declare 
  v_pool_comment alias for $1;
  v_host_name alias for $2;
  v_count_pool integer;
  v_count_host integer;
  v_pool_x_hosts integer;
begin
  
  select count(*) into v_count_pool from processing.pool where comment = v_pool_comment;
  
  if v_count_pool = 0 then
     raise notice 'no such pool';
     return false;
  else

  end if;

  select count(*) into v_count_host from processing.hosts where hostname = v_host_name;
  
  if v_count_host =0 then
     raise notice 'bad host name';
     return false;
  end if;

  select count(pool_x_hosts.*) into v_pool_x_hosts from  processing.pool_x_hosts, processing.hosts, processing.pool 
  where pool.id = pool_x_hosts.pool  and pool_x_hosts.hosts = hosts.host_id and  hosts.hostname = v_host_name 
  and pool.comment = v_pool_comment;

  if v_pool_x_hosts > 0 then
     raise notice 'already in pool';
     return false;
  end if;

  insert into processing.pool_x_hosts (pool,hosts) select pool.id, hosts.host_id from processing.pool, processing.hosts where pool.comment = v_pool_comment and
  hosts.hostname = v_host_name;
  return true;

end;
$_$;


ALTER FUNCTION processing.add_host2pool(character varying, character varying) OWNER TO srv_dpmc;

--
-- Name: add_host2pool(integer, integer); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION add_host2pool(integer, integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $_$
declare 
  v_pool_id alias for $1;
  v_host_id alias for $2;
  v_count_pool integer;
  v_count_host integer;
begin
  
  select count(*) into v_count_pool from processing.pool where id = v_pool_id;
  
  if v_count_pool = 0 then
     raise notice 'bad pool id';
     return false;
  end if;

  select count(*) into v_count_host from processing.hosts where host_id = v_host_id;
  
  if v_count_host =0 then
     raise notice 'bad host id';
     return false;
  end if;

  select count(*) into v_pool_x_hosts from processing.pool_x_hosts where hosts = v_host_id and pool = v_pool_id 
  
  if v_pool_x_hosts > 0 then
     raise notice 'already in pool';
     return false;
  end if;

  insert into processing.pool_x_hosts (pool,hosts) values (v_pool_id, v_host_id);

  return true;

end;
$_$;


ALTER FUNCTION processing.add_host2pool(integer, integer) OWNER TO srv_dpmc;

--
-- Name: add_output_file(character varying, character varying, integer); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION add_output_file(character varying, character varying, integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $_$
declare 
  v_directory alias for $1;
  v_file alias for $2;
  v_batch_id alias for $3;
  v_date_time timestamp;
begin

  v_date_time := now();
  insert into processing.output_file(
	directory_name, 
	file_name, 
	date_time,
	batch_id)
  values(
	v_directory,
	v_file,
	v_date_time,
	v_batch_id);

  return true;

end;
$_$;


ALTER FUNCTION processing.add_output_file(character varying, character varying, integer) OWNER TO srv_dpmc;

--
-- Name: add_pool(character varying); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION add_pool(character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
declare
  v_comment alias for $1;
  v_count integer;
  v_id integer;
begin
  select count(*) into v_count from processing.pool where comment = v_comment;

  IF v_count = 0 THEN
     insert into processing.pool (comment) values (v_comment);
    select id into v_id from processing.pool where comment=v_comment;
    return v_id;
ELSE
     raise notice 'pool already defined';
     return -1;
END IF;

end;

$_$;


ALTER FUNCTION processing.add_pool(character varying) OWNER TO srv_dpmc;

--
-- Name: check_launch_time_outs(); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION check_launch_time_outs() RETURNS integer
    LANGUAGE plpgsql
    AS $$
declare 

	v_batch integer;
	v_hosts integer;
	rec record;
	result_ integer;
begin

	result_ := 0;

	for rec in

		select	top.batch_id, top.hostname_id
		from	internal.global
			cross join processing.batch
			join processing.top using (batch_id)
		where	batch.state = 'Launched'
			and now() - top.started > global.launch_time_out

	loop

		update processing.batch set state = 'Queued' where batch_id = rec.batch_id;

		delete from processing.top where batch_id = rec.batch_id;

--		update processing.hosts set available = false where host_id = rec.hostname_id;

		result_ := result_ + 1;

	end loop;

	return result_;
end;$$;


ALTER FUNCTION processing.check_launch_time_outs() OWNER TO srv_dpmc;

--
-- Name: check_run_time_outs(); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION check_run_time_outs() RETURNS integer
    LANGUAGE plpgsql
    AS $$
declare 

	v_batch integer;
	v_hosts integer;
	rec record;
	result_ integer;
begin

	result_ := 0;

	for rec in

		select	top.batch_id, top.hostname_id
		from	internal.global
			cross join processing.batch
			join processing.top using (batch_id)
		where	batch.state = 'Running'
                        and now() - now() > global.run_time_out
--                      strange request to avoid killing process longer than run_time_out
--			and now() - top.started > global.run_time_out

	loop

		update processing.batch set state = 'Queued' where batch_id = rec.batch_id;

		delete from processing.top where batch_id = rec.batch_id;

		update processing.hosts set available = false where host_id = rec.hostname_id;

		result_ := result_ + 1;

	end loop;

	return result_;
end;
$$;


ALTER FUNCTION processing.check_run_time_outs() OWNER TO srv_dpmc;

--
-- Name: delete_job(integer); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION delete_job(integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $_$
declare
  v_batch_id alias for $1;
begin
  delete from processing.parameters_set where parameters_set.id = v_batch_id;
  delete from processing.batch_x_product where batch = v_batch_id;
  delete from processing.batch where batch_id = v_batch_id;
return true;
end;
$_$;


ALTER FUNCTION processing.delete_job(integer) OWNER TO srv_dpmc;

--
-- Name: delete_top_item(integer, character varying); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION delete_top_item(integer, character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $_$
declare
  v_batch_id alias for $1;
  v_state alias for $2;
  v_history_id integer;
  v_request_id integer;
  v_software_id integer;
  v_aux_conf_id integer;
  v_proc_comment_id integer;
  
begin
	if not exists (	select	*
			from 	processing.top
			where	batch_id = v_batch_id) then
		raise exception 'precondition exception : batch % exists in top table', v_batch_id;
	end if;

	v_history_id := nextval('processing.history_history_id');

	select into v_request_id request_id from processing.batch where batch_id = v_batch_id;

        select software, auxiliary_configuration, processing_comment 
        into v_software_id, v_aux_conf_id, v_proc_comment_id
        from internal.request where id = v_request_id;
        	
	insert into processing.history(
		history_id, file_input_id, request_id, processing_set_id, started, ended, host_id, batch_id, state, output_dir, software_id, auxiliary_configuration_id, processing_comment_id)
	select
		v_history_id, batch.file_input_id, batch.request_id, batch.processing_set_id, top.started, now(), top.hostname_id, v_batch_id, v_state, batch.output_dir, v_software_id, v_aux_conf_id, v_proc_comment_id
	from	
		processing.batch
		join processing.top on top.batch_id = batch.batch_id
	where 	
		batch.batch_id = v_batch_id;

	insert into processing.history_x_product( history, product)
	select 	v_history_id, product
	from 	processing.batch_x_product
	where	batch = v_batch_id;

	delete from processing.top where batch_id = v_batch_id;

	perform processing.delete_job( v_batch_id);

	return true;
end;
$_$;


ALTER FUNCTION processing.delete_top_item(integer, character varying) OWNER TO srv_dpmc;

--
-- Name: delete_top_item_errors_inside(integer, character varying); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION delete_top_item_errors_inside(integer, character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $_$
declare
  v_batch_id alias for $1;
  v_state alias for $2;
  v_history_id integer;
  v_request_id integer;
  v_software_id integer;
  v_aux_conf_id integer;
  v_proc_comment_id integer;
  v_tag character varying;
  v_processing_configuration character varying;
  v_log_file character varying;
  
begin
	if not exists (	select	*
			from 	processing.top
			where	batch_id = v_batch_id) then
		raise exception 'precondition exception : batch % exists in top table', v_batch_id;
	end if;

	v_history_id := nextval('processing.history_history_id');

	select into v_request_id request_id from processing.batch where batch_id = v_batch_id;

        select software, auxiliary_configuration, processing_comment 
        into v_software_id, v_aux_conf_id, v_proc_comment_id
        from internal.request where id = v_request_id;

        select coalesce((select value from processing.parameters_set where keyword='tag' and id=v_batch_id),'') into v_tag;
        select coalesce((select value from processing.parameters_set where keyword='processing_configuration_id' and id=v_batch_id),'0') into v_processing_configuration;
        
	insert into processing.history(
		history_id, file_input_id, request_id, processing_set_id, started, ended, host_id, batch_id, state, output_dir, software_id, auxiliary_configuration_id, processing_comment_id, tag, processing_configuration)
	select
		v_history_id, batch.file_input_id, batch.request_id, batch.processing_set_id, top.started, now(), top.hostname_id, v_batch_id, v_state, batch.output_dir, v_software_id, v_aux_conf_id, v_proc_comment_id, 
		v_tag, v_processing_configuration::integer
	from	
		processing.batch
		join processing.top on top.batch_id = batch.batch_id
	where 	
		batch.batch_id = v_batch_id;

	insert into processing.history_x_product( history, product)
	select 	v_history_id, product
	from 	processing.batch_x_product
	where	batch = v_batch_id;

	delete from processing.top where batch_id = v_batch_id;

	perform processing.delete_job( v_batch_id);

	return true;
end;
$_$;


ALTER FUNCTION processing.delete_top_item_errors_inside(integer, character varying) OWNER TO srv_dpmc;

--
-- Name: get_next_input_media_from_current_physical_capacity(); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION get_next_input_media_from_current_physical_capacity() RETURNS integer
    LANGUAGE plpgsql
    AS $$
declare
  result_ integer;
begin
	result_ := null;

	select into result_
		media.id
	from media_current_physical_capacity
		join processing.default_input_media_pool on default_input_media_pool.media = media_current_physical_capacity.id
		join internal.media on media.id = default_input_media_pool.media
	where	media_current_physical_capacity.current_physical_capacity > 0
		and media.available
	order by media_current_physical_capacity.current_physical_capacity
	limit 1;
	
	return result_;
end;$$;


ALTER FUNCTION processing.get_next_input_media_from_current_physical_capacity() OWNER TO srv_dpmc;

--
-- Name: get_next_media(); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION get_next_media() RETURNS integer
    LANGUAGE plpgsql
    AS $$
declare
  result_ integer;
begin
	result_ := null;

	select into result_
		id
	from media_current_capacity
		join processing.default_output_media_pool on default_output_media_pool.media = media_current_capacity.id
	where	current_capacity > 0
	order by current_capacity
	limit 1;
	
	return result_;
end;
$$;


ALTER FUNCTION processing.get_next_media() OWNER TO srv_dpmc;

--
-- Name: get_next_output_media_from_current_physical_capacity(); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION get_next_output_media_from_current_physical_capacity() RETURNS integer
    LANGUAGE plpgsql
    AS $$
declare
  result_ integer;
begin
	result_ := null;

	select into result_
		media.id
	from media_current_physical_capacity_with_count
		join processing.default_output_media_pool on default_output_media_pool.media = media_current_physical_capacity_with_count.id
		join internal.media on media.id = default_output_media_pool.media
	where	media_current_physical_capacity_with_count.current_physical_capacity > 0
		and media.available
	order by access_count, media_current_physical_capacity_with_count.current_physical_capacity
	limit 1;
	
	return result_;
end;
$$;


ALTER FUNCTION processing.get_next_output_media_from_current_physical_capacity() OWNER TO srv_dpmc;

--
-- Name: history_double_levels(integer, integer); Type: FUNCTION; Schema: processing; Owner: postgres
--

CREATE FUNCTION history_double_levels(v_c1 integer, v_c2 integer) RETURNS TABLE(history_id integer, state character varying, l0_id integer, l0_name character varying, l1_id integer, l1_name character varying, tag1 character varying, l2_id integer, l2_name character varying, tag2 character varying)
    LANGUAGE sql
    AS $_$
select h1.history_id, h1.state, p0.id as L0_id, p0.name as L0_name, hxp1.product as L1_id, p1.name as L1_name, h1.tag as tag1, p2.id as L2_id, p2.name as L2_name, h2.tag as tag2
  from internal.product as p0 
      join processing.history as h1 on p0.id=h1.file_input_id and h1.software_id=$1
      left outer join processing.history_x_product as hxp1 on h1.history_id=hxp1.history
      left outer join internal.product as p1 on hxp1.product=p1.id and p1.name like '%%'
      left outer join processing.history as h2 on h2.file_input_id=p1.id and h2.software_id=$2
      left outer join processing.history_x_product as hxp2 on h2.history_id=hxp2.history 
      left outer join internal.product as p2 on hxp2.product=p2.id and p2.name like '%%'
  order by h1.history_id desc
$_$;


ALTER FUNCTION processing.history_double_levels(v_c1 integer, v_c2 integer) OWNER TO postgres;

--
-- Name: history_single_level(integer); Type: FUNCTION; Schema: processing; Owner: postgres
--

CREATE FUNCTION history_single_level(v_c1 integer) RETURNS TABLE(history_id integer, state character varying, l0_id integer, l0_name character varying, l1_id integer, l1_name character varying, tag1 character varying)
    LANGUAGE sql
    AS $_$
select h1.history_id as history_id, h1.state as state, p0.id as L0_id, p0.name as L0_name, hxp1.product as L1_id, p1.name as L1_name, h1.tag as tag1
  from internal.product as p0 
      join processing.history as h1 on p0.id=h1.file_input_id and h1.software_id=$1
      left outer join processing.history_x_product as hxp1 on h1.history_id=hxp1.history
      left outer join internal.product as p1 on hxp1.product=p1.id and p1.name like '%'
  order by h1.history_id desc;
$_$;


ALTER FUNCTION processing.history_single_level(v_c1 integer) OWNER TO postgres;

--
-- Name: purge_history(); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION purge_history() RETURNS boolean
    LANGUAGE plpgsql
    AS $$
begin
  delete from processing.gomos_history;
  delete from processing.history_x_product;
  delete from processing.history;
  return true;
end;
$$;


ALTER FUNCTION processing.purge_history() OWNER TO srv_dpmc;

--
-- Name: remove_host2pool(character varying, character varying); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION remove_host2pool(character varying, character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $_$
declare 
  v_pool_comment alias for $1;
  v_host_name alias for $2;
  v_count_pool integer;
  v_count_host integer;
  v_host_id integer;
  v_pool_id integer;
  v_pool_x_hosts integer;
begin
  
  select count(*) into v_count_pool from processing.pool where comment = v_pool_comment;
  
  if v_count_pool = 0 then
     raise notice 'no such pool';
     return false;
  else

  end if;

  select count(*) into v_count_host from processing.hosts where hostname = v_host_name;
  
  if v_count_host =0 then
     raise notice 'bad host name';
     return false;
  end if;

  select count(pool_x_hosts.*) into v_pool_x_hosts from processing.pool_x_hosts, processing.hosts, processing.pool 
  where pool.id = pool_x_hosts.pool  and pool_x_hosts.hosts = hosts.host_id and  hosts.hostname = v_host_name 
  and pool.comment = v_pool_comment;

  if v_pool_x_hosts = 0 then
     raise notice 'not in pool';
     return false;
  end if;

  select id into v_pool_id from processing.pool where comment  = v_pool_comment;
  select host_id into v_host_id from processing.hosts where hostname = v_host_name;
  delete from processing.pool_x_hosts  where pool_x_hosts.pool = v_pool_id and pool_x_hosts.hosts = v_host_id;


  return true;

end;
$_$;


ALTER FUNCTION processing.remove_host2pool(character varying, character varying) OWNER TO srv_dpmc;

--
-- Name: restart_job(integer); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION restart_job(integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $_$
declare
  v_batch_id alias for $1;
begin
  delete from processing.top where batch_id = v_batch_id;
  update processing.batch set state = 'Queued' where batch_id = v_batch_id;
return true;
end;
$_$;


ALTER FUNCTION processing.restart_job(integer) OWNER TO srv_dpmc;

--
-- Name: schedule_batch(); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION schedule_batch() RETURNS integer
    LANGUAGE plpgsql
    AS $$
declare 

	next_batch integer;
	next_hosts integer;
	result_ integer;
begin

	result_ := 0;

	select into
		next_batch, next_hosts
		runnable_batch.batch_id, runnable_batch.host_id
	from	
		public.runnable_batch
	order by
--		bogomips desc,
--		current_ncpu desc,
		batch_id
	limit 1;

	if next_batch is not null then

		result_ := 1;

		raise notice 'selected batch : %', next_batch;

		insert into processing.top( batch_id, hostname_id, started, pid)
		select batch_id, next_hosts, now(), null
		from processing.batch
		where batch_id = next_batch;

		update processing.batch
		set state = 'Dispatched'
		where batch_id = next_batch;

	end if;

/*
	select into result_ count(*)
	from processing.batch
	where state = 'Dispatched';
*/
	return result_;
end;$$;


ALTER FUNCTION processing.schedule_batch() OWNER TO srv_dpmc;

--
-- Name: schedule_batches(); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION schedule_batches() RETURNS integer
    LANGUAGE plpgsql
    AS $$
declare 

	next_batch integer;
	next_hosts integer;
	result_ integer;
begin

	result_ := 0;

	select into
		next_batch, next_hosts
		runnable_batch.batch_id, runnable_batch.host_id
	from	
		public.runnable_batch
--	order by
--		bogomips desc,
--		current_ncpu desc,
--		batch_id
	limit 1;

	while next_batch is not null loop

		raise notice 'selected batch : %', next_batch;

		insert into processing.top( batch_id, hostname_id, started, pid)
		select batch_id, next_hosts, now(), null
		from processing.batch
		where batch_id = next_batch;

		update processing.batch
		set state = 'Dispatched'
		where batch_id = next_batch;

		result_ := result_ + 1;

		select into
			next_batch, next_hosts
			runnable_batch.batch_id, runnable_batch.host_id
		from	
			public.runnable_batch
--		order by
--			bogomips desc,
--			current_ncpu desc,
--			batch_id
		limit 1;

	end loop;
	
	raise notice 'start counting';

	select into result_ count(*)
	from processing.batch
	where state = 'Dispatched';

	raise notice 'stop counting';

	return result_;
end;$$;


ALTER FUNCTION processing.schedule_batches() OWNER TO srv_dpmc;

--
-- Name: schedule_batches_all(); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION schedule_batches_all() RETURNS integer
    LANGUAGE plpgsql
    AS $$
declare 

	next_batch integer;
	next_hosts integer;
	result_ integer;
begin

	result_ := 0;

	select into
		next_batch, next_hosts
		runnable_batch.batch_id, runnable_batch.host_id
	from	
		public.runnable_batch
	order by
--		bogomips desc,
--		current_ncpu desc,
		batch_id
	limit 1;

	while next_batch is not null loop

		raise notice 'selected batch : %', next_batch;

		insert into processing.top( batch_id, hostname_id, started, pid)
		select batch_id, next_hosts, now(), null
		from processing.batch
		where batch_id = next_batch;

		update processing.batch
		set state = 'Dispatched'
		where batch_id = next_batch;

		result_ := result_ + 1;

		select into
			next_batch, next_hosts
			runnable_batch.batch_id, runnable_batch.host_id
		from	
			public.runnable_batch
		order by
--			bogomips desc,
--			current_ncpu desc,
			batch_id
		limit 1;

	end loop;

	select into result_ count(*)
	from processing.batch
	where state = 'Dispatched';

	return result_;
end;$$;


ALTER FUNCTION processing.schedule_batches_all() OWNER TO srv_dpmc;

--
-- Name: schedule_batches_new(); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION schedule_batches_new() RETURNS integer
    LANGUAGE plpgsql
    AS $$
declare 

	result_ integer;
	i 	integer;
	rec	record;
	rec2	record;
	zzz_	integer;

begin

	update internal.global
	set last_schedule_date_time = now ();

	--raise notice ' batch en Queued:';	
	--		SELECT into zzz_
	--			batch.batch_id
	--		FROM 
	--			processing.pool_x_hosts,
	--			internal.request, 
	--			processing.batch,
	--			internal.product
	--		WHERE
	--			batch.state = 'Queued'::character varying
	--			AND request.pool = pool_x_hosts.pool
	--			AND batch.request_id = request.id
	--			AND pool_x_hosts.hosts = 2
	--			AND product.id = batch.file_input_id
	--		ORDER BY substring (product.name, 11, 1), batch_id;
			
	-- raise notice ' end batch en Queued: zzz=%',zzz_;	
			
	result_ := 0;

	for rec in
		select hosts.host_id, current_ncpu, bogomips
		from hosts_current_ncpu,
		processing.hosts
		where 
		hosts.host_id = hosts_current_ncpu.host_id
		and current_ncpu > 0
		and hosts.available
		order by bogomips desc, current_ncpu desc
	loop

		-- raise notice 'serving host % for % available cpus :', rec.host_id, rec.current_ncpu;

		i := 1;
	
		for rec2 in 
			SELECT
				batch.batch_id
			FROM 
				processing.pool_x_hosts,
				internal.request, 
				processing.batch,
				internal.product
			WHERE
				batch.state = 'Queued'::character varying
				AND request.pool = pool_x_hosts.pool
				AND batch.request_id = request.id
				AND pool_x_hosts.hosts = rec.host_id
				AND product.id = batch.file_input_id
			ORDER BY substring (product.name, 11, 1), batch_id
			
		loop

			-- raise notice 'selecting batch % for node number %', rec2.batch_id, rec.host_id;
	
			insert into processing.top( batch_id, hostname_id, started, pid)
			select batch_id, rec.host_id, now(), null
			from processing.batch
			where batch_id = rec2.batch_id;
	
			update processing.batch
			set state = 'Dispatched'
			where batch_id = rec2.batch_id;
	
			i := i + 1;
			result_ := result_ + 1;

			if (i > rec.current_ncpu) then
				exit;
			end if;

		end loop;

	end loop;
	
	select into result_ count(*)
	from processing.batch
	where state = 'Dispatched';

	return result_;
end;$$;


ALTER FUNCTION processing.schedule_batches_new() OWNER TO srv_dpmc;

--
-- Name: update_batch_output_media_catalog(integer); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION update_batch_output_media_catalog(integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $_$
declare 

	batch_id_ alias for $1;
	output_media_catalog_ integer;
	output_dir_ varchar;
	next_media_ integer;
	next_media_catalog_ integer;
	next_media_catalog_name_ varchar;
	-- 20040603 ETA
	processing_comment_ integer;
	result_ varchar;

begin
	result_ := true;
	-- precondition : batch exists
	if not exists (	select	*
			from	processing.batch
			where	batch_id = batch_id_) then
		raise exception 'precondition exception : batch id % exists', batch_id_;
	end if;

	-- 2040603 ETA
	select into output_media_catalog_, processing_comment_
		request.media_catalog, request.processing_comment
	from	processing.batch join internal.request on request.id = batch.request_id
	where	batch_id = batch_id_;

	if output_media_catalog_ is null then

/*
	    -- BE CAREFULL WITH end if
	    -- 20040603 ETA
	    if processing_comment_ = 5 then -- gomos level2 processing, so output location same as input product

		select into next_media_catalog_, output_dir_ 
			mc.id, m.name || '/' || mc.name
		from 	processing.batch
			join internal.product_x_media_catalog_entry as x on x.product = batch.file_input_id
			join internal.media_catalog_entry as mce on mce.id = x.media_catalog_entry
			join internal.media_catalog as mc on mc.id = mce.media_catalog
			join internal.media as m on m.id = mc.media
		where	batch.batch_id = batch_id_
		order by m.name || '/' || mc.name
		limit 1;

		update processing.batch 
		set output_dir = output_dir_, output_media_catalog = next_media_catalog_
		where batch_id = batch_id_;

	    else -- not a level2 processing, so output location is free

*/
		next_media_ := processing.get_next_output_media_from_current_physical_capacity();
		if next_media_ is not null then
			select into next_media_catalog_name_
				internal.default_product_media_catalog_name( product.name)
			from	processing.batch
				join internal.product on (product.id = batch.file_input_id)
			where	batch_id = batch_id_;
			if not exists (	select	*
					from	internal.media_catalog
					where	media = next_media_
						and name = next_media_catalog_name_) then
				insert into internal.media_catalog( media, name)
				values( next_media_, next_media_catalog_name_);
			end if;
			select into next_media_catalog_, output_dir_
				media_catalog.id, media.name || '/' || next_media_catalog_name_
			from	internal.media join internal.media_catalog on media_catalog.media = media.id
			where 	media.id = next_media_ and media_catalog.name = next_media_catalog_name_;

			update processing.batch 
			set output_dir = output_dir_, output_media_catalog = next_media_catalog_
			where batch_id = batch_id_;
		else
			update processing.batch 
			set output_dir = '/exports/dpmc/scripts/default_output'
			where batch_id = batch_id_;			
			result_ := false;
		end if;

--	    end if;

	else
		update processing.batch
		set output_media_catalog = output_media_catalog_, output_dir = media.name || '/' || media_catalog.name
		from internal.media_catalog join internal.media on media.id = media_catalog.media
		where batch_id = batch_id_ and media_catalog.id = output_media_catalog_;
	end if;

	return result_;

end;
$_$;


ALTER FUNCTION processing.update_batch_output_media_catalog(integer) OWNER TO srv_dpmc;

--
-- Name: update_processing_order(); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION update_processing_order() RETURNS boolean
    LANGUAGE plpgsql
    AS $$

begin

update processing.batch 
SET state = 'Waiting for input'
where not exists (
select *
from public.files_location
where files_location.product_id = batch.file_input_id);

update processing.batch SET state = 'Queued' from  public.files_location where files_location.product_id = batch.file_input_id and batch.state = 'Waiting for input';

return true;
end;

$$;


ALTER FUNCTION processing.update_processing_order() OWNER TO srv_dpmc;

SET search_path = public, pg_catalog;

--
-- Name: abs(interval); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION abs(interval) RETURNS interval
    LANGUAGE sql IMMUTABLE
    AS $_$ select case when ($1<interval '0') then -$1 else $1 end; $_$;


ALTER FUNCTION public.abs(interval) OWNER TO postgres;

--
-- Name: new_image_batch(integer, integer, timestamp without time zone, timestamp without time zone); Type: FUNCTION; Schema: public; Owner: srv_dpmc
--

CREATE FUNCTION new_image_batch(integer, integer, timestamp without time zone, timestamp without time zone) RETURNS boolean
    LANGUAGE plpgsql
    AS $_$DECLARE 
	v_request alias for $1;
	v_product alias for $2;
	v_start_date_time alias for $3;
	v_stop_date_time alias for $4;
	v_state varchar;
	v_output_dir varchar;
	v_batch_id integer;
	v_product_type integer;

	v_half_duration interval;
	v_modified_start_date_time timestamp;
	v_modified_stop_date_time timestamp;
	v_time_radius interval;
	v_sensing_start timestamp;
	v_sensing_stop timestamp;

	result boolean;

BEGIN
	if v_request is null then
		raise exception 'precondition exception : request is not null';
	end if;
	if not exists (	select	*
			from 	internal.request
			where	id = v_request) then
		raise exception 'precondition exception : request % exists', v_request;
	end if;
	if v_product is null then
		raise exception 'precondition exception : product is not null';
	end if;
	if not exists (	select	*
			from	internal.product
			where	id = v_product) then
		raise exception 'precondition exception : product % exists', v_product;
	end if;
	if v_start_date_time is null then
		raise exception 'precondition exception : start_date_time is not null';
	end if;
	if v_stop_date_time is null then
		raise exception 'precondition exception : start_date_time is not null';
	end if;
	if v_start_date_time >= v_stop_date_time then 
		raise exception 'precondition exception : start_date_time  % < stop_date_time % ', v_start_date_time, v_stop_date_time;
	end if;

	v_output_dir := null;

	if exists (	select	*
			from	internal.product_x_media_catalog_entry
			where	product = v_product) then
		v_state := 'Queued';
	else	
		v_state := 'Waiting for input';
	end if;

	select into v_output_dir
		media.name || '/' || media_catalog.name
	from	internal.request
		join internal.media_catalog on request.media_catalog = media_catalog.id
		join internal.media on media.id = media_catalog.media
	where	request.id = v_request;

	if v_output_dir is null then
		raise notice 'Production output selected';
	end if;

	v_batch_id := nextval( 'processing.processing_batch_batch_id');

	insert into processing.batch(
		batch_id, 
		file_input_id,
		processing_set_id,
		state,
		output_dir,
		request_id,
		output_media_catalog
	)
	select	v_batch_id,
		v_product,
		request.processing_comment,
		v_state,
		v_output_dir,
		v_request,
		request.media_catalog
	from	internal.request
	where	request.id = v_request;

	select 	into v_time_radius
		import.ascii_seconds_to_interval( to_char(imaging_instrument.min_product_frame_count * scan_configuration.line_time_interval, '99.999'))/2
	from
		internal.request
		join processing.processing_comment_x_product_type on (request.processing_comment = processing_comment_x_product_type.processing_comment and processing_comment_x_product_type.is_input)
		join internal.mode_x_product_type on processing_comment_x_product_type.product_type = mode_x_product_type.product_type
		join internal.imaging_instrument on (mode_x_product_type.satellite = imaging_instrument.satellite and mode_x_product_type.instrument = imaging_instrument.instrument)
		join internal.scan_configuration on (scan_configuration.satellite = mode_x_product_type.satellite and scan_configuration.instrument = mode_x_product_type.instrument and scan_configuration.mode = mode_x_product_type.mode)
	where
		request.id = v_request
		and internal.scan_configuration.id = 1;

	v_half_duration := ( v_stop_date_time - v_start_date_time) / 2;

	if v_half_duration < v_time_radius then
		v_modified_start_date_time := v_start_date_time + v_half_duration - v_time_radius;
		v_modified_stop_date_time := v_start_date_time + v_half_duration + v_time_radius ;
	else
		v_modified_start_date_time := v_start_date_time;
		v_modified_stop_date_time := v_stop_date_time;
	end if;

	select into v_sensing_start, v_sensing_stop
		start_date_time,
		stop_date_time
	from	internal.sensing_product
	where	product = v_product;

	if ( v_modified_start_date_time < v_sensing_start) then
		v_modified_start_date_time := v_sensing_start;
	end if;
	if ( v_sensing_stop < v_modified_stop_date_time) then
		v_modified_stop_date_time := v_sensing_stop;
	end if;

	insert into processing.parameters_set(
		id,
		keyword_index,
		keyword,
		value)
	values (
		v_batch_id, 
		1,
		'first_time',
		internal.timestamp_to_processing_format(v_modified_start_date_time)
	);

	insert into processing.parameters_set(
		id,
		keyword_index,
		keyword,
		value)
	values (
		v_batch_id, 
		2,
		'last_time',
		internal.timestamp_to_processing_format(v_modified_stop_date_time)
	);

	select into v_product_type product_type
	from internal.product
	where id = v_product;

	if v_product_type = 18 then
		-- FULL RES REQUIRES MORE MODIFIERS
		insert into processing.parameters_set(id, keyword_index, keyword, value)
		values( v_batch_id, 3, 'mode', '11');

		insert into processing.parameters_set(id, keyword_index, keyword, value)
		select v_batch_id, 4, 'centre_lat', to_char((max_latitude + min_latitude)/2, '9990.9999')
		from internal.request, internal.site
		where request.id = v_request and site.id = request.site;

		insert into processing.parameters_set(id, keyword_index, keyword, value)
		select v_batch_id, 5, 'centre_lon', to_char((max_longitude + min_longitude)/2, '9990.9999')
		from internal.request, internal.site
		where request.id = v_request and site.id = request.site;
	end if;

   RETURN true;
   
END;

$_$;


ALTER FUNCTION public.new_image_batch(integer, integer, timestamp without time zone, timestamp without time zone) OWNER TO srv_dpmc;

--
-- Name: plpgsql_call_handler(); Type: FUNCTION; Schema: public; Owner: srv_dpmc
--

CREATE FUNCTION plpgsql_call_handler() RETURNS language_handler
    LANGUAGE c
    AS '$libdir/plpgsql', 'plpgsql_call_handler';


ALTER FUNCTION public.plpgsql_call_handler() OWNER TO srv_dpmc;

--
-- Name: user_id(); Type: FUNCTION; Schema: public; Owner: srv_dpmc
--

CREATE FUNCTION user_id() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$

declare

user_id_ int4;
str varchar;

BEGIN

str := current_user::varchar;
raise notice 'c %', str;

select 	into user_id_ id
from	internal.requester
where	login = session_user :: varchar;

return user_id_;

END;

$$;


ALTER FUNCTION public.user_id() OWNER TO srv_dpmc;

SET search_path = internal, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = true;

--
-- Name: acquisition_chain; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE acquisition_chain (
    product integer NOT NULL,
    center integer NOT NULL,
    center_rank integer NOT NULL,
    CONSTRAINT acquisition_chain_center_rank_check CHECK ((center_rank > 0))
);


ALTER TABLE internal.acquisition_chain OWNER TO srv_dpmc;

SET default_with_oids = false;

--
-- Name: adf_baseline; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE adf_baseline (
    aux_id integer NOT NULL,
    version character varying NOT NULL,
    generation_date timestamp without time zone,
    insertion_date timestamp without time zone,
    document_id integer,
    comment character varying
);


ALTER TABLE internal.adf_baseline OWNER TO srv_dpmc;

SET default_with_oids = true;

--
-- Name: auxiliary_configuration; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE auxiliary_configuration (
    id integer DEFAULT nextval(('internal.auxiliary_configuration_seq'::text)::regclass) NOT NULL,
    name character varying(255) NOT NULL,
    comment text,
    index_media_catalog integer
);


ALTER TABLE internal.auxiliary_configuration OWNER TO srv_dpmc;

--
-- Name: auxiliary_configuration_detail; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE auxiliary_configuration_detail (
    configuration integer NOT NULL,
    product_type integer NOT NULL,
    version character varying(10) DEFAULT '1.0'::character varying
);


ALTER TABLE internal.auxiliary_configuration_detail OWNER TO srv_dpmc;

--
-- Name: auxiliary_configuration_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE auxiliary_configuration_seq
    START WITH 11
    INCREMENT BY 1
    MINVALUE 0
    NO MAXVALUE
    CACHE 1;


ALTER TABLE internal.auxiliary_configuration_seq OWNER TO srv_dpmc;

--
-- Name: auxiliary_product; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE auxiliary_product (
    product integer NOT NULL,
    validity_start_date_time timestamp without time zone NOT NULL,
    validity_stop_date_time timestamp without time zone NOT NULL,
    version character varying(10),
    CONSTRAINT auxiliary_product_validity_period_check CHECK ((validity_start_date_time < validity_stop_date_time))
);


ALTER TABLE internal.auxiliary_product OWNER TO srv_dpmc;

--
-- Name: center; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE center (
    id integer NOT NULL,
    latitude real,
    longitude real,
    code character varying(255) NOT NULL,
    name character varying(255),
    code_in_product_name character varying(3)
);


ALTER TABLE internal.center OWNER TO srv_dpmc;

--
-- Name: center_x_software; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE center_x_software (
    center integer NOT NULL,
    software integer NOT NULL,
    system_subdirectory character varying(255),
    available boolean DEFAULT false
);


ALTER TABLE internal.center_x_software OWNER TO srv_dpmc;

--
-- Name: communication_request; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE communication_request (
    request integer NOT NULL,
    title character varying(255) DEFAULT ''::character varying,
    message text DEFAULT ''::text
);


ALTER TABLE internal.communication_request OWNER TO srv_dpmc;

--
-- Name: current_software; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE current_software (
    center integer NOT NULL,
    software integer
);


ALTER TABLE internal.current_software OWNER TO srv_dpmc;

--
-- Name: data_type; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE data_type (
    id integer NOT NULL,
    name character varying(255) NOT NULL
);


ALTER TABLE internal.data_type OWNER TO srv_dpmc;

--
-- Name: dataset; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE dataset (
    id integer DEFAULT nextval(('internal.dataset_seq'::text)::regclass) NOT NULL,
    cdate timestamp without time zone NOT NULL,
    name character varying NOT NULL,
    comment character varying
);


ALTER TABLE internal.dataset OWNER TO srv_dpmc;

--
-- Name: dataset_x_product; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE dataset_x_product (
    dataset_id integer NOT NULL,
    product_id integer NOT NULL
);


ALTER TABLE internal.dataset_x_product OWNER TO srv_dpmc;

--
-- Name: product; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE product (
    id integer DEFAULT nextval(('internal.product_seq'::text)::regclass) NOT NULL,
    processing integer,
    product_type integer NOT NULL,
    document integer,
    generation_date_time timestamp without time zone,
    size bigint,
    checked boolean DEFAULT false,
    name character varying(255) NOT NULL,
    obsolescence_date_time timestamp without time zone
);


ALTER TABLE internal.product OWNER TO srv_dpmc;

--
-- Name: dataset_content; Type: VIEW; Schema: internal; Owner: srv_dpmc
--

CREATE VIEW dataset_content AS
 SELECT d.name AS dataset_name,
    p.name AS product_name,
    d.id AS dataset_id,
    p.id AS product_id
   FROM dataset_x_product dxp,
    dataset d,
    product p
  WHERE ((dxp.product_id = p.id) AND (dxp.dataset_id = d.id))
  ORDER BY d.name, p.name;


ALTER TABLE internal.dataset_content OWNER TO srv_dpmc;

--
-- Name: dataset_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE dataset_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE internal.dataset_seq OWNER TO srv_dpmc;

--
-- Name: dataset_x_dataset; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE dataset_x_dataset (
    master_dataset_id integer NOT NULL,
    sub_dataset_id integer NOT NULL
);


ALTER TABLE internal.dataset_x_dataset OWNER TO srv_dpmc;

SET default_with_oids = false;

--
-- Name: dataset_x_document; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE dataset_x_document (
    id integer NOT NULL,
    dataset_id integer,
    document_id integer
);


ALTER TABLE internal.dataset_x_document OWNER TO srv_dpmc;

SET default_with_oids = true;

--
-- Name: default_center_x_product_type_software; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE default_center_x_product_type_software (
    center integer NOT NULL,
    product_type integer NOT NULL,
    software integer NOT NULL
);


ALTER TABLE internal.default_center_x_product_type_software OWNER TO srv_dpmc;

SET default_with_oids = false;

--
-- Name: default_processing; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE default_processing (
    id integer NOT NULL,
    cdate timestamp without time zone,
    processing_configuration_id integer,
    sxac_id integer,
    comment character varying,
    product_type_id integer
);


ALTER TABLE internal.default_processing OWNER TO srv_dpmc;

--
-- Name: distribution; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE distribution (
    id integer NOT NULL,
    requester_id integer NOT NULL,
    media_id integer,
    dataset_id integer,
    date timestamp without time zone,
    comment character varying,
    mode character varying
);


ALTER TABLE internal.distribution OWNER TO srv_dpmc;

SET default_with_oids = true;

--
-- Name: document; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE document (
    id integer DEFAULT nextval(('internal.document_seq'::text)::regclass) NOT NULL,
    name character varying,
    url character varying,
    comment character varying
);


ALTER TABLE internal.document OWNER TO srv_dpmc;

--
-- Name: document_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE document_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE internal.document_seq OWNER TO srv_dpmc;

--
-- Name: error_type; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE error_type (
    id integer NOT NULL,
    name character varying(255) NOT NULL
);


ALTER TABLE internal.error_type OWNER TO srv_dpmc;

--
-- Name: error_type_x_product; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE error_type_x_product (
    error_type integer NOT NULL,
    product integer NOT NULL,
    significant boolean NOT NULL,
    error_count integer NOT NULL,
    threshold real NOT NULL
);


ALTER TABLE internal.error_type_x_product OWNER TO srv_dpmc;

--
-- Name: first_nadir_point; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE first_nadir_point (
    id integer NOT NULL,
    satellite integer NOT NULL,
    date_time timestamp without time zone NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL
);


ALTER TABLE internal.first_nadir_point OWNER TO srv_dpmc;

SET default_with_oids = false;

--
-- Name: footprint; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE footprint (
    product_id integer NOT NULL,
    footprint polygon NOT NULL
);


ALTER TABLE internal.footprint OWNER TO srv_dpmc;

--
-- Name: gen_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE gen_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE internal.gen_seq OWNER TO srv_dpmc;

--
-- Name: ipf_processing_baseline; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE ipf_processing_baseline (
    id integer NOT NULL,
    document character varying,
    creation_date timestamp without time zone,
    comment character varying,
    version character varying
);


ALTER TABLE internal.ipf_processing_baseline OWNER TO srv_dpmc;

--
-- Name: ipf_processing_baseline_x_sxa; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE ipf_processing_baseline_x_sxa (
    id integer NOT NULL,
    ipf_processing_baseline_id integer,
    soft_x_aux_conf_id integer,
    comment character varying
);


ALTER TABLE internal.ipf_processing_baseline_x_sxa OWNER TO srv_dpmc;

SET default_with_oids = true;

--
-- Name: product_type; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE product_type (
    id integer NOT NULL,
    sph_size integer,
    mean_size real,
    acronym character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    processing_level character varying(2),
    cache_duration integer DEFAULT 0,
    gap_type character varying(3),
    gap_nominal integer
);


ALTER TABLE internal.product_type OWNER TO srv_dpmc;

--
-- Name: software; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE software (
    id integer DEFAULT nextval(('internal.software_seq'::text)::regclass) NOT NULL,
    name character varying(255) NOT NULL,
    version character varying(20) NOT NULL,
    default_auxiliary_configuration integer,
    processing_stage character(1)
);


ALTER TABLE internal.software OWNER TO srv_dpmc;

SET default_with_oids = false;

--
-- Name: software_x_auxiliary_configuration; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE software_x_auxiliary_configuration (
    id integer NOT NULL,
    software integer,
    auxiliary_configuration integer,
    ipf_baseline character varying,
    creation_date timestamp without time zone,
    comment character varying
);


ALTER TABLE internal.software_x_auxiliary_configuration OWNER TO srv_dpmc;

--
-- Name: COLUMN software_x_auxiliary_configuration.creation_date; Type: COMMENT; Schema: internal; Owner: srv_dpmc
--

COMMENT ON COLUMN software_x_auxiliary_configuration.creation_date IS 'Date given in the IPF Processing Baseline Document';


--
-- Name: give_ipf_processing_baseline; Type: VIEW; Schema: internal; Owner: srv_dpmc
--

CREATE VIEW give_ipf_processing_baseline AS
 SELECT ipb.version AS ipb_version,
    s.name AS soft_name,
    sxac.ipf_baseline,
    s.version AS soft_version,
    ac.name AS ac_version,
    pt.acronym,
    p.name AS adf_name
   FROM ipf_processing_baseline ipb,
    ipf_processing_baseline_x_sxa ipbsxa,
    software_x_auxiliary_configuration sxac,
    software s,
    auxiliary_configuration ac,
    auxiliary_configuration_detail acd,
    product_type pt,
    product p,
    auxiliary_product ap
  WHERE ((((((((((ipbsxa.ipf_processing_baseline_id = ipb.id) AND (ipbsxa.soft_x_aux_conf_id = sxac.id)) AND (sxac.software = s.id)) AND (sxac.auxiliary_configuration = ac.id)) AND (acd.configuration = ac.id)) AND (acd.product_type = pt.id)) AND (ap.product = p.id)) AND (p.product_type = pt.id)) AND (p.product_type = acd.product_type)) AND ((acd.version)::text = (ap.version)::text))
  ORDER BY ipb.id, s.id;


ALTER TABLE internal.give_ipf_processing_baseline OWNER TO srv_dpmc;

--
-- Name: give_ipf_processing_sxac; Type: VIEW; Schema: internal; Owner: srv_dpmc
--

CREATE VIEW give_ipf_processing_sxac AS
 SELECT ipb.version AS ipb_version,
    s.name AS soft_name,
    sxac.id AS sxac,
    sxac.ipf_baseline,
    s.version AS soft_version,
    ac.name AS ac_version,
    pt.acronym,
    p.name AS adf_name,
    acd.version AS adf_version
   FROM ipf_processing_baseline ipb,
    ipf_processing_baseline_x_sxa ipbsxa,
    software_x_auxiliary_configuration sxac,
    software s,
    auxiliary_configuration ac,
    auxiliary_configuration_detail acd,
    product_type pt,
    product p,
    auxiliary_product ap
  WHERE ((((((((((ipbsxa.ipf_processing_baseline_id = ipb.id) AND (ipbsxa.soft_x_aux_conf_id = sxac.id)) AND (sxac.software = s.id)) AND (sxac.auxiliary_configuration = ac.id)) AND (acd.configuration = ac.id)) AND (acd.product_type = pt.id)) AND (ap.product = p.id)) AND (p.product_type = pt.id)) AND (p.product_type = acd.product_type)) AND ((acd.version)::text = (ap.version)::text))
  ORDER BY ipb.id, s.id;


ALTER TABLE internal.give_ipf_processing_sxac OWNER TO srv_dpmc;

--
-- Name: give_one_full_baseline; Type: VIEW; Schema: internal; Owner: postgres
--

CREATE VIEW give_one_full_baseline AS
 SELECT ipb.version AS ipb_version,
    s.name AS soft_name,
    s.id AS soft_id,
    cxs.system_subdirectory AS dir,
    sxac.ipf_baseline,
    sxac.id AS sxac_id,
    s.version AS soft_version,
    ac.id AS ac_id,
    ac.name AS ac_version,
    pt.acronym,
    pt.id AS pt_id,
    p.name AS adf_name,
    ap.version AS ap_version
   FROM ipf_processing_baseline ipb,
    ipf_processing_baseline_x_sxa ipbsxa,
    software_x_auxiliary_configuration sxac,
    software s,
    center_x_software cxs,
    auxiliary_configuration ac,
    auxiliary_configuration_detail acd,
    product_type pt,
    product p,
    auxiliary_product ap
  WHERE ((((((((((((s.id = cxs.software) AND (ipbsxa.ipf_processing_baseline_id = ipb.id)) AND (ipbsxa.soft_x_aux_conf_id = sxac.id)) AND (sxac.software = s.id)) AND (sxac.auxiliary_configuration = ac.id)) AND (acd.configuration = ac.id)) AND (acd.product_type = pt.id)) AND (ap.product = p.id)) AND (p.product_type = pt.id)) AND (p.product_type = acd.product_type)) AND ((acd.version)::text = (ap.version)::text)) AND ((ipb.version)::text = 'i3r04_AOD_newPCPAAX_2024'::text))
  ORDER BY s.name, p.name;


ALTER TABLE internal.give_one_full_baseline OWNER TO postgres;

SET default_with_oids = true;

--
-- Name: global; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE global (
    center integer,
    output_media_catalog integer,
    idl_token_count integer,
    global_site integer,
    launch_time_out interval NOT NULL,
    min_input_processing_stage character(1),
    default_output_processing_stage character(1),
    stage_shift_interval interval,
    stage_shift_count integer,
    run_time_out interval,
    last_schedule_date_time timestamp without time zone,
    scheduler_time_out interval,
    max_time_cache integer,
    max_time_lock integer,
    s3_cots character varying,
    CONSTRAINT global_check_stage_shift_count CHECK ((stage_shift_count >= 0)),
    CONSTRAINT global_check_stage_shift_interval CHECK (((stage_shift_interval)::text >= '0'::text))
);


ALTER TABLE internal.global OWNER TO srv_dpmc;

--
-- Name: image_processing_input; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE image_processing_input (
    processing integer NOT NULL,
    product integer NOT NULL,
    start_date_time timestamp without time zone,
    stop_date_time timestamp without time zone
);


ALTER TABLE internal.image_processing_input OWNER TO srv_dpmc;

--
-- Name: imaging_instrument; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE imaging_instrument (
    satellite integer NOT NULL,
    instrument integer NOT NULL,
    reference_trace polygon,
    reference_relative_orbit_number integer,
    min_product_frame_count integer
);


ALTER TABLE internal.imaging_instrument OWNER TO srv_dpmc;

--
-- Name: instrument; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE instrument (
    satellite integer NOT NULL,
    id integer NOT NULL,
    acronym character varying(50) NOT NULL,
    name character(100) NOT NULL
);


ALTER TABLE internal.instrument OWNER TO srv_dpmc;

--
-- Name: instrument_calibration_history; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE instrument_calibration_history (
    satellite integer NOT NULL,
    instrument integer NOT NULL,
    orbit_absolute_number integer NOT NULL,
    comment character varying(255)
);


ALTER TABLE internal.instrument_calibration_history OWNER TO srv_dpmc;

--
-- Name: instrument_unavailability_period; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE instrument_unavailability_period (
    satellite integer NOT NULL,
    instrument integer NOT NULL,
    start_date_time timestamp without time zone NOT NULL,
    stop_date_time timestamp without time zone,
    comment character varying(255)
);


ALTER TABLE internal.instrument_unavailability_period OWNER TO srv_dpmc;

--
-- Name: ipf_x_dynamic_adf; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE ipf_x_dynamic_adf (
    ipf character varying NOT NULL,
    acronym character varying NOT NULL,
    type character varying,
    mode character varying,
    retrieval_mode character varying,
    backup_of character varying
);


ALTER TABLE internal.ipf_x_dynamic_adf OWNER TO srv_dpmc;

--
-- Name: living_request; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE living_request (
    request integer NOT NULL
);


ALTER TABLE internal.living_request OWNER TO srv_dpmc;

--
-- Name: mailing_list; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE mailing_list (
    requester integer NOT NULL,
    request integer NOT NULL
);


ALTER TABLE internal.mailing_list OWNER TO srv_dpmc;

--
-- Name: media; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE media (
    id integer DEFAULT nextval(('internal.media_id'::text)::regclass) NOT NULL,
    media_type integer NOT NULL,
    name character varying(255) NOT NULL,
    capacity double precision,
    reserved_capacity double precision DEFAULT 0,
    current_physical_capacity double precision,
    comment character varying(255),
    source_media integer,
    recipient integer,
    available boolean
);


ALTER TABLE internal.media OWNER TO srv_dpmc;

--
-- Name: media_catalog; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE media_catalog (
    media integer NOT NULL,
    name character varying(255) NOT NULL,
    id integer DEFAULT nextval(('internal.media_catalog_sequence'::text)::regclass) NOT NULL
);


ALTER TABLE internal.media_catalog OWNER TO srv_dpmc;

--
-- Name: media_catalog_entry; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE media_catalog_entry (
    id integer DEFAULT nextval(('internal.media_catalog_entry_sequence'::text)::regclass) NOT NULL,
    media_catalog integer,
    name character varying(255),
    md5_checksum character varying(255) DEFAULT NULL::character varying
);


ALTER TABLE internal.media_catalog_entry OWNER TO srv_dpmc;

--
-- Name: media_catalog_entry_sequence; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE media_catalog_entry_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE internal.media_catalog_entry_sequence OWNER TO srv_dpmc;

--
-- Name: media_catalog_sequence; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE media_catalog_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE internal.media_catalog_sequence OWNER TO srv_dpmc;

--
-- Name: media_history; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE media_history (
    media integer NOT NULL,
    history_type integer NOT NULL,
    date_time timestamp without time zone NOT NULL,
    comment character varying(255)
);


ALTER TABLE internal.media_history OWNER TO srv_dpmc;

--
-- Name: media_history_type; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE media_history_type (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(20) NOT NULL
);


ALTER TABLE internal.media_history_type OWNER TO srv_dpmc;

--
-- Name: media_id; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE media_id
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE internal.media_id OWNER TO srv_dpmc;

SET default_with_oids = false;

--
-- Name: media_info; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE media_info (
    media integer NOT NULL,
    shipment_id character varying,
    shipment_origin character varying,
    shipment_date timestamp without time zone,
    delivery_date timestamp without time zone,
    item_id character varying,
    nature character varying,
    media_status integer NOT NULL,
    initial_label character varying,
    delivery_info character varying,
    known_info character varying,
    transcription_date timestamp without time zone,
    transcription_status transcription_status,
    transcription_report integer NOT NULL
);


ALTER TABLE internal.media_info OWNER TO srv_dpmc;

--
-- Name: COLUMN media_info.media; Type: COMMENT; Schema: internal; Owner: srv_dpmc
--

COMMENT ON COLUMN media_info.media IS 'foreign key on media: id';


--
-- Name: COLUMN media_info.shipment_id; Type: COMMENT; Schema: internal; Owner: srv_dpmc
--

COMMENT ON COLUMN media_info.shipment_id IS 'Label that defines the shipment (to be defined at the beginning of a project)';


--
-- Name: COLUMN media_info.shipment_origin; Type: COMMENT; Schema: internal; Owner: srv_dpmc
--

COMMENT ON COLUMN media_info.shipment_origin IS 'The name of the shipment';


--
-- Name: COLUMN media_info.item_id; Type: COMMENT; Schema: internal; Owner: srv_dpmc
--

COMMENT ON COLUMN media_info.item_id IS 'Label that define the item related to this media';


--
-- Name: COLUMN media_info.nature; Type: COMMENT; Schema: internal; Owner: srv_dpmc
--

COMMENT ON COLUMN media_info.nature IS 'the type of data stored in the media';


--
-- Name: COLUMN media_info.media_status; Type: COMMENT; Schema: internal; Owner: srv_dpmc
--

COMMENT ON COLUMN media_info.media_status IS 'foreign key to a media_status  table (to be created with id, status)';


--
-- Name: COLUMN media_info.initial_label; Type: COMMENT; Schema: internal; Owner: srv_dpmc
--

COMMENT ON COLUMN media_info.initial_label IS 'reading of any label which may already be on the item at the time of reception ';


--
-- Name: COLUMN media_info.delivery_info; Type: COMMENT; Schema: internal; Owner: srv_dpmc
--

COMMENT ON COLUMN media_info.delivery_info IS 'any information regarding the item included in the inventory prepared by the party doing the shipment';


--
-- Name: COLUMN media_info.known_info; Type: COMMENT; Schema: internal; Owner: srv_dpmc
--

COMMENT ON COLUMN media_info.known_info IS 'any known information on the contents of the item';


--
-- Name: COLUMN media_info.transcription_report; Type: COMMENT; Schema: internal; Owner: srv_dpmc
--

COMMENT ON COLUMN media_info.transcription_report IS 'Foreign key to a product';


--
-- Name: media_sequence; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE media_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE internal.media_sequence OWNER TO srv_dpmc;

--
-- Name: media_status; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE media_status (
    id integer NOT NULL,
    status character varying
);


ALTER TABLE internal.media_status OWNER TO srv_dpmc;

SET default_with_oids = true;

--
-- Name: media_type; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE media_type (
    id integer NOT NULL,
    capacity double precision NOT NULL,
    sequential boolean,
    name character varying(255) NOT NULL,
    removable boolean
);


ALTER TABLE internal.media_type OWNER TO srv_dpmc;

--
-- Name: mode; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE mode (
    satellite integer NOT NULL,
    instrument integer NOT NULL,
    mode integer NOT NULL,
    name character(100) NOT NULL
);


ALTER TABLE internal.mode OWNER TO srv_dpmc;

--
-- Name: mode_x_product_type; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE mode_x_product_type (
    satellite integer NOT NULL,
    instrument integer NOT NULL,
    mode integer NOT NULL,
    product_type integer NOT NULL
);


ALTER TABLE internal.mode_x_product_type OWNER TO srv_dpmc;

--
-- Name: on_board_time; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE on_board_time (
    id integer NOT NULL,
    satellite integer NOT NULL,
    date_time timestamp without time zone NOT NULL,
    binary_time bigint NOT NULL,
    clock_step bigint NOT NULL
);


ALTER TABLE internal.on_board_time OWNER TO srv_dpmc;

--
-- Name: orbit; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE orbit (
    satellite integer NOT NULL,
    absolute_number integer NOT NULL,
    mission_phase character(1) NOT NULL,
    phase_cycle integer,
    cycle_relative_number integer,
    anx_date_time timestamp without time zone,
    theoretical_anx_date_time timestamp without time zone,
    anx_date_time_source_product integer,
    CONSTRAINT orbit_cycle_relative_number CHECK ((cycle_relative_number >= 0)),
    CONSTRAINT orbit_phase_cycle CHECK ((phase_cycle >= 0))
);


ALTER TABLE internal.orbit OWNER TO srv_dpmc;

SET default_with_oids = false;

--
-- Name: priority; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE priority (
    id integer DEFAULT nextval(('internal.priority_seq'::text)::regclass) NOT NULL,
    satellite integer,
    product_type integer,
    from_date timestamp without time zone,
    to_date timestamp without time zone,
    priority json
);


ALTER TABLE internal.priority OWNER TO srv_dpmc;

--
-- Name: TABLE priority; Type: COMMENT; Schema: internal; Owner: srv_dpmc
--

COMMENT ON TABLE priority IS 'Table to store consolidated list of products according to the priority list.
Example with this priority list:
1 | MAR | orbits
2 | MAR | granules
3 | LN3 | orbits
4 | LN3 | granules

It means the base list is orbits from MAR.
Then we fill in gaps with MAR granules
Then we fill in gaps with LN3 orbits
Then we fill in gaps with LN3 granules';


--
-- Name: priority_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE priority_seq
    START WITH 1
    INCREMENT BY 1
    MINVALUE 0
    NO MAXVALUE
    CACHE 1;


ALTER TABLE internal.priority_seq OWNER TO srv_dpmc;

--
-- Name: priority_x_product; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE priority_x_product (
    priority_id integer,
    product_id integer
);


ALTER TABLE internal.priority_x_product OWNER TO srv_dpmc;

--
-- Name: TABLE priority_x_product; Type: COMMENT; Schema: internal; Owner: srv_dpmc
--

COMMENT ON TABLE priority_x_product IS 'Table to link priority list with all products of this list';


--
-- Name: processing; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE processing (
    id integer DEFAULT nextval(('internal.processing_seq'::text)::regclass) NOT NULL,
    center integer NOT NULL,
    software integer,
    stage character(1) NOT NULL,
    state integer,
    product_type integer NOT NULL
);


ALTER TABLE internal.processing OWNER TO srv_dpmc;

SET default_with_oids = true;

--
-- Name: processing_chain; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE processing_chain (
    before integer NOT NULL,
    after integer NOT NULL
);


ALTER TABLE internal.processing_chain OWNER TO srv_dpmc;

SET default_with_oids = false;

--
-- Name: processing_configuration; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE processing_configuration (
    id integer NOT NULL,
    cdate timestamp without time zone NOT NULL,
    sxac_id integer NOT NULL,
    processing_comment_id integer,
    parameter json,
    comment character varying
);


ALTER TABLE internal.processing_configuration OWNER TO srv_dpmc;

SET default_with_oids = true;

--
-- Name: processing_input; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE processing_input (
    processing integer NOT NULL,
    product integer NOT NULL
);


ALTER TABLE internal.processing_input OWNER TO srv_dpmc;

--
-- Name: processing_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE processing_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE internal.processing_seq OWNER TO srv_dpmc;

--
-- Name: product_media; Type: VIEW; Schema: internal; Owner: srv_dpmc
--

CREATE VIEW product_media AS
 SELECT m.name AS volume_name,
    mc.name AS dir_name,
    mce.name AS product_name
   FROM media_catalog_entry mce,
    media_catalog mc,
    media m
  WHERE ((m.id = mc.media) AND (mce.media_catalog = mc.id));


ALTER TABLE internal.product_media OWNER TO srv_dpmc;

--
-- Name: product_x_media_catalog_entry; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE product_x_media_catalog_entry (
    media_catalog_entry integer NOT NULL,
    product integer NOT NULL
);


ALTER TABLE internal.product_x_media_catalog_entry OWNER TO srv_dpmc;

--
-- Name: sensing_product; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE sensing_product (
    product integer NOT NULL,
    start_date_time timestamp without time zone NOT NULL,
    stop_date_time timestamp without time zone NOT NULL,
    start_absolute_orbit_number integer NOT NULL,
    product_type_counter integer NOT NULL,
    error boolean,
    state_vector integer
);


ALTER TABLE internal.sensing_product OWNER TO srv_dpmc;

--
-- Name: product_path; Type: VIEW; Schema: internal; Owner: postgres
--

CREATE VIEW product_path WITH (security_barrier=false) AS
 SELECT product.id,
    product.name,
    (((((media.name)::text || ('/'::character varying)::text) || (media_catalog.name)::text) || ('/'::character varying)::text) || (media_catalog_entry.name)::text) AS product_path,
    product_type.acronym,
    sensing_product.start_date_time,
    sensing_product.stop_date_time,
    sensing_product.start_absolute_orbit_number
   FROM product,
    sensing_product,
    product_type,
    product_x_media_catalog_entry,
    media_catalog_entry,
    media_catalog,
    media
  WHERE ((((((product.product_type = product_type.id) AND (sensing_product.product = product.id)) AND (product_x_media_catalog_entry.product = product.id)) AND (product_x_media_catalog_entry.media_catalog_entry = media_catalog_entry.id)) AND (media_catalog_entry.media_catalog = media_catalog.id)) AND (media_catalog.media = media.id));


ALTER TABLE internal.product_path OWNER TO postgres;

--
-- Name: product_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE product_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE internal.product_seq OWNER TO srv_dpmc;

--
-- Name: product_time_range; Type: VIEW; Schema: internal; Owner: srv_dpmc
--

CREATE VIEW product_time_range AS
 SELECT p.name,
        CASE
            WHEN (sp.start_date_time IS NULL) THEN ap.validity_start_date_time
            ELSE sp.start_date_time
        END AS start_time,
        CASE
            WHEN (sp.stop_date_time IS NULL) THEN ap.validity_stop_date_time
            ELSE sp.stop_date_time
        END AS stop_time
   FROM ((product p
     LEFT JOIN sensing_product sp ON ((sp.product = p.id)))
     LEFT JOIN auxiliary_product ap ON ((ap.product = p.id)));


ALTER TABLE internal.product_time_range OWNER TO srv_dpmc;

--
-- Name: product_type_chain; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE product_type_chain (
    target integer NOT NULL,
    id integer NOT NULL,
    source integer
);


ALTER TABLE internal.product_type_chain OWNER TO srv_dpmc;

--
-- Name: product_type_dependency; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE product_type_dependency (
    target integer NOT NULL,
    source integer NOT NULL,
    dependency_group integer NOT NULL,
    source_rank integer NOT NULL,
    is_auxiliary boolean
);


ALTER TABLE internal.product_type_dependency OWNER TO srv_dpmc;

--
-- Name: product_type_link; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE product_type_link (
    product_type integer NOT NULL,
    name character varying(255)
);


ALTER TABLE internal.product_type_link OWNER TO srv_dpmc;

--
-- Name: product_x_sequential_media; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE product_x_sequential_media (
    media integer NOT NULL,
    "position" integer NOT NULL,
    product integer NOT NULL
);


ALTER TABLE internal.product_x_sequential_media OWNER TO srv_dpmc;

--
-- Name: pushed_products; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE pushed_products (
    product_name character varying NOT NULL,
    requester_id integer NOT NULL,
    status character varying,
    product_size bigint,
    start_upload timestamp without time zone,
    stop_upload timestamp without time zone
);


ALTER TABLE internal.pushed_products OWNER TO srv_dpmc;

--
-- Name: TABLE pushed_products; Type: COMMENT; Schema: internal; Owner: srv_dpmc
--

COMMENT ON TABLE pushed_products IS 'Once products reprocessed, a script compares an output dataset with this table to know if products are already pushed to the EUMETSAT FTP.
The status New means that the script is running, the status Done means that the upload succeed and the status Error means that the upload failed.';


--
-- Name: recipient; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE recipient (
    communication_request integer NOT NULL,
    requester integer NOT NULL,
    by_mail boolean DEFAULT false,
    by_ftp boolean DEFAULT false,
    by_email boolean DEFAULT false
);


ALTER TABLE internal.recipient OWNER TO srv_dpmc;

--
-- Name: rectangular_site; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE rectangular_site (
    site integer NOT NULL
);


ALTER TABLE internal.rectangular_site OWNER TO srv_dpmc;

--
-- Name: reference_tie_frame; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE reference_tie_frame (
    satellite integer NOT NULL,
    instrument integer NOT NULL,
    id integer NOT NULL,
    anx_interval interval,
    region polygon
);


ALTER TABLE internal.reference_tie_frame OWNER TO srv_dpmc;

--
-- Name: relative_orbit; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE relative_orbit (
    satellite integer NOT NULL,
    id integer NOT NULL,
    reference_trace_translation_vector point,
    reference_trace_translation_longitude double precision
);


ALTER TABLE internal.relative_orbit OWNER TO srv_dpmc;

SET default_with_oids = false;

--
-- Name: reprocessing; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE reprocessing (
    id integer NOT NULL,
    cdate timestamp without time zone,
    processing_configuration_id integer,
    dataset_in_id integer,
    dataset_out_id integer,
    comment character varying
);


ALTER TABLE internal.reprocessing OWNER TO srv_dpmc;

SET default_with_oids = true;

--
-- Name: request; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE request (
    id integer DEFAULT nextval(('internal.request_seq'::text)::regclass) NOT NULL,
    site integer,
    requester integer NOT NULL,
    min_date_time timestamp without time zone NOT NULL,
    max_date_time timestamp without time zone NOT NULL,
    center integer NOT NULL,
    submission_date_time timestamp without time zone NOT NULL,
    answer_date_time timestamp without time zone,
    priority smallint,
    lock boolean,
    product_type integer,
    media_catalog integer,
    server_account integer,
    pool integer,
    software integer,
    auxiliary_configuration integer,
    processing_comment integer NOT NULL,
    processing_stage character(1),
    is_output_referenced boolean DEFAULT false NOT NULL
);


ALTER TABLE internal.request OWNER TO srv_dpmc;

SET default_with_oids = false;

--
-- Name: request_description; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE request_description (
    request integer NOT NULL,
    description character varying NOT NULL
);


ALTER TABLE internal.request_description OWNER TO srv_dpmc;

--
-- Name: COLUMN request_description.request; Type: COMMENT; Schema: internal; Owner: srv_dpmc
--

COMMENT ON COLUMN request_description.request IS 'request id';


--
-- Name: COLUMN request_description.description; Type: COMMENT; Schema: internal; Owner: srv_dpmc
--

COMMENT ON COLUMN request_description.description IS 'description of the request';


SET default_with_oids = true;

--
-- Name: site; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE site (
    id integer DEFAULT nextval(('internal.site_seq'::text)::regclass) NOT NULL,
    min_latitude real,
    min_longitude real,
    max_latitude real,
    max_longitude real,
    name character varying(255) NOT NULL,
    min_point_count integer,
    point_count integer,
    sys_polygon polygon,
    is_across_international_date_line boolean,
    owner integer NOT NULL,
    CONSTRAINT max_latitude_chk CHECK ((max_latitude <= (90)::double precision)),
    CONSTRAINT max_longitude_chk CHECK ((max_longitude <= (180)::double precision)),
    CONSTRAINT min_latitude_chk CHECK ((((- (90)::double precision) <= min_latitude) AND (min_latitude < (90)::double precision))),
    CONSTRAINT min_longitude_chk CHECK ((((- (180)::double precision) <= min_longitude) AND (min_longitude < (180)::double precision)))
);


ALTER TABLE internal.site OWNER TO srv_dpmc;

SET search_path = processing, pg_catalog;

--
-- Name: pool; Type: TABLE; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE pool (
    id integer DEFAULT nextval(('processing.processing_pool_id'::text)::regclass) NOT NULL,
    comment character varying NOT NULL
);


ALTER TABLE processing.pool OWNER TO srv_dpmc;

--
-- Name: processing_comment; Type: TABLE; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE processing_comment (
    id integer NOT NULL,
    pcomment character varying,
    acronym character varying(255)
);


ALTER TABLE processing.processing_comment OWNER TO srv_dpmc;

--
-- Name: processing_set; Type: TABLE; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE processing_set (
    id integer NOT NULL,
    seq_index integer NOT NULL,
    type integer,
    function_name character varying
);


ALTER TABLE processing.processing_set OWNER TO srv_dpmc;

SET search_path = internal, pg_catalog;

--
-- Name: request_detail_site; Type: VIEW; Schema: internal; Owner: srv_dpmc
--

CREATE VIEW request_detail_site AS
 SELECT r.id,
    si.name,
    si.min_longitude AS minlon,
    si.max_longitude AS maxlon,
    si.min_latitude AS minlat,
    si.max_latitude AS maxlat,
    r.submission_date_time,
    r.product_type,
    pt.acronym,
    r.media_catalog,
    m.name AS media,
    mc.name AS dir,
    r.pool,
    p.comment AS poolc,
    r.software,
    s.version AS soft,
    ac.id AS aux_id,
    ac.comment AS aux,
    r.processing_comment,
    pc.pcomment,
    ps.function_name AS func,
    rd.description
   FROM (request r
     LEFT JOIN request_description rd ON ((r.id = rd.request))),
    media_catalog mc,
    media m,
    product_type pt,
    processing.pool p,
    software s,
    auxiliary_configuration ac,
    processing.processing_comment pc,
    processing.processing_set ps,
    site si
  WHERE (((((((((r.media_catalog = mc.id) AND (mc.media = m.id)) AND (r.product_type = pt.id)) AND (r.pool = p.id)) AND (r.software = s.id)) AND (r.auxiliary_configuration = ac.id)) AND (r.processing_comment = pc.id)) AND (r.processing_comment = ps.id)) AND (r.site = si.id))
  ORDER BY r.id;


ALTER TABLE internal.request_detail_site OWNER TO srv_dpmc;

--
-- Name: request_details; Type: VIEW; Schema: internal; Owner: srv_dpmc
--

CREATE VIEW request_details AS
 SELECT r.id,
    r.submission_date_time,
    r.product_type,
    pt.acronym,
    r.media_catalog,
    m.name AS media,
    mc.name AS dir,
    r.pool,
    p.comment AS poolc,
    r.software,
    s.version AS soft,
    ac.id AS aux_id,
    ac.comment AS aux,
    r.processing_comment,
    pc.pcomment,
    ps.function_name AS func
   FROM request r,
    media_catalog mc,
    media m,
    product_type pt,
    processing.pool p,
    software s,
    auxiliary_configuration ac,
    processing.processing_comment pc,
    processing.processing_set ps
  WHERE ((((((((r.media_catalog = mc.id) AND (mc.media = m.id)) AND (r.product_type = pt.id)) AND (r.pool = p.id)) AND (r.software = s.id)) AND (r.auxiliary_configuration = ac.id)) AND (r.processing_comment = pc.id)) AND (r.processing_comment = ps.id))
  ORDER BY r.id;


ALTER TABLE internal.request_details OWNER TO srv_dpmc;

--
-- Name: request_group; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE request_group (
    id integer NOT NULL,
    name character varying(50) NOT NULL
);


ALTER TABLE internal.request_group OWNER TO srv_dpmc;

--
-- Name: request_group_x_request; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE request_group_x_request (
    request_group integer NOT NULL,
    request integer NOT NULL
);


ALTER TABLE internal.request_group_x_request OWNER TO srv_dpmc;

--
-- Name: request_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE request_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE internal.request_seq OWNER TO srv_dpmc;

--
-- Name: request_x_data_type; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE request_x_data_type (
    data_type integer NOT NULL,
    request integer NOT NULL
);


ALTER TABLE internal.request_x_data_type OWNER TO srv_dpmc;

--
-- Name: request_x_processing; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE request_x_processing (
    request integer NOT NULL,
    processing integer NOT NULL
);


ALTER TABLE internal.request_x_processing OWNER TO srv_dpmc;

--
-- Name: request_x_product; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE request_x_product (
    request integer NOT NULL,
    product integer NOT NULL
);


ALTER TABLE internal.request_x_product OWNER TO srv_dpmc;

--
-- Name: requester; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE requester (
    id integer DEFAULT nextval(('internal.requester_seq'::text)::regclass) NOT NULL,
    name character varying(255) NOT NULL,
    group_name character varying(255),
    email character varying(255),
    address character varying(200),
    login character varying(20) NOT NULL,
    password character varying(20),
    media_catalog integer,
    ftp_login character varying(255),
    ftp_password character varying(255),
    ftp_server character varying(255),
    ftp_directory character varying(255)
);


ALTER TABLE internal.requester OWNER TO srv_dpmc;

--
-- Name: requester_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE requester_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE internal.requester_seq OWNER TO srv_dpmc;

--
-- Name: satellite; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE satellite (
    id integer NOT NULL,
    acronym character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    launch_date_time timestamp without time zone NOT NULL
);


ALTER TABLE internal.satellite OWNER TO srv_dpmc;

--
-- Name: satellite_phase; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE satellite_phase (
    id integer NOT NULL,
    satellite_id integer NOT NULL,
    start_date_time timestamp without time zone NOT NULL,
    stop_date_time timestamp without time zone NOT NULL,
    first_cycle integer NOT NULL,
    cycle_length integer NOT NULL,
    first_absolute_orbit integer NOT NULL,
    first_relative_orbit integer NOT NULL
);


ALTER TABLE internal.satellite_phase OWNER TO srv_dpmc;

--
-- Name: server_account; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE server_account (
    id integer DEFAULT nextval(('internal.server_account_seq'::text)::regclass) NOT NULL,
    server_name character varying(255),
    login character varying(255),
    password character varying(255),
    server_type character varying(10)
);


ALTER TABLE internal.server_account OWNER TO srv_dpmc;

--
-- Name: server_account_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE server_account_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE internal.server_account_seq OWNER TO srv_dpmc;

SET default_with_oids = false;

--
-- Name: site_coverage; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE site_coverage (
    site integer NOT NULL,
    satellite integer NOT NULL,
    instrument integer NOT NULL,
    relative_orbit_number integer NOT NULL,
    start_anx_interval interval NOT NULL,
    stop_anx_interval interval NOT NULL
);


ALTER TABLE internal.site_coverage OWNER TO srv_dpmc;

--
-- Name: software_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE software_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE internal.software_seq OWNER TO srv_dpmc;

SET default_with_oids = true;

--
-- Name: software_x_binary; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE software_x_binary (
    software_id integer NOT NULL,
    rank integer NOT NULL,
    binary_name character varying NOT NULL
);


ALTER TABLE internal.software_x_binary OWNER TO srv_dpmc;

--
-- Name: software_x_product_type; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE software_x_product_type (
    product_type integer NOT NULL,
    software integer NOT NULL
);


ALTER TABLE internal.software_x_product_type OWNER TO srv_dpmc;

--
-- Name: state_vector; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE state_vector (
    satellite integer NOT NULL,
    absolute_orbit_number integer NOT NULL,
    date_time timestamp without time zone NOT NULL,
    delta_ut1 double precision NOT NULL,
    x_position double precision NOT NULL,
    y_position double precision NOT NULL,
    z_position double precision NOT NULL,
    x_velocity double precision NOT NULL,
    y_velocity double precision NOT NULL,
    z_velocity double precision NOT NULL,
    source integer NOT NULL,
    id integer DEFAULT nextval(('internal.state_vector_seq'::text)::regclass) NOT NULL,
    CONSTRAINT state_vector_absolute_orbit_number CHECK ((absolute_orbit_number >= 0))
);


ALTER TABLE internal.state_vector OWNER TO srv_dpmc;

--
-- Name: state_vector_source; Type: TABLE; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE state_vector_source (
    product_type integer NOT NULL,
    code character varying(2) NOT NULL,
    confidency_rank smallint NOT NULL,
    at_anx boolean NOT NULL
);


ALTER TABLE internal.state_vector_source OWNER TO srv_dpmc;

--
-- Name: temp_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE temp_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE internal.temp_seq OWNER TO srv_dpmc;

SET search_path = lta, pg_catalog;

SET default_with_oids = false;

--
-- Name: abort; Type: TABLE; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE abort (
    transaction_id integer NOT NULL,
    comment character varying,
    received_id integer NOT NULL
);


ALTER TABLE lta.abort OWNER TO srv_dpmc;

--
-- Name: direct; Type: TABLE; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE direct (
    transaction_id integer NOT NULL,
    product_name character varying NOT NULL,
    filesize bigint NOT NULL
);


ALTER TABLE lta.direct OWNER TO srv_dpmc;

--
-- Name: transaction; Type: TABLE; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE transaction (
    id integer NOT NULL,
    transaction_name character varying(30) NOT NULL,
    received_date timestamp without time zone NOT NULL,
    status enum_transaction_status,
    client_name character varying NOT NULL,
    request_outcome boolean,
    reason character varying,
    retry_after integer
);


ALTER TABLE lta.transaction OWNER TO srv_dpmc;

--
-- Name: active_transactions; Type: VIEW; Schema: lta; Owner: srv_dpmc
--

CREATE VIEW active_transactions AS
 SELECT t.id,
    t.transaction_name,
    t.received_date,
    t.status,
    t.client_name,
    t.request_outcome,
    t.reason,
    t.retry_after,
    d.transaction_id,
    d.product_name,
    d.filesize
   FROM transaction t,
    direct d
  WHERE ((t.id = d.transaction_id) AND (((t.status = 'NEW'::enum_transaction_status) OR (t.status = 'PENDING'::enum_transaction_status)) OR (t.status = 'ACTIVE'::enum_transaction_status)));


ALTER TABLE lta.active_transactions OWNER TO srv_dpmc;

SET default_with_oids = true;

--
-- Name: archive; Type: TABLE; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE archive (
    primary_id integer NOT NULL,
    secondary_id integer NOT NULL
);


ALTER TABLE lta.archive OWNER TO srv_dpmc;

SET default_with_oids = false;

--
-- Name: check; Type: TABLE; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE "check" (
    transaction_id integer NOT NULL,
    comment character varying,
    received_id integer NOT NULL
);


ALTER TABLE lta."check" OWNER TO srv_dpmc;

--
-- Name: delete; Type: TABLE; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE delete (
    transaction_id integer NOT NULL,
    product_list character varying,
    product_regex character varying,
    start_date timestamp without time zone,
    stop_date timestamp without time zone,
    status_input enum_product_status
);


ALTER TABLE lta.delete OWNER TO srv_dpmc;

--
-- Name: global; Type: TABLE; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE global (
    id integer NOT NULL,
    param character varying NOT NULL,
    value character varying NOT NULL
);


ALTER TABLE lta.global OWNER TO srv_dpmc;

--
-- Name: global_id_seq; Type: SEQUENCE; Schema: lta; Owner: srv_dpmc
--

CREATE SEQUENCE global_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE lta.global_id_seq OWNER TO srv_dpmc;

--
-- Name: global_id_seq; Type: SEQUENCE OWNED BY; Schema: lta; Owner: srv_dpmc
--

ALTER SEQUENCE global_id_seq OWNED BY global.id;


--
-- Name: ingestion; Type: TABLE; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE ingestion (
    transaction_id integer NOT NULL,
    product_name character varying,
    filesize bigint NOT NULL,
    url character varying NOT NULL
);


ALTER TABLE lta.ingestion OWNER TO srv_dpmc;

--
-- Name: product_status; Type: TABLE; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE product_status (
    id integer NOT NULL,
    product_id integer NOT NULL,
    transaction_id integer DEFAULT 0 NOT NULL,
    status enum_product_status,
    status_date timestamp without time zone,
    reason character varying
);


ALTER TABLE lta.product_status OWNER TO srv_dpmc;

--
-- Name: last_products_status; Type: VIEW; Schema: lta; Owner: srv_dpmc
--

CREATE VIEW last_products_status AS
 SELECT DISTINCT ON (p.id) p.id AS product_id,
    p.product_type,
    p.size,
    p.name,
    ps.status,
    ps.status_date,
    ps.reason,
    t.id AS transaction_id,
    t.transaction_name,
    t.received_date,
    t.status AS transaction_status,
    t.client_name
   FROM internal.product p,
    product_status ps,
    transaction t
  WHERE ((p.id = ps.product_id) AND (t.id = ps.transaction_id))
  ORDER BY p.id, ps.id DESC;


ALTER TABLE lta.last_products_status OWNER TO srv_dpmc;

--
-- Name: monitoring; Type: TABLE; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE monitoring (
    transaction_id integer NOT NULL,
    year integer,
    month integer
);


ALTER TABLE lta.monitoring OWNER TO srv_dpmc;

--
-- Name: not_archived_products; Type: VIEW; Schema: lta; Owner: srv_dpmc
--

CREATE VIEW not_archived_products AS
 SELECT lps.product_id,
    lps.product_type,
    lps.size,
    lps.name,
    lps.status,
    lps.status_date,
    lps.reason,
    lps.transaction_id,
    lps.transaction_name,
    lps.received_date,
    lps.transaction_status,
    lps.client_name
   FROM last_products_status lps
  WHERE (lps.status <> 'ARCHIVED'::enum_product_status);


ALTER TABLE lta.not_archived_products OWNER TO srv_dpmc;

--
-- Name: product_status_id_seq; Type: SEQUENCE; Schema: lta; Owner: srv_dpmc
--

CREATE SEQUENCE product_status_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE lta.product_status_id_seq OWNER TO srv_dpmc;

--
-- Name: product_status_id_seq; Type: SEQUENCE OWNED BY; Schema: lta; Owner: srv_dpmc
--

ALTER SEQUENCE product_status_id_seq OWNED BY product_status.id;


--
-- Name: query; Type: TABLE; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE query (
    transaction_id integer NOT NULL,
    product_list character varying,
    product_regex character varying,
    start_date timestamp without time zone,
    stop_date timestamp without time zone,
    status_input enum_product_status
);


ALTER TABLE lta.query OWNER TO srv_dpmc;

--
-- Name: retrieval; Type: TABLE; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE retrieval (
    transaction_id integer NOT NULL,
    product_name character varying NOT NULL,
    url character varying NOT NULL,
    filesize bigint
);


ALTER TABLE lta.retrieval OWNER TO srv_dpmc;

--
-- Name: transaction_id_seq; Type: SEQUENCE; Schema: lta; Owner: srv_dpmc
--

CREATE SEQUENCE transaction_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE lta.transaction_id_seq OWNER TO srv_dpmc;

--
-- Name: transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: lta; Owner: srv_dpmc
--

ALTER SEQUENCE transaction_id_seq OWNED BY transaction.id;


--
-- Name: transaction_type; Type: TABLE; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE transaction_type (
    id integer NOT NULL,
    transaction_name character varying NOT NULL,
    xml_name character varying
);


ALTER TABLE lta.transaction_type OWNER TO srv_dpmc;

--
-- Name: transaction_type_id_seq; Type: SEQUENCE; Schema: lta; Owner: srv_dpmc
--

CREATE SEQUENCE transaction_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE lta.transaction_type_id_seq OWNER TO srv_dpmc;

--
-- Name: transaction_type_id_seq; Type: SEQUENCE OWNED BY; Schema: lta; Owner: srv_dpmc
--

ALTER SEQUENCE transaction_type_id_seq OWNED BY transaction_type.id;


--
-- Name: transaction_type_x_request; Type: TABLE; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE transaction_type_x_request (
    id integer DEFAULT nextval(('lta.transaction_type_x_request_id_seq'::text)::regclass) NOT NULL,
    transaction_name character varying NOT NULL,
    request_id integer,
    comment character varying(30)
);


ALTER TABLE lta.transaction_type_x_request OWNER TO srv_dpmc;

--
-- Name: transaction_type_x_request_id_seq; Type: SEQUENCE; Schema: lta; Owner: srv_dpmc
--

CREATE SEQUENCE transaction_type_x_request_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER TABLE lta.transaction_type_x_request_id_seq OWNER TO srv_dpmc;

--
-- Name: transactions_details; Type: VIEW; Schema: lta; Owner: srv_dpmc
--

CREATE VIEW transactions_details AS
 SELECT t.id,
    t.transaction_name,
    d.product_name,
    d.filesize,
    t.received_date,
    t.status,
    t.reason,
    t.client_name
   FROM transaction t,
    direct d
  WHERE (t.id = d.transaction_id)
  ORDER BY t.received_date;


ALTER TABLE lta.transactions_details OWNER TO srv_dpmc;

SET search_path = processing, pg_catalog;

SET default_with_oids = true;

--
-- Name: hosts; Type: TABLE; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE hosts (
    host_id integer DEFAULT nextval(('processing.processing_hosts_host_id'::text)::regclass) NOT NULL,
    hostname character varying NOT NULL,
    ncpu smallint,
    bogomips double precision,
    nice smallint,
    os_type character varying,
    os_version double precision,
    processing_dir character varying,
    available boolean DEFAULT false,
    ip_address character varying(15),
    cache_dir character varying,
    ram integer,
    nb_cores integer
);


ALTER TABLE processing.hosts OWNER TO srv_dpmc;

--
-- Name: top; Type: TABLE; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE top (
    batch_id integer NOT NULL,
    hostname_id integer,
    started timestamp without time zone,
    pid integer
);


ALTER TABLE processing.top OWNER TO srv_dpmc;

--
-- Name: available_hosts; Type: VIEW; Schema: processing; Owner: srv_dpmc
--

CREATE VIEW available_hosts AS
 SELECT ((hosts.ncpu)::integer -
        CASE
            WHEN (temp_used_processor.occ IS NOT NULL) THEN temp_used_processor.occ
            WHEN (0 IS NOT NULL) THEN (0)::bigint
            ELSE NULL::bigint
        END) AS ncpu_available,
    hosts.hostname
   FROM (( SELECT top.hostname_id,
            count(*) AS occ
           FROM top
          GROUP BY top.hostname_id) temp_used_processor
     RIGHT JOIN hosts ON ((temp_used_processor.hostname_id = hosts.host_id)))
  WHERE ((((hosts.ncpu)::integer -
        CASE
            WHEN (temp_used_processor.occ IS NOT NULL) THEN temp_used_processor.occ
            WHEN (0 IS NOT NULL) THEN (0)::bigint
            ELSE NULL::bigint
        END) <> 0) AND (hosts.available = true))
  ORDER BY hosts.bogomips DESC;


ALTER TABLE processing.available_hosts OWNER TO srv_dpmc;

--
-- Name: batch; Type: TABLE; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE batch (
    batch_id integer DEFAULT nextval(('processing.processing_batch_batch_id'::text)::regclass) NOT NULL,
    file_input_id integer NOT NULL,
    processing_set_id integer NOT NULL,
    state character varying DEFAULT 'Planned'::character varying,
    output_dir character varying,
    request_id integer NOT NULL,
    output_media_catalog integer
);


ALTER TABLE processing.batch OWNER TO srv_dpmc;

--
-- Name: batch_x_product; Type: TABLE; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE batch_x_product (
    batch integer NOT NULL,
    product integer NOT NULL
);


ALTER TABLE processing.batch_x_product OWNER TO srv_dpmc;

--
-- Name: cache_lock; Type: TABLE; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE cache_lock (
    id integer DEFAULT nextval(('processing.cache_lock_seq'::text)::regclass) NOT NULL,
    product_id integer NOT NULL,
    server_id integer NOT NULL,
    batch_id integer NOT NULL
);


ALTER TABLE processing.cache_lock OWNER TO srv_dpmc;

--
-- Name: cache_lock_seq; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

CREATE SEQUENCE cache_lock_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE processing.cache_lock_seq OWNER TO srv_dpmc;

--
-- Name: history; Type: TABLE; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE history (
    history_id integer DEFAULT nextval(('processing.history_history_id'::text)::regclass) NOT NULL,
    processing_set_id integer,
    host_id integer,
    started timestamp without time zone,
    ended timestamp without time zone,
    file_input_id integer,
    request_id integer,
    batch_id integer,
    state character varying,
    output_dir character varying(255),
    software_id integer,
    auxiliary_configuration_id integer,
    processing_comment_id integer,
    tag character varying,
    processing_configuration_id integer,
    log_file character varying,
    batch_parameters json
);


ALTER TABLE processing.history OWNER TO srv_dpmc;

--
-- Name: history_history_id; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

CREATE SEQUENCE history_history_id
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE processing.history_history_id OWNER TO srv_dpmc;

--
-- Name: history_x_product; Type: TABLE; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE history_x_product (
    history integer NOT NULL,
    product integer NOT NULL
);


ALTER TABLE processing.history_x_product OWNER TO srv_dpmc;

SET default_with_oids = false;

--
-- Name: hosts_comment; Type: TABLE; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE hosts_comment (
    host_id integer NOT NULL,
    description character varying
);


ALTER TABLE processing.hosts_comment OWNER TO srv_dpmc;

SET default_with_oids = true;

--
-- Name: mutex; Type: TABLE; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE mutex (
    hosts integer NOT NULL,
    proc character varying NOT NULL,
    mutex integer DEFAULT 1
);


ALTER TABLE processing.mutex OWNER TO srv_dpmc;

--
-- Name: output_file; Type: TABLE; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE output_file (
    directory_name character varying(255) NOT NULL,
    file_name character varying(255) NOT NULL,
    date_time timestamp without time zone NOT NULL,
    batch_id integer
);


ALTER TABLE processing.output_file OWNER TO srv_dpmc;

--
-- Name: parameters_comment; Type: TABLE; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE parameters_comment (
    id integer NOT NULL,
    pcomment character varying
);


ALTER TABLE processing.parameters_comment OWNER TO srv_dpmc;

--
-- Name: parameters_set; Type: TABLE; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE parameters_set (
    id integer NOT NULL,
    keyword_index integer NOT NULL,
    keyword character varying,
    value character varying
);


ALTER TABLE processing.parameters_set OWNER TO srv_dpmc;

--
-- Name: pool_x_hosts; Type: TABLE; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE pool_x_hosts (
    pool integer NOT NULL,
    hosts integer NOT NULL
);


ALTER TABLE processing.pool_x_hosts OWNER TO srv_dpmc;

--
-- Name: processing_batch_batch_id; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

CREATE SEQUENCE processing_batch_batch_id
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE processing.processing_batch_batch_id OWNER TO srv_dpmc;

--
-- Name: processing_comment_x_product_type; Type: TABLE; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE processing_comment_x_product_type (
    processing_comment integer NOT NULL,
    product_type integer NOT NULL,
    is_input boolean DEFAULT false
);


ALTER TABLE processing.processing_comment_x_product_type OWNER TO srv_dpmc;

--
-- Name: processing_hosts_host_id; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

CREATE SEQUENCE processing_hosts_host_id
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE processing.processing_hosts_host_id OWNER TO srv_dpmc;

--
-- Name: processing_pool_id; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

CREATE SEQUENCE processing_pool_id
    START WITH 10
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE processing.processing_pool_id OWNER TO srv_dpmc;

--
-- Name: processing_type; Type: TABLE; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE processing_type (
    id integer NOT NULL,
    s_type character varying
);


ALTER TABLE processing.processing_type OWNER TO srv_dpmc;

--
-- Name: queued_generic_batch; Type: VIEW; Schema: processing; Owner: srv_dpmc
--

CREATE VIEW queued_generic_batch AS
 SELECT b.batch_id,
    pa.value AS generic_command,
    r.submission_date_time,
    r.pool
   FROM batch b,
    parameters_set pa,
    internal.request r
  WHERE ((((b.request_id = r.id) AND (pa.id = b.batch_id)) AND (r.id = 0)) AND ((b.state)::text ~~ 'Queued'::text));


ALTER TABLE processing.queued_generic_batch OWNER TO srv_dpmc;

--
-- Name: VIEW queued_generic_batch; Type: COMMENT; Schema: processing; Owner: srv_dpmc
--

COMMENT ON VIEW queued_generic_batch IS 'give the list of waiting generic batches';


--
-- Name: running_generic_batch; Type: VIEW; Schema: processing; Owner: srv_dpmc
--

CREATE VIEW running_generic_batch AS
 SELECT b.batch_id,
    pa.value AS generic_command,
    r.submission_date_time,
    r.pool
   FROM batch b,
    parameters_set pa,
    internal.request r
  WHERE ((((b.request_id = r.id) AND (pa.id = b.batch_id)) AND (r.id = 0)) AND ((b.state)::text ~~ 'Running'::text));


ALTER TABLE processing.running_generic_batch OWNER TO srv_dpmc;

--
-- Name: waiting_batch; Type: VIEW; Schema: processing; Owner: srv_dpmc
--

CREATE VIEW waiting_batch AS
 SELECT b.batch_id,
    b.output_dir,
    ps.function_name AS processing_scripts,
    pro.name AS product_input,
    pt.acronym,
    s.name AS soft_name,
    s.version AS soft_version,
    a.name AS aux_conf_name,
    pc.pcomment,
    r.id AS request_id,
    r.min_date_time,
    r.submission_date_time,
    r.pool
   FROM batch b,
    internal.request r,
    processing_set ps,
    internal.product pro,
    internal.product_type pt,
    internal.software s,
    internal.auxiliary_configuration a,
    processing_comment pc
  WHERE ((((((((b.request_id = r.id) AND (b.processing_set_id = ps.id)) AND (b.file_input_id = pro.id)) AND (r.product_type = pt.id)) AND (r.software = s.id)) AND (r.auxiliary_configuration = a.id)) AND (r.processing_comment = pc.id)) AND ((b.state)::text ~~ 'Waiting for input'::text));


ALTER TABLE processing.waiting_batch OWNER TO srv_dpmc;

--
-- Name: VIEW waiting_batch; Type: COMMENT; Schema: processing; Owner: srv_dpmc
--

COMMENT ON VIEW waiting_batch IS 'give information on the batchs in the state "waiting for input" ';


--
-- Name: waiting_generic_batchs; Type: VIEW; Schema: processing; Owner: srv_dpmc
--

CREATE VIEW waiting_generic_batchs AS
 SELECT b.batch_id,
    pa.value AS generic_command,
    r.submission_date_time,
    r.pool
   FROM batch b,
    parameters_set pa,
    internal.request r
  WHERE ((((b.request_id = r.id) AND (pa.id = b.batch_id)) AND (r.id = 0)) AND ((b.state)::text ~~ 'Waiting for input'::text));


ALTER TABLE processing.waiting_generic_batchs OWNER TO srv_dpmc;

--
-- Name: VIEW waiting_generic_batchs; Type: COMMENT; Schema: processing; Owner: srv_dpmc
--

COMMENT ON VIEW waiting_generic_batchs IS 'give information on the generic batchs in the state "waiting for input" ';


SET search_path = public, pg_catalog;

--
-- Name: active_transactions; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW active_transactions AS
 SELECT t.id,
    t.transaction_name,
    t.received_date,
    t.status,
    t.client_name,
    t.request_outcome,
    t.reason,
    t.retry_after,
    d.transaction_id,
    d.product_name,
    d.filesize
   FROM lta.transaction t,
    lta.direct d
  WHERE ((t.id = d.transaction_id) AND (((t.status = 'NEW'::lta.enum_transaction_status) OR (t.status = 'PENDING'::lta.enum_transaction_status)) OR (t.status = 'ACTIVE'::lta.enum_transaction_status)));


ALTER TABLE public.active_transactions OWNER TO srv_dpmc;

SET default_with_oids = false;

--
-- Name: anomalies_sat; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE anomalies_sat (
    doc_source character varying,
    unavailability character varying,
    type character varying,
    instrument character varying,
    subsystem character varying,
    start_time timestamp without time zone NOT NULL,
    stop_time timestamp without time zone NOT NULL,
    duration time without time zone,
    comments character varying
);


ALTER TABLE public.anomalies_sat OWNER TO postgres;

--
-- Name: archived_and_online; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW archived_and_online AS
 SELECT sm.name AS media_name,
    sm.id AS media_id,
    pxsm.product AS product_id,
    mce.name AS product_name,
    (((((m.name)::text || ('/'::character varying)::text) || (mc.name)::text) || ('/'::character varying)::text) || (mce.name)::text) AS path
   FROM internal.media sm,
    internal.product_x_sequential_media pxsm,
    internal.product_x_media_catalog_entry x,
    internal.media_catalog_entry mce,
    internal.media_catalog mc,
    internal.media m
  WHERE ((((((sm.id = pxsm.media) AND (pxsm.product = x.product)) AND (x.media_catalog_entry = mce.id)) AND (mc.id = mce.media_catalog)) AND (m.id = mc.media)) AND (EXISTS ( SELECT xx.media,
            xx."position",
            xx.product
           FROM internal.product_x_sequential_media xx
          WHERE ((xx.product = pxsm.product) AND (xx."position" >= 0)))));


ALTER TABLE public.archived_and_online OWNER TO srv_dpmc;

--
-- Name: batch; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW batch AS
 SELECT product.id AS product_id,
    product.name AS product_name,
    batch.state,
    batch.batch_id,
    batch.request_id
   FROM (processing.batch
     JOIN internal.product ON ((batch.file_input_id = product.id)));


ALTER TABLE public.batch OWNER TO srv_dpmc;

SET default_with_oids = true;

--
-- Name: check_adf; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE check_adf (
    processor_name character varying,
    index integer,
    rank integer,
    mode character varying,
    product_type character varying,
    selection_rule character varying,
    t1 real,
    t2 real,
    frequency integer,
    mandatory character varying,
    version_ipf character varying
);


ALTER TABLE public.check_adf OWNER TO postgres;

--
-- Name: detail_top; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW detail_top AS
 SELECT batch.batch_id AS batch,
    batch.request_id AS request,
    site.name AS site,
    product.name AS product,
    processing_comment.acronym AS chain,
    split_part((hosts.hostname)::text, '.'::text, 1) AS node,
    top.pid,
    date_trunc('seconds'::text, (now() - (top.started)::timestamp with time zone)) AS elapsed,
    batch.output_dir,
    (sp.stop_date_time - sp.start_date_time) AS duration
   FROM processing.top,
    processing.batch,
    processing.hosts,
    internal.request,
    internal.site,
    internal.product,
    processing.processing_comment,
    internal.sensing_product sp
  WHERE ((((((((batch.batch_id = top.batch_id) AND (hosts.host_id = top.hostname_id)) AND (request.id = batch.request_id)) AND (site.id = request.site)) AND (product.id = batch.file_input_id)) AND (processing_comment.id = batch.processing_set_id)) AND (batch.processing_set_id = 5)) AND (sp.product = product.id))
UNION
 SELECT batch.batch_id AS batch,
    batch.request_id AS request,
    site.name AS site,
    product.name AS product,
    processing_comment.acronym AS chain,
    split_part((hosts.hostname)::text, '.'::text, 1) AS node,
    top.pid,
    date_trunc('seconds'::text, (now() - (top.started)::timestamp with time zone)) AS elapsed,
    batch.output_dir,
    (sensing_product.stop_date_time - sensing_product.start_date_time) AS duration
   FROM processing.top,
    processing.batch,
    processing.hosts,
    internal.request,
    internal.site,
    internal.product,
    internal.sensing_product,
    processing.processing_comment,
    processing.parameters_set ps1,
    processing.parameters_set ps2
  WHERE (((((((((((((batch.batch_id = top.batch_id) AND (hosts.host_id = top.hostname_id)) AND (request.id = batch.request_id)) AND (site.id = request.site)) AND (product.id = batch.file_input_id)) AND (processing_comment.id = batch.processing_set_id)) AND (batch.processing_set_id >= 1)) AND (batch.processing_set_id <= 3)) AND (ps1.id = batch.batch_id)) AND (ps1.keyword_index = 1)) AND (ps2.id = batch.batch_id)) AND (ps2.keyword_index = 2)) AND (sensing_product.product = product.id));


ALTER TABLE public.detail_top OWNER TO srv_dpmc;

--
-- Name: detail_top_old; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW detail_top_old AS
 SELECT batch.batch_id AS batch,
    batch.request_id AS request,
    site.name AS site,
    product.name AS product,
    processing_comment.acronym AS chain,
    split_part((hosts.hostname)::text, '.'::text, 1) AS node,
    top.pid,
    date_trunc('seconds'::text, (now() - (top.started)::timestamp with time zone)) AS elapsed,
    batch.output_dir,
    ' '::character varying AS extra
   FROM ((((((processing.top
     JOIN processing.batch ON ((batch.batch_id = top.batch_id)))
     JOIN processing.hosts ON ((hosts.host_id = top.hostname_id)))
     JOIN internal.request ON ((request.id = batch.request_id)))
     JOIN internal.site ON ((site.id = request.site)))
     JOIN internal.product ON ((product.id = batch.file_input_id)))
     JOIN processing.processing_comment ON ((processing_comment.id = batch.processing_set_id)));


ALTER TABLE public.detail_top_old OWNER TO srv_dpmc;

--
-- Name: detail_top_s3; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW detail_top_s3 AS
 SELECT batch.batch_id AS batch,
    batch.request_id AS request,
    product.name AS product,
    processing_comment.acronym AS chain,
    (((software.name)::text || ' ; '::text) || request.auxiliary_configuration) AS software_aux_conf,
    hosts.host_id,
    date_trunc('seconds'::text, (now() - (top.started)::timestamp with time zone)) AS elapsed,
        CASE
            WHEN (parameters_set.value IS NULL) THEN 'No dataset out'::character varying
            ELSE parameters_set.value
        END AS dataset_out,
        CASE
            WHEN (parameters_set_2.value IS NULL) THEN 'No tag'::character varying
            ELSE parameters_set_2.value
        END AS history_tag
   FROM (((((((((processing.top
     JOIN processing.batch ON ((batch.batch_id = top.batch_id)))
     LEFT JOIN processing.parameters_set ON (((parameters_set.id = batch.batch_id) AND ((parameters_set.keyword)::text = 'dataset_out'::text))))
     LEFT JOIN processing.parameters_set parameters_set_2 ON (((parameters_set_2.id = batch.batch_id) AND ((parameters_set_2.keyword)::text = 'tag'::text))))
     JOIN processing.hosts ON ((hosts.host_id = top.hostname_id)))
     JOIN internal.request ON ((request.id = batch.request_id)))
     JOIN internal.product ON ((product.id = batch.file_input_id)))
     JOIN internal.software ON ((software.id = request.software)))
     JOIN internal.auxiliary_configuration ON ((auxiliary_configuration.id = request.auxiliary_configuration)))
     JOIN processing.processing_comment ON ((request.processing_comment = processing_comment.id)));


ALTER TABLE public.detail_top_s3 OWNER TO srv_dpmc;

--
-- Name: detail_top_s3_old; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW detail_top_s3_old AS
 SELECT batch.batch_id AS batch,
    batch.request_id AS request,
    site.name AS site,
    product.name AS product,
    processing_comment.acronym AS chain,
    software.name AS software,
    request.auxiliary_configuration AS aux_conf,
    hosts.host_id,
    top.pid,
    date_trunc('seconds'::text, (now() - (top.started)::timestamp with time zone)) AS elapsed,
    ' '::character varying AS extra
   FROM ((((((((processing.top
     JOIN processing.batch ON ((batch.batch_id = top.batch_id)))
     JOIN processing.hosts ON ((hosts.host_id = top.hostname_id)))
     JOIN internal.request ON ((request.id = batch.request_id)))
     JOIN internal.site ON ((site.id = request.site)))
     JOIN internal.product ON ((product.id = batch.file_input_id)))
     JOIN internal.software ON ((software.id = request.software)))
     JOIN internal.auxiliary_configuration ON ((auxiliary_configuration.id = request.auxiliary_configuration)))
     JOIN processing.processing_comment ON ((request.processing_comment = processing_comment.id)));


ALTER TABLE public.detail_top_s3_old OWNER TO srv_dpmc;

--
-- Name: disk_location; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW disk_location AS
 SELECT product.id AS product_id,
    product.name AS official_name,
    (((((media.name)::text || ('/'::character varying)::text) || (media_catalog.name)::text) || ('/'::character varying)::text) || (media_catalog_entry.name)::text) AS path,
    (((media.name)::text || ('/'::character varying)::text) || (media_catalog.name)::text) AS directory,
    media_catalog_entry.name AS file_name,
    media.id AS media,
    media_catalog.id AS media_catalog,
    media_catalog_entry.id AS media_catalog_entry
   FROM (((((internal.media_type
     JOIN internal.media ON ((media_type.id = media.media_type)))
     JOIN internal.media_catalog ON ((media_catalog.media = media.id)))
     JOIN internal.media_catalog_entry ON ((media_catalog_entry.media_catalog = media_catalog.id)))
     JOIN internal.product_x_media_catalog_entry ON ((product_x_media_catalog_entry.media_catalog_entry = media_catalog_entry.id)))
     JOIN internal.product ON ((product.id = product_x_media_catalog_entry.product)))
  WHERE ((NOT media_type.removable) AND (NOT media_type.sequential));


ALTER TABLE public.disk_location OWNER TO srv_dpmc;

--
-- Name: files_location; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW files_location AS
 SELECT product.id AS product_id,
    product.name AS official_name,
    (((((media.name)::text || ('/'::character varying)::text) || (media_catalog.name)::text) || ('/'::character varying)::text) || (media_catalog_entry.name)::text) AS disk_location
   FROM internal.product,
    internal.product_x_media_catalog_entry,
    internal.media_catalog_entry,
    internal.media_catalog,
    internal.media
  WHERE ((((product_x_media_catalog_entry.product = product.id) AND (product_x_media_catalog_entry.media_catalog_entry = media_catalog_entry.id)) AND (media_catalog_entry.media_catalog = media_catalog.id)) AND (media_catalog.media = media.id));


ALTER TABLE public.files_location OWNER TO srv_dpmc;

--
-- Name: files_location_in_cmg_project; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW files_location_in_cmg_project AS
 SELECT product.id AS product_id,
    product.name AS official_name,
    (((((media.name)::text || ('/'::character varying)::text) || (media_catalog.name)::text) || ('/'::character varying)::text) || (media_catalog_entry.name)::text) AS disk_location
   FROM internal.product,
    internal.product_x_media_catalog_entry,
    internal.media_catalog_entry,
    internal.media_catalog,
    internal.media
  WHERE (((((((product.name)::text !~~ 'GOM%.N1'::text) AND ((media.name)::text ~~ '/cmg_project%'::text)) AND (product_x_media_catalog_entry.product = product.id)) AND (product_x_media_catalog_entry.media_catalog_entry = media_catalog_entry.id)) AND (media_catalog_entry.media_catalog = media_catalog.id)) AND (media_catalog.media = media.id));


ALTER TABLE public.files_location_in_cmg_project OWNER TO srv_dpmc;

--
-- Name: VIEW files_location_in_cmg_project; Type: COMMENT; Schema: public; Owner: srv_dpmc
--

COMMENT ON VIEW files_location_in_cmg_project IS 'This view is used to get the pathnames of products stored in the /cmg_project directory
(GOM*.N1 products are also excluded to speed up the request)';


--
-- Name: files_path; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW files_path AS
 SELECT product.id AS product_id,
    (((((media.name)::text || ('/'::character varying)::text) || (media_catalog.name)::text) || ('/'::character varying)::text) || (media_catalog_entry.name)::text) AS disk_location
   FROM internal.product,
    internal.product_x_media_catalog_entry,
    internal.media_catalog_entry,
    internal.media_catalog,
    internal.media
  WHERE ((((product_x_media_catalog_entry.product = product.id) AND (product_x_media_catalog_entry.media_catalog_entry = media_catalog_entry.id)) AND (media_catalog_entry.media_catalog = media_catalog.id)) AND (media_catalog.media = media.id))
  ORDER BY product.id;


ALTER TABLE public.files_path OWNER TO srv_dpmc;

--
-- Name: hosts_current_ncpu; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW hosts_current_ncpu AS
 SELECT hosts.host_id,
    ((hosts.ncpu)::bigint - sum(
        CASE
            WHEN (top.hostname_id IS NULL) THEN 0
            ELSE 1
        END)) AS current_ncpu
   FROM (processing.hosts
     LEFT JOIN processing.top ON ((top.hostname_id = hosts.host_id)))
  GROUP BY hosts.host_id, hosts.ncpu;


ALTER TABLE public.hosts_current_ncpu OWNER TO srv_dpmc;

--
-- Name: image_request_x_product; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW image_request_x_product AS
 SELECT request.id AS request,
        CASE
            WHEN ((orbit.anx_date_time + site_coverage.start_anx_interval) > sensing_product.start_date_time) THEN (orbit.anx_date_time + site_coverage.start_anx_interval)
            ELSE sensing_product.start_date_time
        END AS start_date_time,
        CASE
            WHEN ((orbit.anx_date_time + site_coverage.stop_anx_interval) < sensing_product.stop_date_time) THEN (orbit.anx_date_time + site_coverage.stop_anx_interval)
            ELSE sensing_product.stop_date_time
        END AS stop_date_time,
    request.site,
    product.id AS product
   FROM internal.request,
    internal.site_coverage,
    internal.orbit,
    internal.sensing_product,
    internal.product,
    internal.mode_x_product_type,
    processing.processing_comment_x_product_type x
  WHERE ((((((((((((((((site_coverage.site = request.site) AND (orbit.satellite = site_coverage.satellite)) AND (orbit.cycle_relative_number = site_coverage.relative_orbit_number)) AND (sensing_product.start_absolute_orbit_number = orbit.absolute_number)) AND (sensing_product.start_date_time < (orbit.anx_date_time + site_coverage.stop_anx_interval))) AND ((orbit.anx_date_time + site_coverage.start_anx_interval) < sensing_product.stop_date_time)) AND (product.id = sensing_product.product)) AND (mode_x_product_type.product_type = product.product_type)) AND (mode_x_product_type.satellite = site_coverage.satellite)) AND (mode_x_product_type.instrument = site_coverage.instrument)) AND (request.min_date_time <= sensing_product.start_date_time)) AND (sensing_product.stop_date_time <= request.max_date_time)) AND (x.processing_comment = request.processing_comment)) AND x.is_input) AND (x.product_type = product.product_type)) AND (product.obsolescence_date_time IS NULL))
UNION
 SELECT request.id AS request,
    sensing_product.start_date_time,
    sensing_product.stop_date_time,
    request.site,
    product.id AS product
   FROM internal.global,
    internal.request,
    internal.sensing_product,
    internal.product,
    internal.mode_x_product_type,
    internal.imaging_instrument,
    processing.processing_comment_x_product_type xx
  WHERE (((((((((((request.site = global.global_site) AND (xx.processing_comment = request.processing_comment)) AND xx.is_input) AND (mode_x_product_type.satellite = imaging_instrument.satellite)) AND (mode_x_product_type.instrument = imaging_instrument.instrument)) AND (mode_x_product_type.product_type = product.product_type)) AND (xx.product_type = product.product_type)) AND (product.id = sensing_product.product)) AND (request.min_date_time < sensing_product.stop_date_time)) AND (sensing_product.start_date_time < request.max_date_time)) AND (product.obsolescence_date_time IS NULL));


ALTER TABLE public.image_request_x_product OWNER TO srv_dpmc;

--
-- Name: last_product; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW last_product AS
 SELECT product.id,
    product.name,
    files_location.disk_location
   FROM (internal.product
     JOIN files_location ON ((files_location.product_id = product.id)))
  WHERE (product.generation_date_time IS NOT NULL)
  ORDER BY product.generation_date_time DESC
 LIMIT 20;


ALTER TABLE public.last_product OWNER TO srv_dpmc;

SET default_with_oids = false;

--
-- Name: max_id_baseline; Type: TABLE; Schema: public; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE max_id_baseline (
    max integer
);


ALTER TABLE public.max_id_baseline OWNER TO srv_dpmc;

--
-- Name: media_current_capacity; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW media_current_capacity AS
 SELECT static.id,
    (static.current_capacity -
        CASE
            WHEN (dynamic.running_size IS NOT NULL) THEN dynamic.running_size
            WHEN (0 IS NOT NULL) THEN (0)::real
            ELSE NULL::real
        END) AS current_capacity
   FROM (( SELECT media.id,
            ((media.capacity - media.reserved_capacity) - (
                CASE
                    WHEN (sum(product.size) IS NOT NULL) THEN sum(product.size)
                    WHEN (0 IS NOT NULL) THEN (0)::numeric
                    ELSE NULL::numeric
                END)::double precision) AS current_capacity
           FROM (internal.media
             LEFT JOIN (((internal.media_catalog
             JOIN internal.media_catalog_entry ON ((media_catalog_entry.media_catalog = media_catalog.id)))
             JOIN internal.product_x_media_catalog_entry x ON ((media_catalog_entry.id = x.media_catalog_entry)))
             JOIN internal.product ON ((product.id = x.product))) ON ((media_catalog.media = media.id)))
          WHERE (media.media_type = 8)
          GROUP BY media.id, media.capacity, media.reserved_capacity) static
     LEFT JOIN ( SELECT media_catalog.media AS id,
            sum(product_type.mean_size) AS running_size
           FROM ((((processing.top
             JOIN processing.batch ON ((batch.batch_id = top.batch_id)))
             JOIN internal.media_catalog ON ((media_catalog.id = batch.output_media_catalog)))
             JOIN processing.processing_comment_x_product_type x ON (((NOT x.is_input) AND (x.processing_comment = batch.processing_set_id))))
             JOIN internal.product_type ON ((product_type.id = x.product_type)))
          GROUP BY media_catalog.media) dynamic ON ((static.id = dynamic.id)));


ALTER TABLE public.media_current_capacity OWNER TO srv_dpmc;

--
-- Name: media_current_physical_capacity; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW media_current_physical_capacity AS
 SELECT static.id,
    (static.current_capacity -
        CASE
            WHEN (dynamic.running_size IS NOT NULL) THEN dynamic.running_size
            WHEN (0 IS NOT NULL) THEN (0)::real
            ELSE NULL::real
        END) AS current_physical_capacity
   FROM (( SELECT media.id,
            (media.current_physical_capacity - media.reserved_capacity) AS current_capacity
           FROM internal.media
          WHERE (media.media_type = 8)) static
     LEFT JOIN ( SELECT media_catalog.media AS id,
            sum(product_type.mean_size) AS running_size
           FROM ((((processing.top
             JOIN processing.batch ON ((batch.batch_id = top.batch_id)))
             JOIN internal.media_catalog ON ((media_catalog.id = batch.output_media_catalog)))
             JOIN processing.processing_comment_x_product_type x ON (((NOT x.is_input) AND (x.processing_comment = batch.processing_set_id))))
             JOIN internal.product_type ON ((product_type.id = x.product_type)))
          GROUP BY media_catalog.media) dynamic ON ((static.id = dynamic.id)));


ALTER TABLE public.media_current_physical_capacity OWNER TO srv_dpmc;

--
-- Name: media_current_physical_capacity_with_count; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW media_current_physical_capacity_with_count AS
 SELECT static.id,
    (static.current_capacity -
        CASE
            WHEN (dynamic.running_size IS NOT NULL) THEN dynamic.running_size
            WHEN (0 IS NOT NULL) THEN (0)::real
            ELSE NULL::real
        END) AS current_physical_capacity,
        CASE
            WHEN (dynamic.running_count IS NOT NULL) THEN dynamic.running_count
            WHEN (0 IS NOT NULL) THEN (0)::bigint
            ELSE NULL::bigint
        END AS access_count
   FROM (( SELECT media.id,
            (media.current_physical_capacity - media.reserved_capacity) AS current_capacity
           FROM internal.media
          WHERE (media.media_type = 8)) static
     LEFT JOIN ( SELECT media_catalog.media AS id,
            sum(product_type.mean_size) AS running_size,
            count(DISTINCT top.batch_id) AS running_count
           FROM ((((processing.top
             JOIN processing.batch ON ((batch.batch_id = top.batch_id)))
             JOIN internal.media_catalog ON ((media_catalog.id = batch.output_media_catalog)))
             JOIN processing.processing_comment_x_product_type x ON (((NOT x.is_input) AND (x.processing_comment = batch.processing_set_id))))
             JOIN internal.product_type ON ((product_type.id = x.product_type)))
          GROUP BY media_catalog.media) dynamic ON ((static.id = dynamic.id)));


ALTER TABLE public.media_current_physical_capacity_with_count OWNER TO srv_dpmc;

SET default_with_oids = true;

--
-- Name: media_delivered; Type: TABLE; Schema: public; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE media_delivered (
    tag character varying NOT NULL,
    disk_type character varying NOT NULL,
    disk_name character varying NOT NULL,
    current_physical_capacity bigint DEFAULT 0,
    id integer NOT NULL
);


ALTER TABLE public.media_delivered OWNER TO srv_dpmc;

--
-- Name: media_delivered_id_seq; Type: SEQUENCE; Schema: public; Owner: srv_dpmc
--

CREATE SEQUENCE media_delivered_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.media_delivered_id_seq OWNER TO srv_dpmc;

--
-- Name: media_delivered_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: srv_dpmc
--

ALTER SEQUENCE media_delivered_id_seq OWNED BY media_delivered.id;


--
-- Name: media_running_size; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW media_running_size AS
 SELECT media_catalog.media AS id,
    sum(product_type.mean_size) AS running_size
   FROM ((((processing.top
     JOIN processing.batch ON ((batch.batch_id = top.batch_id)))
     JOIN internal.media_catalog ON ((media_catalog.id = batch.output_media_catalog)))
     JOIN processing.processing_comment_x_product_type x ON (((NOT x.is_input) AND (x.processing_comment = batch.processing_set_id))))
     JOIN internal.product_type ON ((product_type.id = x.product_type)))
  GROUP BY media_catalog.media;


ALTER TABLE public.media_running_size OWNER TO srv_dpmc;

--
-- Name: product_archive; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW product_archive AS
 SELECT product.id,
    product.name AS product,
    media.name AS media_name,
    product_x_sequential_media."position" AS media_index
   FROM internal.product,
    internal.product_x_sequential_media,
    internal.media
  WHERE ((product_x_sequential_media.product = product.id) AND (product_x_sequential_media.media = media.id));


ALTER TABLE public.product_archive OWNER TO srv_dpmc;

--
-- Name: missing_file_for_order; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW missing_file_for_order AS
 SELECT DISTINCT product_archive.id,
    product_archive.product,
    product_archive.media_name,
    product_archive.media_index
   FROM product_archive,
    processing.batch
  WHERE ((batch.file_input_id = product_archive.id) AND ((batch.state)::text = ('Waiting for input'::character varying)::text))
  ORDER BY product_archive.media_name, product_archive.media_index, product_archive.id, product_archive.product;


ALTER TABLE public.missing_file_for_order OWNER TO srv_dpmc;

--
-- Name: not_archived; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW not_archived AS
 SELECT files_location.product_id AS id,
    files_location.official_name AS name
   FROM (files_location
     LEFT JOIN product_archive ON ((files_location.product_id = product_archive.id)))
  WHERE ((product_archive.id IS NULL) AND ((files_location.official_name)::text ~~ 'MER_RR__0P%'::text));


ALTER TABLE public.not_archived OWNER TO srv_dpmc;

--
-- Name: overlap_product; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW overlap_product AS
 SELECT p1.id AS main_id,
    p1.name AS main_name,
    sp1.start_date_time AS main_start_date_time,
    p1.obsolescence_date_time AS main_obsolescence_date_time,
    sp1.stop_date_time AS main_stop_date_time,
    p2.id AS overlap_id,
    p2.name AS overlap_name,
    sp2.start_date_time AS overlap_start_date_time,
    sp2.stop_date_time AS overlap_stop_date_time,
    p2.obsolescence_date_time AS overlap_obsolescence_date_time
   FROM internal.product p1,
    internal.sensing_product sp1,
    internal.product p2,
    internal.sensing_product sp2
  WHERE (((((((p1.id <> p2.id) AND (p1.product_type = p2.product_type)) AND ("substring"((p1.name)::text, 11, 1) = "substring"((p2.name)::text, 11, 1))) AND (sp1.product = p1.id)) AND (sp2.product = p2.id)) AND (sp1.start_date_time < sp2.stop_date_time)) AND (sp2.start_date_time < sp1.stop_date_time));


ALTER TABLE public.overlap_product OWNER TO srv_dpmc;

SET default_with_oids = false;

--
-- Name: prd_external; Type: TABLE; Schema: public; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE prd_external (
    name character varying NOT NULL,
    start timestamp without time zone,
    stop timestamp without time zone,
    tag character varying NOT NULL
);


ALTER TABLE public.prd_external OWNER TO srv_dpmc;

--
-- Name: prd_geoloc; Type: TABLE; Schema: public; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE prd_geoloc (
    product_id integer NOT NULL,
    west real,
    east real,
    south real,
    north real,
    footprint character varying,
    center_lon real,
    center_lat real
);


ALTER TABLE public.prd_geoloc OWNER TO srv_dpmc;

SET default_with_oids = true;

--
-- Name: prd_md5; Type: TABLE; Schema: public; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE prd_md5 (
    product character varying,
    md5 character varying
);


ALTER TABLE public.prd_md5 OWNER TO srv_dpmc;

SET default_with_oids = false;

--
-- Name: prd_path; Type: TABLE; Schema: public; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE prd_path (
    path text
);


ALTER TABLE public.prd_path OWNER TO srv_dpmc;

--
-- Name: prd_period; Type: TABLE; Schema: public; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE prd_period (
    name character varying NOT NULL,
    start timestamp without time zone,
    stop timestamp without time zone
);


ALTER TABLE public.prd_period OWNER TO srv_dpmc;

--
-- Name: products_delivered; Type: TABLE; Schema: public; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE products_delivered (
    id integer NOT NULL,
    tag character varying NOT NULL,
    is_product_locked boolean DEFAULT false,
    product_id integer NOT NULL,
    disk_type character varying NOT NULL,
    disk_name character varying,
    product_size bigint DEFAULT 0,
    checksum_md5 text,
    creation_date timestamp without time zone,
    is_product_processed boolean DEFAULT false,
    copied_date timestamp without time zone,
    number_disk_copied integer DEFAULT 0,
    product_name character varying DEFAULT ''::character varying
);


ALTER TABLE public.products_delivered OWNER TO srv_dpmc;

--
-- Name: products_delivered_id_seq; Type: SEQUENCE; Schema: public; Owner: srv_dpmc
--

CREATE SEQUENCE products_delivered_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.products_delivered_id_seq OWNER TO srv_dpmc;

--
-- Name: products_delivered_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: srv_dpmc
--

ALTER SEQUENCE products_delivered_id_seq OWNED BY products_delivered.id;


--
-- Name: products_info; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW products_info AS
 SELECT p.name,
    p.size,
    ps.status,
    ps.status_date,
    p.id,
    pt.acronym AS product_type,
    p.generation_date_time,
    ps.reason
   FROM internal.product p,
    lta.product_status ps,
    internal.product_type pt
  WHERE ((p.id = ps.product_id) AND (p.product_type = pt.id));


ALTER TABLE public.products_info OWNER TO srv_dpmc;

--
-- Name: VIEW products_info; Type: COMMENT; Schema: public; Owner: srv_dpmc
--

COMMENT ON VIEW products_info IS 'Provides general information of referenced products';


--
-- Name: rectangular_site; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW rectangular_site AS
 SELECT site.id,
    site.name,
    site.min_latitude,
    site.min_longitude,
    site.max_latitude,
    site.max_longitude,
    site.min_point_count,
    site.point_count,
    site.owner,
    ((NOT (EXISTS ( SELECT request.id,
            request.site,
            request.requester,
            request.min_date_time,
            request.max_date_time,
            request.center,
            request.submission_date_time,
            request.answer_date_time,
            request.priority,
            request.lock,
            request.product_type,
            request.media_catalog
           FROM internal.request
          WHERE (request.site = site.id)))) AND ((requester.login)::text = (("current_user"())::character varying)::text)) AS updatable
   FROM internal.site,
    internal.rectangular_site,
    internal.requester
  WHERE ((requester.id = site.owner) AND (rectangular_site.site = site.id));


ALTER TABLE public.rectangular_site OWNER TO srv_dpmc;

--
-- Name: request; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW request AS
 SELECT request.id,
    request.site,
    request.min_date_time,
    request.max_date_time,
    request.center,
    request.submission_date_time,
    request.answer_date_time,
    request.priority,
    request.lock
   FROM internal.request,
    internal.requester
  WHERE (((requester.login)::text = (("current_user"())::character varying)::text) AND (request.requester = requester.id));


ALTER TABLE public.request OWNER TO srv_dpmc;

--
-- Name: request_x_product; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW request_x_product AS
 SELECT request.id AS request,
        CASE
            WHEN ((orbit.anx_date_time + site_coverage.start_anx_interval) > sensing_product.start_date_time) THEN (orbit.anx_date_time + site_coverage.start_anx_interval)
            ELSE sensing_product.start_date_time
        END AS start_date_time,
        CASE
            WHEN ((orbit.anx_date_time + site_coverage.stop_anx_interval) < sensing_product.stop_date_time) THEN (orbit.anx_date_time + site_coverage.stop_anx_interval)
            ELSE sensing_product.stop_date_time
        END AS stop_date_time,
    request.site,
    product.id AS product,
    product.product_type
   FROM internal.request,
    internal.site_coverage,
    internal.orbit,
    internal.sensing_product,
    internal.product,
    internal.mode_x_product_type
  WHERE ((((((((((((site_coverage.site = request.site) AND (orbit.satellite = site_coverage.satellite)) AND (orbit.cycle_relative_number = site_coverage.relative_orbit_number)) AND (sensing_product.start_absolute_orbit_number = orbit.absolute_number)) AND (sensing_product.start_date_time < (orbit.anx_date_time + site_coverage.stop_anx_interval))) AND ((orbit.anx_date_time + site_coverage.start_anx_interval) < sensing_product.stop_date_time)) AND (product.id = sensing_product.product)) AND (mode_x_product_type.product_type = product.product_type)) AND (mode_x_product_type.satellite = site_coverage.satellite)) AND (mode_x_product_type.instrument = site_coverage.instrument)) AND (request.min_date_time <= sensing_product.start_date_time)) AND (sensing_product.stop_date_time <= request.max_date_time));


ALTER TABLE public.request_x_product OWNER TO srv_dpmc;

--
-- Name: runnable_batch; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW runnable_batch AS
 SELECT batch.batch_id,
    hosts.host_id,
    hosts.bogomips,
    hosts_current_ncpu.current_ncpu
   FROM hosts_current_ncpu,
    processing.hosts,
    processing.pool_x_hosts,
    internal.request,
    processing.batch
  WHERE (((((((hosts_current_ncpu.current_ncpu > 0) AND hosts.available) AND ((batch.state)::text = ('Queued'::character varying)::text)) AND (hosts.host_id = hosts_current_ncpu.host_id)) AND (pool_x_hosts.hosts = hosts.host_id)) AND (request.pool = pool_x_hosts.pool)) AND (batch.request_id = request.id));


ALTER TABLE public.runnable_batch OWNER TO srv_dpmc;

--
-- Name: running_job; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW running_job AS
 SELECT batch.batch_id AS batch,
    product.name AS product_name,
    batch.output_dir AS output_directory,
    batch.request_id AS request
   FROM processing.batch,
    internal.product
  WHERE (((batch.state)::text = ('Running'::character varying)::text) AND (batch.file_input_id = product.id));


ALTER TABLE public.running_job OWNER TO srv_dpmc;

--
-- Name: seq_test_quantum; Type: SEQUENCE; Schema: public; Owner: srv_dpmc
--

CREATE SEQUENCE seq_test_quantum
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.seq_test_quantum OWNER TO srv_dpmc;

--
-- Name: test; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE test (
    id integer,
    name character varying
);


ALTER TABLE public.test OWNER TO postgres;

SET search_path = s3ome, pg_catalog;

--
-- Name: ext_product; Type: TABLE; Schema: s3ome; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE ext_product (
    name character varying,
    start_date timestamp without time zone,
    stop_date timestamp without time zone,
    tag character varying
);


ALTER TABLE s3ome.ext_product OWNER TO srv_dpmc;

--
-- Name: hsm_copy; Type: TABLE; Schema: s3ome; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE hsm_copy (
    product_id integer NOT NULL,
    product_name character varying,
    cdate timestamp without time zone
);


ALTER TABLE s3ome.hsm_copy OWNER TO srv_dpmc;

--
-- Name: media; Type: TABLE; Schema: s3ome; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE media (
    id integer NOT NULL,
    media_type integer NOT NULL,
    name character varying(255) NOT NULL,
    capacity double precision,
    comment character varying(255),
    recipient integer
);


ALTER TABLE s3ome.media OWNER TO srv_dpmc;

--
-- Name: product_x_media; Type: TABLE; Schema: s3ome; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE product_x_media (
    media integer NOT NULL,
    path character varying NOT NULL,
    md5 character varying,
    size bigint,
    checked boolean
);


ALTER TABLE s3ome.product_x_media OWNER TO srv_dpmc;

--
-- Name: viscal_info; Type: TABLE; Schema: s3ome; Owner: srv_dpmc; Tablespace: 
--

CREATE TABLE viscal_info (
    abs_orbit integer NOT NULL,
    start_time timestamp without time zone,
    stop_time timestamp without time zone,
    satellite integer NOT NULL
);


ALTER TABLE s3ome.viscal_info OWNER TO srv_dpmc;

--
-- Name: TABLE viscal_info; Type: COMMENT; Schema: s3ome; Owner: srv_dpmc
--

COMMENT ON TABLE viscal_info IS 'Contains start and stop time of the time range per orbit where calibration occurs';


SET search_path = lta, pg_catalog;

--
-- Name: id; Type: DEFAULT; Schema: lta; Owner: srv_dpmc
--

ALTER TABLE ONLY global ALTER COLUMN id SET DEFAULT nextval('global_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: lta; Owner: srv_dpmc
--

ALTER TABLE ONLY product_status ALTER COLUMN id SET DEFAULT nextval('product_status_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: lta; Owner: srv_dpmc
--

ALTER TABLE ONLY transaction ALTER COLUMN id SET DEFAULT nextval('transaction_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: lta; Owner: srv_dpmc
--

ALTER TABLE ONLY transaction_type ALTER COLUMN id SET DEFAULT nextval('transaction_type_id_seq'::regclass);


SET search_path = public, pg_catalog;

--
-- Name: id; Type: DEFAULT; Schema: public; Owner: srv_dpmc
--

ALTER TABLE ONLY media_delivered ALTER COLUMN id SET DEFAULT nextval('media_delivered_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: srv_dpmc
--

ALTER TABLE ONLY products_delivered ALTER COLUMN id SET DEFAULT nextval('products_delivered_id_seq'::regclass);


SET search_path = internal, pg_catalog;

--
-- Name: acquisition_chain_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY acquisition_chain
    ADD CONSTRAINT acquisition_chain_pkey PRIMARY KEY (product, center);


--
-- Name: acquisition_chain_product_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY acquisition_chain
    ADD CONSTRAINT acquisition_chain_product_key UNIQUE (product, center_rank);


--
-- Name: auxiliary_configuration_detail_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY auxiliary_configuration_detail
    ADD CONSTRAINT auxiliary_configuration_detail_pkey PRIMARY KEY (configuration, product_type);


--
-- Name: auxiliary_configuration_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY auxiliary_configuration
    ADD CONSTRAINT auxiliary_configuration_name_key UNIQUE (name);


--
-- Name: auxiliary_configuration_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY auxiliary_configuration
    ADD CONSTRAINT auxiliary_configuration_pkey PRIMARY KEY (id);


--
-- Name: baseline2_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY adf_baseline
    ADD CONSTRAINT baseline2_pkey PRIMARY KEY (aux_id);


--
-- Name: center_code_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY center
    ADD CONSTRAINT center_code_key UNIQUE (name);


--
-- Name: center_code_product_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY center
    ADD CONSTRAINT center_code_product_name_key UNIQUE (code_in_product_name);


--
-- Name: center_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY center
    ADD CONSTRAINT center_name_key UNIQUE (code);


--
-- Name: center_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY center
    ADD CONSTRAINT center_pkey PRIMARY KEY (id);


--
-- Name: center_x_software_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY center_x_software
    ADD CONSTRAINT center_x_software_pkey PRIMARY KEY (center, software);


--
-- Name: communication_request_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY communication_request
    ADD CONSTRAINT communication_request_pkey PRIMARY KEY (request);


--
-- Name: ct_unique_requester_name; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY requester
    ADD CONSTRAINT ct_unique_requester_name UNIQUE (name);


--
-- Name: data_type_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY data_type
    ADD CONSTRAINT data_type_pkey PRIMARY KEY (id);


--
-- Name: dataset_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY dataset
    ADD CONSTRAINT dataset_name_key UNIQUE (name);


--
-- Name: dataset_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY dataset
    ADD CONSTRAINT dataset_pkey PRIMARY KEY (id);


--
-- Name: dataset_x_dataset_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY dataset_x_dataset
    ADD CONSTRAINT dataset_x_dataset_pkey PRIMARY KEY (master_dataset_id, sub_dataset_id);


--
-- Name: dataset_x_product_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY dataset_x_product
    ADD CONSTRAINT dataset_x_product_pkey PRIMARY KEY (dataset_id, product_id);


--
-- Name: default_center_x_product_type_software_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY default_center_x_product_type_software
    ADD CONSTRAINT default_center_x_product_type_software_pkey PRIMARY KEY (center, product_type);


--
-- Name: document_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY document
    ADD CONSTRAINT document_name_key UNIQUE (name);


--
-- Name: document_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY document
    ADD CONSTRAINT document_pkey PRIMARY KEY (id);


--
-- Name: error_type_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY error_type
    ADD CONSTRAINT error_type_pkey PRIMARY KEY (id);


--
-- Name: error_type_x_product_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY error_type_x_product
    ADD CONSTRAINT error_type_x_product_pkey PRIMARY KEY (error_type, product);


--
-- Name: first_nadir_point_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY first_nadir_point
    ADD CONSTRAINT first_nadir_point_pkey PRIMARY KEY (id);


--
-- Name: imager_processing_input_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY image_processing_input
    ADD CONSTRAINT imager_processing_input_pkey PRIMARY KEY (processing, product);


--
-- Name: imaging_instrument_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY imaging_instrument
    ADD CONSTRAINT imaging_instrument_pkey PRIMARY KEY (satellite, instrument);


--
-- Name: instrument_history_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY instrument_calibration_history
    ADD CONSTRAINT instrument_history_pkey PRIMARY KEY (satellite, instrument, orbit_absolute_number);


--
-- Name: instrument_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY instrument
    ADD CONSTRAINT instrument_pkey PRIMARY KEY (satellite, id);


--
-- Name: instrument_unavailability_period_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY instrument_unavailability_period
    ADD CONSTRAINT instrument_unavailability_period_pkey PRIMARY KEY (satellite, instrument, start_date_time);


--
-- Name: living_request_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY living_request
    ADD CONSTRAINT living_request_pkey PRIMARY KEY (request);


--
-- Name: mailing_list_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY mailing_list
    ADD CONSTRAINT mailing_list_pkey PRIMARY KEY (request, requester);


--
-- Name: media_catalog_entry_media_catalog_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY media_catalog_entry
    ADD CONSTRAINT media_catalog_entry_media_catalog_key UNIQUE (media_catalog, name);


--
-- Name: media_catalog_entry_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY media_catalog_entry
    ADD CONSTRAINT media_catalog_entry_pkey PRIMARY KEY (id);


--
-- Name: media_catalog_media_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY media_catalog
    ADD CONSTRAINT media_catalog_media_key UNIQUE (media, name);


--
-- Name: media_catalog_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY media_catalog
    ADD CONSTRAINT media_catalog_pkey PRIMARY KEY (id);


--
-- Name: media_history_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY media_history
    ADD CONSTRAINT media_history_pkey PRIMARY KEY (media, date_time);


--
-- Name: media_history_type_code_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY media_history_type
    ADD CONSTRAINT media_history_type_code_key UNIQUE (code);


--
-- Name: media_history_type_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY media_history_type
    ADD CONSTRAINT media_history_type_name_key UNIQUE (name);


--
-- Name: media_history_type_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY media_history_type
    ADD CONSTRAINT media_history_type_pkey PRIMARY KEY (id);


--
-- Name: media_info_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY media_info
    ADD CONSTRAINT media_info_pkey PRIMARY KEY (media, transcription_report, media_status);


--
-- Name: media_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY media
    ADD CONSTRAINT media_name_key UNIQUE (name);


--
-- Name: media_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);


--
-- Name: media_status_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY media_status
    ADD CONSTRAINT media_status_pkey PRIMARY KEY (id);


--
-- Name: media_type_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY media_type
    ADD CONSTRAINT media_type_name_key UNIQUE (name);


--
-- Name: media_type_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY media_type
    ADD CONSTRAINT media_type_pkey PRIMARY KEY (id);


--
-- Name: mode_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY mode
    ADD CONSTRAINT mode_pkey PRIMARY KEY (satellite, instrument, mode);


--
-- Name: mode_x_product_type_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY mode_x_product_type
    ADD CONSTRAINT mode_x_product_type_pkey PRIMARY KEY (satellite, instrument, mode, product_type);


--
-- Name: on_board_time_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY on_board_time
    ADD CONSTRAINT on_board_time_pkey PRIMARY KEY (id);


--
-- Name: orbit_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY orbit
    ADD CONSTRAINT orbit_pkey PRIMARY KEY (satellite, absolute_number);


--
-- Name: pk_dataset_x_document_id; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY dataset_x_document
    ADD CONSTRAINT pk_dataset_x_document_id PRIMARY KEY (id);


--
-- Name: pk_default_processing_id; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY default_processing
    ADD CONSTRAINT pk_default_processing_id PRIMARY KEY (id);


--
-- Name: pk_id; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY distribution
    ADD CONSTRAINT pk_id PRIMARY KEY (id);


--
-- Name: pk_id_solftware_x_auxiliary_configuration; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY software_x_auxiliary_configuration
    ADD CONSTRAINT pk_id_solftware_x_auxiliary_configuration PRIMARY KEY (id);


--
-- Name: pk_ipf_baseline_id; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY ipf_processing_baseline
    ADD CONSTRAINT pk_ipf_baseline_id PRIMARY KEY (id);


--
-- Name: pk_ipf_baseline_x_sxa_id; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY ipf_processing_baseline_x_sxa
    ADD CONSTRAINT pk_ipf_baseline_x_sxa_id PRIMARY KEY (id);


--
-- Name: pk_product_id; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY footprint
    ADD CONSTRAINT pk_product_id PRIMARY KEY (product_id);


--
-- Name: pk_reprocessing_id; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY reprocessing
    ADD CONSTRAINT pk_reprocessing_id PRIMARY KEY (id);


--
-- Name: processing_chain_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY processing_chain
    ADD CONSTRAINT processing_chain_pkey PRIMARY KEY (before, after);


--
-- Name: processing_input_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY processing_input
    ADD CONSTRAINT processing_input_pkey PRIMARY KEY (processing, product);


--
-- Name: processing_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY processing
    ADD CONSTRAINT processing_pkey PRIMARY KEY (id);


--
-- Name: product_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY product
    ADD CONSTRAINT product_name_key UNIQUE (name);


--
-- Name: product_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY product
    ADD CONSTRAINT product_pkey PRIMARY KEY (id);


--
-- Name: product_type_acronym_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY product_type
    ADD CONSTRAINT product_type_acronym_key UNIQUE (acronym);


--
-- Name: product_type_chain_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY product_type_chain
    ADD CONSTRAINT product_type_chain_pkey PRIMARY KEY (target, id);


--
-- Name: product_type_dependency_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY product_type_dependency
    ADD CONSTRAINT product_type_dependency_pkey PRIMARY KEY (target, source);


--
-- Name: product_type_dependency_target_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY product_type_dependency
    ADD CONSTRAINT product_type_dependency_target_key UNIQUE (target, dependency_group, source_rank);


--
-- Name: product_type_link_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY product_type_link
    ADD CONSTRAINT product_type_link_pkey PRIMARY KEY (product_type);


--
-- Name: product_type_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY product_type
    ADD CONSTRAINT product_type_pkey PRIMARY KEY (id);


--
-- Name: product_x_media_catalog_entry_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY product_x_media_catalog_entry
    ADD CONSTRAINT product_x_media_catalog_entry_pkey PRIMARY KEY (media_catalog_entry, product);


--
-- Name: product_x_sequential_media_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY product_x_sequential_media
    ADD CONSTRAINT product_x_sequential_media_pkey PRIMARY KEY (media, "position");


--
-- Name: recipient_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY recipient
    ADD CONSTRAINT recipient_pkey PRIMARY KEY (communication_request, requester);


--
-- Name: rectangular_site_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY rectangular_site
    ADD CONSTRAINT rectangular_site_pkey PRIMARY KEY (site);


--
-- Name: reference_tie_frame_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY reference_tie_frame
    ADD CONSTRAINT reference_tie_frame_pkey PRIMARY KEY (satellite, instrument, id);


--
-- Name: reference_tie_frame_satellite_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY reference_tie_frame
    ADD CONSTRAINT reference_tie_frame_satellite_key UNIQUE (satellite, instrument, anx_interval);


--
-- Name: relative_orbit_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY relative_orbit
    ADD CONSTRAINT relative_orbit_pkey PRIMARY KEY (satellite, id);


--
-- Name: reprocessing_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY processing_configuration
    ADD CONSTRAINT reprocessing_pkey PRIMARY KEY (id);


--
-- Name: request_description_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY request_description
    ADD CONSTRAINT request_description_pkey PRIMARY KEY (request);


--
-- Name: request_group_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY request_group
    ADD CONSTRAINT request_group_name_key UNIQUE (name);


--
-- Name: request_group_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY request_group
    ADD CONSTRAINT request_group_pkey PRIMARY KEY (id);


--
-- Name: request_group_x_request_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY request_group_x_request
    ADD CONSTRAINT request_group_x_request_pkey PRIMARY KEY (request_group, request);


--
-- Name: request_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY request
    ADD CONSTRAINT request_pkey PRIMARY KEY (id);


--
-- Name: request_x_data_type_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY request_x_data_type
    ADD CONSTRAINT request_x_data_type_pkey PRIMARY KEY (data_type, request);


--
-- Name: request_x_processing_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY request_x_processing
    ADD CONSTRAINT request_x_processing_pkey PRIMARY KEY (request, processing);


--
-- Name: request_x_product_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY request_x_product
    ADD CONSTRAINT request_x_product_pkey PRIMARY KEY (request, product);


--
-- Name: requester_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY requester
    ADD CONSTRAINT requester_pkey PRIMARY KEY (id);


--
-- Name: satellite_acronym_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY satellite
    ADD CONSTRAINT satellite_acronym_key UNIQUE (acronym);


--
-- Name: satellite_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY satellite
    ADD CONSTRAINT satellite_name_key UNIQUE (name);


--
-- Name: satellite_phase_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY satellite_phase
    ADD CONSTRAINT satellite_phase_pkey PRIMARY KEY (id);


--
-- Name: satellite_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY satellite
    ADD CONSTRAINT satellite_pkey PRIMARY KEY (id);


--
-- Name: sensing_product_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY sensing_product
    ADD CONSTRAINT sensing_product_pkey PRIMARY KEY (product);


--
-- Name: server_account_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY server_account
    ADD CONSTRAINT server_account_pkey PRIMARY KEY (id);


--
-- Name: server_account_server_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY server_account
    ADD CONSTRAINT server_account_server_name_key UNIQUE (server_name, login);


--
-- Name: site_coverage_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY site_coverage
    ADD CONSTRAINT site_coverage_pkey PRIMARY KEY (site, satellite, instrument, relative_orbit_number);


--
-- Name: site_owner_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY site
    ADD CONSTRAINT site_owner_key UNIQUE (owner, name);


--
-- Name: site_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY site
    ADD CONSTRAINT site_pkey PRIMARY KEY (id);


--
-- Name: software_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY software
    ADD CONSTRAINT software_name_key UNIQUE (name, version);


--
-- Name: software_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY software
    ADD CONSTRAINT software_pkey PRIMARY KEY (id);


--
-- Name: software_x_binary_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY software_x_binary
    ADD CONSTRAINT software_x_binary_pkey PRIMARY KEY (software_id, rank);


--
-- Name: software_x_product_type_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY software_x_product_type
    ADD CONSTRAINT software_x_product_type_pkey PRIMARY KEY (product_type, software);


--
-- Name: state_vector_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY state_vector
    ADD CONSTRAINT state_vector_pkey PRIMARY KEY (id);


--
-- Name: state_vector_source_code_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY state_vector_source
    ADD CONSTRAINT state_vector_source_code_key UNIQUE (code);


--
-- Name: state_vector_source_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY state_vector_source
    ADD CONSTRAINT state_vector_source_pkey PRIMARY KEY (product_type);


--
-- Name: un_product_id; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY footprint
    ADD CONSTRAINT un_product_id UNIQUE (product_id);


SET search_path = lta, pg_catalog;

--
-- Name: abort_pkey; Type: CONSTRAINT; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY abort
    ADD CONSTRAINT abort_pkey PRIMARY KEY (transaction_id);


--
-- Name: check_pkey; Type: CONSTRAINT; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY "check"
    ADD CONSTRAINT check_pkey PRIMARY KEY (transaction_id);


--
-- Name: ct_transaction_type_name; Type: CONSTRAINT; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY transaction_type
    ADD CONSTRAINT ct_transaction_type_name UNIQUE (transaction_name);


--
-- Name: ct_unique_global_param; Type: CONSTRAINT; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY global
    ADD CONSTRAINT ct_unique_global_param UNIQUE (param);


--
-- Name: delete_pkey; Type: CONSTRAINT; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY delete
    ADD CONSTRAINT delete_pkey PRIMARY KEY (transaction_id);


--
-- Name: direct_pkey; Type: CONSTRAINT; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY direct
    ADD CONSTRAINT direct_pkey PRIMARY KEY (transaction_id);


--
-- Name: global_pkey; Type: CONSTRAINT; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY global
    ADD CONSTRAINT global_pkey PRIMARY KEY (id);


--
-- Name: ingestion_pkey; Type: CONSTRAINT; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY ingestion
    ADD CONSTRAINT ingestion_pkey PRIMARY KEY (transaction_id);


--
-- Name: monitoring_pkey; Type: CONSTRAINT; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY monitoring
    ADD CONSTRAINT monitoring_pkey PRIMARY KEY (transaction_id);


--
-- Name: primary_key_id; Type: CONSTRAINT; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY product_status
    ADD CONSTRAINT primary_key_id PRIMARY KEY (id);


--
-- Name: query_pkey; Type: CONSTRAINT; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY query
    ADD CONSTRAINT query_pkey PRIMARY KEY (transaction_id);


--
-- Name: retrieval_pkey; Type: CONSTRAINT; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY retrieval
    ADD CONSTRAINT retrieval_pkey PRIMARY KEY (transaction_id);


--
-- Name: transaction_pkey; Type: CONSTRAINT; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY transaction
    ADD CONSTRAINT transaction_pkey PRIMARY KEY (id);


--
-- Name: transaction_type_pkey; Type: CONSTRAINT; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY transaction_type
    ADD CONSTRAINT transaction_type_pkey PRIMARY KEY (id);


--
-- Name: transaction_type_x_request_pkey; Type: CONSTRAINT; Schema: lta; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY transaction_type_x_request
    ADD CONSTRAINT transaction_type_x_request_pkey PRIMARY KEY (id);


SET search_path = processing, pg_catalog;

--
-- Name: batch_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY batch
    ADD CONSTRAINT batch_pkey PRIMARY KEY (batch_id);


--
-- Name: batch_x_product_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY batch_x_product
    ADD CONSTRAINT batch_x_product_pkey PRIMARY KEY (batch, product);


--
-- Name: cache_lock_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY cache_lock
    ADD CONSTRAINT cache_lock_pkey PRIMARY KEY (id);


--
-- Name: history_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY history
    ADD CONSTRAINT history_pkey PRIMARY KEY (history_id);


--
-- Name: history_x_product_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY history_x_product
    ADD CONSTRAINT history_x_product_pkey PRIMARY KEY (history, product);


--
-- Name: hosts_comment_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY hosts_comment
    ADD CONSTRAINT hosts_comment_pkey PRIMARY KEY (host_id);


--
-- Name: hosts_hostname; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY hosts
    ADD CONSTRAINT hosts_hostname UNIQUE (hostname);


--
-- Name: hosts_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY hosts
    ADD CONSTRAINT hosts_pkey PRIMARY KEY (host_id);


--
-- Name: mutex_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY mutex
    ADD CONSTRAINT mutex_pkey PRIMARY KEY (hosts, proc);


--
-- Name: output_file_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY output_file
    ADD CONSTRAINT output_file_pkey PRIMARY KEY (date_time, directory_name, file_name);


--
-- Name: parameters_comment_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY parameters_comment
    ADD CONSTRAINT parameters_comment_pkey PRIMARY KEY (id);


--
-- Name: parameters_set_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY parameters_set
    ADD CONSTRAINT parameters_set_pkey PRIMARY KEY (id, keyword_index);


--
-- Name: pool_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY pool
    ADD CONSTRAINT pool_pkey PRIMARY KEY (id);


--
-- Name: pool_x_hosts_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY pool_x_hosts
    ADD CONSTRAINT pool_x_hosts_pkey PRIMARY KEY (pool, hosts);


--
-- Name: processing_comment_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY processing_comment
    ADD CONSTRAINT processing_comment_pkey PRIMARY KEY (id);


--
-- Name: processing_comment_x_product_type_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY processing_comment_x_product_type
    ADD CONSTRAINT processing_comment_x_product_type_pkey PRIMARY KEY (processing_comment, product_type);


--
-- Name: processing_set_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY processing_set
    ADD CONSTRAINT processing_set_pkey PRIMARY KEY (id, seq_index);


--
-- Name: processing_type_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY processing_type
    ADD CONSTRAINT processing_type_pkey PRIMARY KEY (id);


--
-- Name: top_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY top
    ADD CONSTRAINT top_pkey PRIMARY KEY (batch_id);


SET search_path = public, pg_catalog;

--
-- Name: pk_name; Type: CONSTRAINT; Schema: public; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY prd_period
    ADD CONSTRAINT pk_name PRIMARY KEY (name);


--
-- Name: prk_name_id; Type: CONSTRAINT; Schema: public; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY prd_external
    ADD CONSTRAINT prk_name_id PRIMARY KEY (name, tag);


--
-- Name: product_id_pkey; Type: CONSTRAINT; Schema: public; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY prd_geoloc
    ADD CONSTRAINT product_id_pkey PRIMARY KEY (product_id);


--
-- Name: products_delivered_pkey; Type: CONSTRAINT; Schema: public; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY products_delivered
    ADD CONSTRAINT products_delivered_pkey PRIMARY KEY (id);


--
-- Name: u_constraint_media_delivered; Type: CONSTRAINT; Schema: public; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY media_delivered
    ADD CONSTRAINT u_constraint_media_delivered UNIQUE (tag, disk_type, disk_name);


--
-- Name: u_constraint_product; Type: CONSTRAINT; Schema: public; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY products_delivered
    ADD CONSTRAINT u_constraint_product UNIQUE (product_id, disk_type, disk_name, tag);


SET search_path = s3ome, pg_catalog;

--
-- Name: media_name_key; Type: CONSTRAINT; Schema: s3ome; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY media
    ADD CONSTRAINT media_name_key UNIQUE (name);


--
-- Name: media_pkey; Type: CONSTRAINT; Schema: s3ome; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);


--
-- Name: pkey_product_id; Type: CONSTRAINT; Schema: s3ome; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY hsm_copy
    ADD CONSTRAINT pkey_product_id PRIMARY KEY (product_id);


--
-- Name: viscal_info_pkey; Type: CONSTRAINT; Schema: s3ome; Owner: srv_dpmc; Tablespace: 
--

ALTER TABLE ONLY viscal_info
    ADD CONSTRAINT viscal_info_pkey PRIMARY KEY (abs_orbit, satellite);


SET search_path = internal, pg_catalog;

--
-- Name: dataset_name_idx; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX dataset_name_idx ON dataset USING btree (name);


--
-- Name: dataset_x_product_dataset_id_idx; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX dataset_x_product_dataset_id_idx ON dataset_x_product USING btree (dataset_id);


--
-- Name: dataset_x_product_dataset_id_product_id_idx; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX dataset_x_product_dataset_id_product_id_idx ON dataset_x_product USING btree (dataset_id, product_id);


--
-- Name: dataset_x_product_product_id_idx; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX dataset_x_product_product_id_idx ON dataset_x_product USING btree (product_id);


--
-- Name: idx_acquisition_chain_center; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_acquisition_chain_center ON acquisition_chain USING btree (center);


--
-- Name: idx_acquisition_chain_product; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_acquisition_chain_product ON acquisition_chain USING btree (product);


--
-- Name: idx_auxiliary_product_double_date_time; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_auxiliary_product_double_date_time ON auxiliary_product USING btree (validity_start_date_time, validity_stop_date_time);


--
-- Name: idx_auxiliary_product_double_date_time2; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_auxiliary_product_double_date_time2 ON auxiliary_product USING btree (validity_stop_date_time, validity_start_date_time);


--
-- Name: idx_auxiliary_product_validity_start_date_time; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_auxiliary_product_validity_start_date_time ON auxiliary_product USING btree (validity_start_date_time);


--
-- Name: idx_auxiliary_product_validity_stop_date_time; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_auxiliary_product_validity_stop_date_time ON auxiliary_product USING btree (validity_stop_date_time);


--
-- Name: idx_auxiliary_product_version; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_auxiliary_product_version ON auxiliary_product USING btree (version);


--
-- Name: idx_center_x_software_software; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_center_x_software_software ON center_x_software USING btree (software);


--
-- Name: idx_error_type_x_product_product; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_error_type_x_product_product ON product USING btree (id);


--
-- Name: idx_first_nadir_point_latitude_longitude; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_first_nadir_point_latitude_longitude ON first_nadir_point USING btree (latitude, longitude);


--
-- Name: idx_first_nadir_point_satellite; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_first_nadir_point_satellite ON first_nadir_point USING btree (satellite);


--
-- Name: idx_imager_processing_input_processing; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_imager_processing_input_processing ON image_processing_input USING btree (processing);


--
-- Name: idx_imager_processing_input_product; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_imager_processing_input_product ON image_processing_input USING btree (product);


--
-- Name: idx_instrument_unavailability_period_instrument_comment; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_instrument_unavailability_period_instrument_comment ON instrument_unavailability_period USING btree (instrument, comment);


--
-- Name: idx_instrument_unavailability_period_start_date_time; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_instrument_unavailability_period_start_date_time ON instrument_unavailability_period USING btree (satellite, instrument, start_date_time);


--
-- Name: idx_instrument_unavailability_period_stop_date_time; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_instrument_unavailability_period_stop_date_time ON instrument_unavailability_period USING btree (satellite, instrument, stop_date_time);


--
-- Name: idx_internal_request_pool; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_internal_request_pool ON request USING btree (pool);


--
-- Name: idx_media_catalog_entry_media_catalog; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_media_catalog_entry_media_catalog ON media_catalog_entry USING btree (media_catalog);


--
-- Name: idx_media_catalog_entry_media_catalog_name; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_media_catalog_entry_media_catalog_name ON media_catalog_entry USING btree (media_catalog, name);


--
-- Name: idx_media_catalog_entry_name; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_media_catalog_entry_name ON media_catalog_entry USING btree (name);


--
-- Name: idx_media_catalog_media_name; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_media_catalog_media_name ON media_catalog USING btree (media, name);


--
-- Name: idx_media_catalog_name; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_media_catalog_name ON media_catalog USING btree (name);


--
-- Name: idx_media_name; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_media_name ON media USING btree (name);


--
-- Name: idx_mode_x_product_type_product_type; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_mode_x_product_type_product_type ON mode_x_product_type USING btree (product_type);


--
-- Name: idx_orbit_satellite_anx_date_time; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_orbit_satellite_anx_date_time ON orbit USING btree (satellite, anx_date_time);


--
-- Name: idx_orbit_satellite_cycle_relative_number; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_orbit_satellite_cycle_relative_number ON orbit USING btree (satellite, cycle_relative_number);


--
-- Name: idx_processing_center; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_processing_center ON processing USING btree (center);


--
-- Name: idx_processing_input_processing; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_processing_input_processing ON processing_input USING btree (processing);


--
-- Name: idx_processing_input_product; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_processing_input_product ON processing_input USING btree (product);


--
-- Name: idx_processing_product_type; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_processing_product_type ON processing USING btree (product_type);


--
-- Name: idx_processing_software; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_processing_software ON processing USING btree (software);


--
-- Name: idx_product_document; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_product_document ON product USING btree (document);


--
-- Name: idx_product_generation_date_time; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_product_generation_date_time ON product USING btree (generation_date_time);


--
-- Name: idx_product_name; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_product_name ON product USING btree (name);


--
-- Name: idx_product_obsolescence_date_time; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_product_obsolescence_date_time ON product USING btree (obsolescence_date_time);


--
-- Name: idx_product_processing; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_product_processing ON product USING btree (processing);


--
-- Name: idx_product_product_type; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_product_product_type ON product USING btree (product_type);


--
-- Name: idx_product_type_dependency_source; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_product_type_dependency_source ON product_type_dependency USING btree (source);


--
-- Name: idx_product_type_dependency_target; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_product_type_dependency_target ON product_type_dependency USING btree (target);


--
-- Name: idx_product_x_media_catalog_entry_mce; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_product_x_media_catalog_entry_mce ON product_x_media_catalog_entry USING btree (media_catalog_entry);


--
-- Name: idx_product_x_media_catalog_entry_product; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_product_x_media_catalog_entry_product ON product_x_media_catalog_entry USING btree (product);


--
-- Name: idx_product_x_sequential_media; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_product_x_sequential_media ON product_x_sequential_media USING btree (media, product);


--
-- Name: idx_product_x_sequential_media_product; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_product_x_sequential_media_product ON product_x_sequential_media USING btree (product);


--
-- Name: idx_reference_tie_frame_region; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_reference_tie_frame_region ON reference_tie_frame USING gist (region);


--
-- Name: idx_relative_orbit; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_relative_orbit ON relative_orbit USING btree (satellite, id, reference_trace_translation_longitude);


--
-- Name: idx_request_group_name; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE UNIQUE INDEX idx_request_group_name ON request_group USING btree (name);


--
-- Name: idx_request_group_x_request_request; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_request_group_x_request_request ON request_group_x_request USING btree (request);


--
-- Name: idx_request_media_catalog; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_request_media_catalog ON request USING btree (media_catalog);


--
-- Name: idx_request_server_account; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_request_server_account ON request USING btree (server_account);


--
-- Name: idx_request_x_processing_processing; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_request_x_processing_processing ON request_x_processing USING btree (processing);


--
-- Name: idx_request_x_processing_request; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_request_x_processing_request ON request_x_processing USING btree (request);


--
-- Name: idx_requester_media_catalog; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_requester_media_catalog ON requester USING btree (media_catalog);


--
-- Name: idx_sensing_product_start_absolute_orbit_number; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_sensing_product_start_absolute_orbit_number ON sensing_product USING btree (start_absolute_orbit_number);


--
-- Name: idx_sensing_product_start_date_time_stop_date_time; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_sensing_product_start_date_time_stop_date_time ON sensing_product USING btree (start_date_time, stop_date_time);


--
-- Name: idx_sensing_product_stop_date_time; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_sensing_product_stop_date_time ON sensing_product USING btree (stop_date_time);


--
-- Name: idx_site_owner; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_site_owner ON site USING btree (owner);


--
-- Name: idx_site_sys_polygon; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_site_sys_polygon ON site USING gist (sys_polygon);


--
-- Name: idx_state_vector_position; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_state_vector_position ON state_vector USING btree (x_position, y_position, z_position);


--
-- Name: idx_state_vector_satellite_absolute_orbit_number; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_state_vector_satellite_absolute_orbit_number ON state_vector USING btree (satellite, absolute_orbit_number);


--
-- Name: idx_state_vector_satellite_date_time; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_state_vector_satellite_date_time ON state_vector USING btree (satellite, date_time);


--
-- Name: idx_state_vector_source; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_state_vector_source ON state_vector USING btree (source);


--
-- Name: idx_state_vector_velocity; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_state_vector_velocity ON state_vector USING btree (x_velocity, y_velocity, z_velocity);


--
-- Name: idx_uniq_product_type_acronym; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE UNIQUE INDEX idx_uniq_product_type_acronym ON product_type USING btree (acronym);


--
-- Name: internal_processing_stage_idx; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX internal_processing_stage_idx ON processing USING btree (stage);


--
-- Name: media_catalog_media_idx; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX media_catalog_media_idx ON media_catalog USING btree (media);


--
-- Name: media_history_idx; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX media_history_idx ON media_history USING btree (media);


--
-- Name: product_x_sequential_media_media_idx; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX product_x_sequential_media_media_idx ON product_x_sequential_media USING btree (media);


--
-- Name: request_software_idx; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX request_software_idx ON request USING btree (software);


--
-- Name: sensing_product_product_idx; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX sensing_product_product_idx ON sensing_product USING btree (product);


--
-- Name: sensing_product_start_date_time_idx; Type: INDEX; Schema: internal; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX sensing_product_start_date_time_idx ON sensing_product USING btree (start_date_time);


SET search_path = processing, pg_catalog;

--
-- Name: history_file_input_id_idx; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX history_file_input_id_idx ON history USING btree (file_input_id);


--
-- Name: history_history_id_file_input_id_idx; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX history_history_id_file_input_id_idx ON history USING btree (history_id, file_input_id);


--
-- Name: history_x_product_product_history_idx; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX history_x_product_product_history_idx ON history_x_product USING btree (product, history);


--
-- Name: idx_batch_output_media_catalog; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_batch_output_media_catalog ON batch USING btree (output_media_catalog);


--
-- Name: idx_history_batch_id; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_history_batch_id ON history USING btree (batch_id);


--
-- Name: idx_history_request_id; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_history_request_id ON history USING btree (request_id);


--
-- Name: idx_history_request_id_file_input_id; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_history_request_id_file_input_id ON history USING btree (request_id, file_input_id);


--
-- Name: idx_history_tag; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_history_tag ON history USING btree (tag);

ALTER TABLE history CLUSTER ON idx_history_tag;


--
-- Name: idx_history_x_product_product; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_history_x_product_product ON history_x_product USING btree (product);


--
-- Name: idx_processing_batch; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_processing_batch ON batch USING btree (file_input_id);


--
-- Name: idx_processing_batch_processing_set_id; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_processing_batch_processing_set_id ON batch USING btree (processing_set_id);


--
-- Name: idx_processing_batch_request_id; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_processing_batch_request_id ON batch USING btree (request_id);


--
-- Name: idx_processing_batch_request_id_state; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_processing_batch_request_id_state ON batch USING btree (request_id, state);


--
-- Name: idx_processing_batch_state; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_processing_batch_state ON batch USING btree (state);


--
-- Name: idx_processing_output_file_batch_id_date_time; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_processing_output_file_batch_id_date_time ON output_file USING btree (batch_id, date_time);


--
-- Name: idx_processing_output_file_date_time; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_processing_output_file_date_time ON output_file USING btree (date_time);


--
-- Name: idx_processing_output_file_disk_location; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_processing_output_file_disk_location ON output_file USING btree (directory_name, file_name);


--
-- Name: idx_processing_pool_x_hosts_hosts; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_processing_pool_x_hosts_hosts ON pool_x_hosts USING btree (hosts);


--
-- Name: idx_processing_pool_x_hosts_pool; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_processing_pool_x_hosts_pool ON pool_x_hosts USING btree (pool);


--
-- Name: idx_processing_top_hosts; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_processing_top_hosts ON top USING btree (hostname_id);


--
-- Name: idx_processing_top_started; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_processing_top_started ON top USING btree (started);


--
-- Name: processing_batch_request_id_file_input_id; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX processing_batch_request_id_file_input_id ON batch USING btree (request_id, file_input_id);


--
-- Name: processing_batch_x_product_batch_idx; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX processing_batch_x_product_batch_idx ON batch_x_product USING btree (batch);


--
-- Name: processing_batch_x_product_product_idx; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX processing_batch_x_product_product_idx ON batch_x_product USING btree (product);


--
-- Name: processing_history_output_dir_idx; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX processing_history_output_dir_idx ON history USING btree (output_dir);


--
-- Name: processing_history_x_product_history_idx; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX processing_history_x_product_history_idx ON history_x_product USING btree (history);


--
-- Name: processing_parameters_set_id_idx; Type: INDEX; Schema: processing; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX processing_parameters_set_id_idx ON parameters_set USING btree (id);


SET search_path = public, pg_catalog;

--
-- Name: idx_prd_md5_product; Type: INDEX; Schema: public; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_prd_md5_product ON prd_md5 USING btree (product);


--
-- Name: idx_tag; Type: INDEX; Schema: public; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_tag ON prd_external USING btree (tag);


--
-- Name: products_delivered_product_id_idx; Type: INDEX; Schema: public; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX products_delivered_product_id_idx ON products_delivered USING btree (product_id);


--
-- Name: products_delivered_product_id_tag_idx; Type: INDEX; Schema: public; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX products_delivered_product_id_tag_idx ON products_delivered USING btree (product_id, tag);


SET search_path = s3ome, pg_catalog;

--
-- Name: idx_product_x_media; Type: INDEX; Schema: s3ome; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_product_x_media ON product_x_media USING btree (media, path);


--
-- Name: idx_product_x_media_media; Type: INDEX; Schema: s3ome; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_product_x_media_media ON product_x_media USING btree (media);


--
-- Name: idx_product_x_media_product; Type: INDEX; Schema: s3ome; Owner: srv_dpmc; Tablespace: 
--

CREATE INDEX idx_product_x_media_product ON product_x_media USING btree (path);


SET search_path = internal, pg_catalog;

--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY instrument
    ADD CONSTRAINT "$1" FOREIGN KEY (satellite) REFERENCES satellite(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY mode
    ADD CONSTRAINT "$1" FOREIGN KEY (satellite, instrument) REFERENCES instrument(satellite, id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY processing
    ADD CONSTRAINT "$1" FOREIGN KEY (center) REFERENCES center(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY acquisition_chain
    ADD CONSTRAINT "$1" FOREIGN KEY (center) REFERENCES center(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY center_x_software
    ADD CONSTRAINT "$1" FOREIGN KEY (center) REFERENCES center(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY request
    ADD CONSTRAINT "$1" FOREIGN KEY (center) REFERENCES center(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY product
    ADD CONSTRAINT "$1" FOREIGN KEY (document) REFERENCES document(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY product_x_sequential_media
    ADD CONSTRAINT "$1" FOREIGN KEY (media) REFERENCES media(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY media_catalog
    ADD CONSTRAINT "$1" FOREIGN KEY (media) REFERENCES media(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY media
    ADD CONSTRAINT "$1" FOREIGN KEY (media_type) REFERENCES media_type(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY processing_input
    ADD CONSTRAINT "$1" FOREIGN KEY (processing) REFERENCES processing(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY software_x_product_type
    ADD CONSTRAINT "$1" FOREIGN KEY (software) REFERENCES software(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY auxiliary_product
    ADD CONSTRAINT "$1" FOREIGN KEY (product) REFERENCES product(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY state_vector
    ADD CONSTRAINT "$1" FOREIGN KEY (source) REFERENCES product(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY error_type_x_product
    ADD CONSTRAINT "$1" FOREIGN KEY (product) REFERENCES sensing_product(product) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY request_x_product
    ADD CONSTRAINT "$1" FOREIGN KEY (product) REFERENCES sensing_product(product) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY request_x_data_type
    ADD CONSTRAINT "$1" FOREIGN KEY (request) REFERENCES request(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY product_x_media_catalog_entry
    ADD CONSTRAINT "$1" FOREIGN KEY (media_catalog_entry) REFERENCES media_catalog_entry(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY first_nadir_point
    ADD CONSTRAINT "$1" FOREIGN KEY (satellite) REFERENCES satellite(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY mode_x_product_type
    ADD CONSTRAINT "$1" FOREIGN KEY (satellite, instrument, mode) REFERENCES mode(satellite, instrument, mode);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY on_board_time
    ADD CONSTRAINT "$1" FOREIGN KEY (satellite) REFERENCES satellite(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY orbit
    ADD CONSTRAINT "$1" FOREIGN KEY (satellite) REFERENCES satellite(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY product_type_link
    ADD CONSTRAINT "$1" FOREIGN KEY (product_type) REFERENCES product_type(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY relative_orbit
    ADD CONSTRAINT "$1" FOREIGN KEY (satellite) REFERENCES satellite(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY imaging_instrument
    ADD CONSTRAINT "$1" FOREIGN KEY (satellite, instrument) REFERENCES instrument(satellite, id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY reference_tie_frame
    ADD CONSTRAINT "$1" FOREIGN KEY (satellite, instrument) REFERENCES imaging_instrument(satellite, instrument);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY site_coverage
    ADD CONSTRAINT "$1" FOREIGN KEY (site) REFERENCES site(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY request_x_processing
    ADD CONSTRAINT "$1" FOREIGN KEY (request) REFERENCES request(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY rectangular_site
    ADD CONSTRAINT "$1" FOREIGN KEY (site) REFERENCES site(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY processing_chain
    ADD CONSTRAINT "$1" FOREIGN KEY (before) REFERENCES processing(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY product_type_chain
    ADD CONSTRAINT "$1" FOREIGN KEY (target) REFERENCES product_type(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY global
    ADD CONSTRAINT "$1" FOREIGN KEY (center) REFERENCES center(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY current_software
    ADD CONSTRAINT "$1" FOREIGN KEY (center) REFERENCES center(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY image_processing_input
    ADD CONSTRAINT "$1" FOREIGN KEY (processing, product) REFERENCES processing_input(processing, product);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY living_request
    ADD CONSTRAINT "$1" FOREIGN KEY (request) REFERENCES request(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY site
    ADD CONSTRAINT "$1" FOREIGN KEY (owner) REFERENCES requester(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY mailing_list
    ADD CONSTRAINT "$1" FOREIGN KEY (request) REFERENCES request(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY request_group_x_request
    ADD CONSTRAINT "$1" FOREIGN KEY (request_group) REFERENCES request_group(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY communication_request
    ADD CONSTRAINT "$1" FOREIGN KEY (request) REFERENCES request(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY recipient
    ADD CONSTRAINT "$1" FOREIGN KEY (communication_request) REFERENCES communication_request(request);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY auxiliary_configuration_detail
    ADD CONSTRAINT "$1" FOREIGN KEY (configuration) REFERENCES auxiliary_configuration(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY instrument_calibration_history
    ADD CONSTRAINT "$1" FOREIGN KEY (satellite, instrument) REFERENCES instrument(satellite, id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY software
    ADD CONSTRAINT "$1" FOREIGN KEY (default_auxiliary_configuration) REFERENCES auxiliary_configuration(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY instrument_unavailability_period
    ADD CONSTRAINT "$1" FOREIGN KEY (satellite, instrument) REFERENCES instrument(satellite, id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY auxiliary_configuration
    ADD CONSTRAINT "$1" FOREIGN KEY (index_media_catalog) REFERENCES media_catalog(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY requester
    ADD CONSTRAINT "$1" FOREIGN KEY (media_catalog) REFERENCES media_catalog(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY media_catalog_entry
    ADD CONSTRAINT "$1" FOREIGN KEY (media_catalog) REFERENCES media_catalog(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY media_history
    ADD CONSTRAINT "$1" FOREIGN KEY (media) REFERENCES media(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY sensing_product
    ADD CONSTRAINT "$1" FOREIGN KEY (state_vector) REFERENCES state_vector(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY default_center_x_product_type_software
    ADD CONSTRAINT "$1" FOREIGN KEY (center) REFERENCES center(id);


--
-- Name: $10; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY request
    ADD CONSTRAINT "$10" FOREIGN KEY (processing_comment) REFERENCES processing.processing_comment(id);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY product
    ADD CONSTRAINT "$2" FOREIGN KEY (processing) REFERENCES processing(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY processing
    ADD CONSTRAINT "$2" FOREIGN KEY (software) REFERENCES software(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY center_x_software
    ADD CONSTRAINT "$2" FOREIGN KEY (software) REFERENCES software(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY processing_input
    ADD CONSTRAINT "$2" FOREIGN KEY (product) REFERENCES product(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY acquisition_chain
    ADD CONSTRAINT "$2" FOREIGN KEY (product) REFERENCES product(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY product_x_sequential_media
    ADD CONSTRAINT "$2" FOREIGN KEY (product) REFERENCES product(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY sensing_product
    ADD CONSTRAINT "$2" FOREIGN KEY (product) REFERENCES product(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY error_type_x_product
    ADD CONSTRAINT "$2" FOREIGN KEY (error_type) REFERENCES error_type(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY request
    ADD CONSTRAINT "$2" FOREIGN KEY (site) REFERENCES site(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY request_x_product
    ADD CONSTRAINT "$2" FOREIGN KEY (request) REFERENCES request(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY request_x_data_type
    ADD CONSTRAINT "$2" FOREIGN KEY (data_type) REFERENCES data_type(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY product_x_media_catalog_entry
    ADD CONSTRAINT "$2" FOREIGN KEY (product) REFERENCES product(id);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY mode_x_product_type
    ADD CONSTRAINT "$2" FOREIGN KEY (product_type) REFERENCES product_type(id);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY site_coverage
    ADD CONSTRAINT "$2" FOREIGN KEY (satellite, instrument) REFERENCES instrument(satellite, id);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY request_x_processing
    ADD CONSTRAINT "$2" FOREIGN KEY (processing) REFERENCES processing(id);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY processing_chain
    ADD CONSTRAINT "$2" FOREIGN KEY (after) REFERENCES processing(id);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY product_type_chain
    ADD CONSTRAINT "$2" FOREIGN KEY (source) REFERENCES product_type(id);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY mailing_list
    ADD CONSTRAINT "$2" FOREIGN KEY (requester) REFERENCES requester(id);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY request_group_x_request
    ADD CONSTRAINT "$2" FOREIGN KEY (request) REFERENCES request(id);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY recipient
    ADD CONSTRAINT "$2" FOREIGN KEY (requester) REFERENCES requester(id);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY auxiliary_configuration_detail
    ADD CONSTRAINT "$2" FOREIGN KEY (product_type) REFERENCES product_type(id);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY instrument_calibration_history
    ADD CONSTRAINT "$2" FOREIGN KEY (satellite, orbit_absolute_number) REFERENCES orbit(satellite, absolute_number);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY orbit
    ADD CONSTRAINT "$2" FOREIGN KEY (anx_date_time_source_product) REFERENCES product(id);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY global
    ADD CONSTRAINT "$2" FOREIGN KEY (output_media_catalog) REFERENCES media_catalog(id);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY media
    ADD CONSTRAINT "$2" FOREIGN KEY (source_media) REFERENCES media(id);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY media_history
    ADD CONSTRAINT "$2" FOREIGN KEY (history_type) REFERENCES media_history_type(id);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY default_center_x_product_type_software
    ADD CONSTRAINT "$2" FOREIGN KEY (product_type) REFERENCES product_type(id);


--
-- Name: $3; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY request
    ADD CONSTRAINT "$3" FOREIGN KEY (requester) REFERENCES requester(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $3; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY processing
    ADD CONSTRAINT "$3" FOREIGN KEY (product_type) REFERENCES product_type(id);


--
-- Name: $3; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY current_software
    ADD CONSTRAINT "$3" FOREIGN KEY (software) REFERENCES software(id);


--
-- Name: $3; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY media
    ADD CONSTRAINT "$3" FOREIGN KEY (recipient) REFERENCES requester(id);


--
-- Name: $3; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY product
    ADD CONSTRAINT "$3" FOREIGN KEY (product_type) REFERENCES product_type(id);


--
-- Name: $3; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY default_center_x_product_type_software
    ADD CONSTRAINT "$3" FOREIGN KEY (software) REFERENCES software(id);


--
-- Name: $4; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY request
    ADD CONSTRAINT "$4" FOREIGN KEY (product_type) REFERENCES product_type(id);


--
-- Name: $5; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY request
    ADD CONSTRAINT "$5" FOREIGN KEY (media_catalog) REFERENCES media_catalog(id);


--
-- Name: $6; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY request
    ADD CONSTRAINT "$6" FOREIGN KEY (server_account) REFERENCES server_account(id);


--
-- Name: $7; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY request
    ADD CONSTRAINT "$7" FOREIGN KEY (pool) REFERENCES processing.pool(id);


--
-- Name: $8; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY request
    ADD CONSTRAINT "$8" FOREIGN KEY (software) REFERENCES software(id);


--
-- Name: $9; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY request
    ADD CONSTRAINT "$9" FOREIGN KEY (auxiliary_configuration) REFERENCES auxiliary_configuration(id);


--
-- Name: fk_aux_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY adf_baseline
    ADD CONSTRAINT fk_aux_id FOREIGN KEY (aux_id) REFERENCES auxiliary_configuration(id);


--
-- Name: fk_auxiliary_configuration_soft_x_aux; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY software_x_auxiliary_configuration
    ADD CONSTRAINT fk_auxiliary_configuration_soft_x_aux FOREIGN KEY (auxiliary_configuration) REFERENCES auxiliary_configuration(id);


--
-- Name: fk_dataset_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY dataset_x_product
    ADD CONSTRAINT fk_dataset_id FOREIGN KEY (dataset_id) REFERENCES dataset(id);


--
-- Name: fk_dataset_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY distribution
    ADD CONSTRAINT fk_dataset_id FOREIGN KEY (dataset_id) REFERENCES dataset(id);


--
-- Name: fk_dataset_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY dataset_x_document
    ADD CONSTRAINT fk_dataset_id FOREIGN KEY (dataset_id) REFERENCES dataset(id);


--
-- Name: fk_dataset_in_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY reprocessing
    ADD CONSTRAINT fk_dataset_in_id FOREIGN KEY (dataset_in_id) REFERENCES dataset(id);


--
-- Name: fk_dataset_out_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY reprocessing
    ADD CONSTRAINT fk_dataset_out_id FOREIGN KEY (dataset_out_id) REFERENCES dataset(id);


--
-- Name: fk_document_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY adf_baseline
    ADD CONSTRAINT fk_document_id FOREIGN KEY (document_id) REFERENCES product(id);


--
-- Name: fk_document_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY dataset_x_document
    ADD CONSTRAINT fk_document_id FOREIGN KEY (document_id) REFERENCES document(id);


--
-- Name: fk_ipb_x_sxa_soft_aux_conf_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY ipf_processing_baseline_x_sxa
    ADD CONSTRAINT fk_ipb_x_sxa_soft_aux_conf_id FOREIGN KEY (soft_x_aux_conf_id) REFERENCES software_x_auxiliary_configuration(id);


--
-- Name: fk_ipf_processing_baseline_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY ipf_processing_baseline_x_sxa
    ADD CONSTRAINT fk_ipf_processing_baseline_id FOREIGN KEY (ipf_processing_baseline_id) REFERENCES ipf_processing_baseline(id);


--
-- Name: fk_master_dataset_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY dataset_x_dataset
    ADD CONSTRAINT fk_master_dataset_id FOREIGN KEY (master_dataset_id) REFERENCES dataset(id);


--
-- Name: fk_media_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY distribution
    ADD CONSTRAINT fk_media_id FOREIGN KEY (media_id) REFERENCES media(id);


--
-- Name: fk_processing_comment_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY processing_configuration
    ADD CONSTRAINT fk_processing_comment_id FOREIGN KEY (processing_comment_id) REFERENCES processing.processing_comment(id);


--
-- Name: fk_product_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY dataset_x_product
    ADD CONSTRAINT fk_product_id FOREIGN KEY (product_id) REFERENCES product(id);


--
-- Name: fk_product_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY footprint
    ADD CONSTRAINT fk_product_id FOREIGN KEY (product_id) REFERENCES product(id);


--
-- Name: fk_product_type_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY default_processing
    ADD CONSTRAINT fk_product_type_id FOREIGN KEY (product_type_id) REFERENCES product_type(id);


--
-- Name: fk_reprocessing_configuration_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY reprocessing
    ADD CONSTRAINT fk_reprocessing_configuration_id FOREIGN KEY (processing_configuration_id) REFERENCES processing_configuration(id);


--
-- Name: fk_reprocessing_configuration_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY default_processing
    ADD CONSTRAINT fk_reprocessing_configuration_id FOREIGN KEY (processing_configuration_id) REFERENCES processing_configuration(id);


--
-- Name: fk_request_request; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY request_description
    ADD CONSTRAINT fk_request_request FOREIGN KEY (request) REFERENCES request(id);


--
-- Name: fk_requester_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY distribution
    ADD CONSTRAINT fk_requester_id FOREIGN KEY (requester_id) REFERENCES requester(id);


--
-- Name: fk_software_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY software_x_binary
    ADD CONSTRAINT fk_software_id FOREIGN KEY (software_id) REFERENCES software(id);


--
-- Name: fk_software_soft_x_aux; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY software_x_auxiliary_configuration
    ADD CONSTRAINT fk_software_soft_x_aux FOREIGN KEY (software) REFERENCES software(id);


--
-- Name: fk_sub_dataset_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY dataset_x_dataset
    ADD CONSTRAINT fk_sub_dataset_id FOREIGN KEY (sub_dataset_id) REFERENCES dataset(id);


--
-- Name: fk_sxac_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY processing_configuration
    ADD CONSTRAINT fk_sxac_id FOREIGN KEY (sxac_id) REFERENCES software_x_auxiliary_configuration(id);


--
-- Name: fk_sxac_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY default_processing
    ADD CONSTRAINT fk_sxac_id FOREIGN KEY (sxac_id) REFERENCES software_x_auxiliary_configuration(id);


--
-- Name: media_id_foreign; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY media_info
    ADD CONSTRAINT media_id_foreign FOREIGN KEY (media) REFERENCES media(id);


--
-- Name: media_status_foreign; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY media_info
    ADD CONSTRAINT media_status_foreign FOREIGN KEY (media_status) REFERENCES media_status(id);


--
-- Name: product_priority_x_product_foreign_key; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY priority_x_product
    ADD CONSTRAINT product_priority_x_product_foreign_key FOREIGN KEY (product_id) REFERENCES product(id);


--
-- Name: transcription_report_foreign; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY media_info
    ADD CONSTRAINT transcription_report_foreign FOREIGN KEY (transcription_report) REFERENCES product(id);


SET search_path = lta, pg_catalog;

--
-- Name: fk_abort_transaction_id; Type: FK CONSTRAINT; Schema: lta; Owner: srv_dpmc
--

ALTER TABLE ONLY abort
    ADD CONSTRAINT fk_abort_transaction_id FOREIGN KEY (transaction_id) REFERENCES transaction(id);


--
-- Name: fk_archive_primary_id; Type: FK CONSTRAINT; Schema: lta; Owner: srv_dpmc
--

ALTER TABLE ONLY archive
    ADD CONSTRAINT fk_archive_primary_id FOREIGN KEY (primary_id) REFERENCES internal.media(id);


--
-- Name: fk_archive_secondary_id; Type: FK CONSTRAINT; Schema: lta; Owner: srv_dpmc
--

ALTER TABLE ONLY archive
    ADD CONSTRAINT fk_archive_secondary_id FOREIGN KEY (secondary_id) REFERENCES internal.media(id);


--
-- Name: fk_check_transaction_id; Type: FK CONSTRAINT; Schema: lta; Owner: srv_dpmc
--

ALTER TABLE ONLY "check"
    ADD CONSTRAINT fk_check_transaction_id FOREIGN KEY (transaction_id) REFERENCES transaction(id);


--
-- Name: fk_direct_transaction_id; Type: FK CONSTRAINT; Schema: lta; Owner: srv_dpmc
--

ALTER TABLE ONLY direct
    ADD CONSTRAINT fk_direct_transaction_id FOREIGN KEY (transaction_id) REFERENCES transaction(id);


--
-- Name: fk_ingestion_transaction_id; Type: FK CONSTRAINT; Schema: lta; Owner: srv_dpmc
--

ALTER TABLE ONLY ingestion
    ADD CONSTRAINT fk_ingestion_transaction_id FOREIGN KEY (transaction_id) REFERENCES transaction(id);


--
-- Name: fk_monitoring_transaction_id; Type: FK CONSTRAINT; Schema: lta; Owner: srv_dpmc
--

ALTER TABLE ONLY monitoring
    ADD CONSTRAINT fk_monitoring_transaction_id FOREIGN KEY (transaction_id) REFERENCES transaction(id);


--
-- Name: fk_product_id; Type: FK CONSTRAINT; Schema: lta; Owner: srv_dpmc
--

ALTER TABLE ONLY product_status
    ADD CONSTRAINT fk_product_id FOREIGN KEY (product_id) REFERENCES internal.product(id);


--
-- Name: fk_query_transaction_id; Type: FK CONSTRAINT; Schema: lta; Owner: srv_dpmc
--

ALTER TABLE ONLY query
    ADD CONSTRAINT fk_query_transaction_id FOREIGN KEY (transaction_id) REFERENCES transaction(id);


--
-- Name: fk_request_id; Type: FK CONSTRAINT; Schema: lta; Owner: srv_dpmc
--

ALTER TABLE ONLY transaction_type_x_request
    ADD CONSTRAINT fk_request_id FOREIGN KEY (request_id) REFERENCES internal.request(id);


--
-- Name: fk_retrieval_transaction_id; Type: FK CONSTRAINT; Schema: lta; Owner: srv_dpmc
--

ALTER TABLE ONLY retrieval
    ADD CONSTRAINT fk_retrieval_transaction_id FOREIGN KEY (transaction_id) REFERENCES transaction(id);


--
-- Name: fk_transaction_client_name_requester_name; Type: FK CONSTRAINT; Schema: lta; Owner: srv_dpmc
--

ALTER TABLE ONLY transaction
    ADD CONSTRAINT fk_transaction_client_name_requester_name FOREIGN KEY (client_name) REFERENCES internal.requester(name);


--
-- Name: fk_transaction_id; Type: FK CONSTRAINT; Schema: lta; Owner: srv_dpmc
--

ALTER TABLE ONLY delete
    ADD CONSTRAINT fk_transaction_id FOREIGN KEY (transaction_id) REFERENCES transaction(id);


--
-- Name: fk_transaction_id; Type: FK CONSTRAINT; Schema: lta; Owner: srv_dpmc
--

ALTER TABLE ONLY product_status
    ADD CONSTRAINT fk_transaction_id FOREIGN KEY (transaction_id) REFERENCES transaction(id);


--
-- Name: fk_transaction_name; Type: FK CONSTRAINT; Schema: lta; Owner: srv_dpmc
--

ALTER TABLE ONLY transaction_type_x_request
    ADD CONSTRAINT fk_transaction_name FOREIGN KEY (transaction_name) REFERENCES transaction_type(transaction_name);


--
-- Name: fk_transaction_type; Type: FK CONSTRAINT; Schema: lta; Owner: srv_dpmc
--

ALTER TABLE ONLY transaction
    ADD CONSTRAINT fk_transaction_type FOREIGN KEY (transaction_name) REFERENCES transaction_type(transaction_name);


SET search_path = processing, pg_catalog;

--
-- Name: $1; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY batch
    ADD CONSTRAINT "$1" FOREIGN KEY (file_input_id) REFERENCES internal.product(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY top
    ADD CONSTRAINT "$1" FOREIGN KEY (batch_id) REFERENCES batch(batch_id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY pool_x_hosts
    ADD CONSTRAINT "$1" FOREIGN KEY (pool) REFERENCES pool(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY mutex
    ADD CONSTRAINT "$1" FOREIGN KEY (hosts) REFERENCES hosts(host_id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing_comment_x_product_type
    ADD CONSTRAINT "$1" FOREIGN KEY (processing_comment) REFERENCES processing_comment(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing_set
    ADD CONSTRAINT "$1" FOREIGN KEY (id) REFERENCES processing_comment(id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY batch_x_product
    ADD CONSTRAINT "$1" FOREIGN KEY (batch) REFERENCES batch(batch_id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY hosts_comment
    ADD CONSTRAINT "$1" FOREIGN KEY (host_id) REFERENCES hosts(host_id);


--
-- Name: $1; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY history_x_product
    ADD CONSTRAINT "$1" FOREIGN KEY (history) REFERENCES history(history_id);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY top
    ADD CONSTRAINT "$2" FOREIGN KEY (hostname_id) REFERENCES hosts(host_id);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY pool_x_hosts
    ADD CONSTRAINT "$2" FOREIGN KEY (hosts) REFERENCES hosts(host_id);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing_comment_x_product_type
    ADD CONSTRAINT "$2" FOREIGN KEY (product_type) REFERENCES internal.product_type(id);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY batch_x_product
    ADD CONSTRAINT "$2" FOREIGN KEY (product) REFERENCES internal.product(id);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY batch
    ADD CONSTRAINT "$2" FOREIGN KEY (output_media_catalog) REFERENCES internal.media_catalog(id);


--
-- Name: $2; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY history_x_product
    ADD CONSTRAINT "$2" FOREIGN KEY (product) REFERENCES internal.product(id);


--
-- Name: $3; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY batch
    ADD CONSTRAINT "$3" FOREIGN KEY (processing_set_id) REFERENCES processing_comment(id);


--
-- Name: parameters_sets_id; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY parameters_set
    ADD CONSTRAINT parameters_sets_id FOREIGN KEY (id) REFERENCES batch(batch_id);


SET search_path = public, pg_catalog;

--
-- Name: prd_geoloc_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: srv_dpmc
--

ALTER TABLE ONLY prd_geoloc
    ADD CONSTRAINT prd_geoloc_product_id_fkey FOREIGN KEY (product_id) REFERENCES internal.product(id);


SET search_path = s3ome, pg_catalog;

--
-- Name: $1; Type: FK CONSTRAINT; Schema: s3ome; Owner: srv_dpmc
--

ALTER TABLE ONLY media
    ADD CONSTRAINT "$1" FOREIGN KEY (media_type) REFERENCES internal.media_type(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $1; Type: FK CONSTRAINT; Schema: s3ome; Owner: srv_dpmc
--

ALTER TABLE ONLY product_x_media
    ADD CONSTRAINT "$1" FOREIGN KEY (media) REFERENCES media(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: $3; Type: FK CONSTRAINT; Schema: s3ome; Owner: srv_dpmc
--

ALTER TABLE ONLY media
    ADD CONSTRAINT "$3" FOREIGN KEY (recipient) REFERENCES internal.requester(id);


--
-- Name: viscal_info_satellite_fkey; Type: FK CONSTRAINT; Schema: s3ome; Owner: srv_dpmc
--

ALTER TABLE ONLY viscal_info
    ADD CONSTRAINT viscal_info_satellite_fkey FOREIGN KEY (satellite) REFERENCES internal.satellite(id);


--
-- Name: internal; Type: ACL; Schema: -; Owner: srv_dpmc
--

REVOKE ALL ON SCHEMA internal FROM PUBLIC;
REVOKE ALL ON SCHEMA internal FROM srv_dpmc;
GRANT ALL ON SCHEMA internal TO srv_dpmc;
GRANT ALL ON SCHEMA internal TO srv_s3ome_read;


--
-- Name: lta; Type: ACL; Schema: -; Owner: srv_dpmc
--

REVOKE ALL ON SCHEMA lta FROM PUBLIC;
REVOKE ALL ON SCHEMA lta FROM srv_dpmc;
GRANT ALL ON SCHEMA lta TO srv_dpmc;
GRANT USAGE ON SCHEMA lta TO srv_s3ome_read;


--
-- Name: processing; Type: ACL; Schema: -; Owner: srv_dpmc
--

REVOKE ALL ON SCHEMA processing FROM PUBLIC;
REVOKE ALL ON SCHEMA processing FROM srv_dpmc;
GRANT ALL ON SCHEMA processing TO srv_dpmc;
GRANT USAGE ON SCHEMA processing TO nagios;
GRANT USAGE ON SCHEMA processing TO srv_s3ome_read;


--
-- Name: public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO srv_dpmc;
GRANT ALL ON SCHEMA public TO PUBLIC;
GRANT USAGE ON SCHEMA public TO srv_s3ome_read;


--
-- Name: s3ome; Type: ACL; Schema: -; Owner: srv_dpmc
--

REVOKE ALL ON SCHEMA s3ome FROM PUBLIC;
REVOKE ALL ON SCHEMA s3ome FROM srv_dpmc;
GRANT ALL ON SCHEMA s3ome TO srv_dpmc;
GRANT USAGE ON SCHEMA s3ome TO srv_s3ome_read;


SET search_path = internal, pg_catalog;

--
-- Name: acquisition_chain; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE acquisition_chain FROM PUBLIC;
REVOKE ALL ON TABLE acquisition_chain FROM srv_dpmc;
GRANT ALL ON TABLE acquisition_chain TO srv_dpmc;
GRANT SELECT ON TABLE acquisition_chain TO srv_s3ome_read;


--
-- Name: adf_baseline; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE adf_baseline FROM PUBLIC;
REVOKE ALL ON TABLE adf_baseline FROM srv_dpmc;
GRANT ALL ON TABLE adf_baseline TO srv_dpmc;
GRANT SELECT ON TABLE adf_baseline TO srv_s3ome_read;


--
-- Name: auxiliary_configuration; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE auxiliary_configuration FROM PUBLIC;
REVOKE ALL ON TABLE auxiliary_configuration FROM srv_dpmc;
GRANT ALL ON TABLE auxiliary_configuration TO srv_dpmc;
GRANT SELECT ON TABLE auxiliary_configuration TO srv_s3ome_read;


--
-- Name: auxiliary_configuration_detail; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE auxiliary_configuration_detail FROM PUBLIC;
REVOKE ALL ON TABLE auxiliary_configuration_detail FROM srv_dpmc;
GRANT ALL ON TABLE auxiliary_configuration_detail TO srv_dpmc;
GRANT SELECT ON TABLE auxiliary_configuration_detail TO srv_s3ome_read;


--
-- Name: auxiliary_product; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE auxiliary_product FROM PUBLIC;
REVOKE ALL ON TABLE auxiliary_product FROM srv_dpmc;
GRANT ALL ON TABLE auxiliary_product TO srv_dpmc;
GRANT SELECT ON TABLE auxiliary_product TO srv_s3ome_read;


--
-- Name: center; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE center FROM PUBLIC;
REVOKE ALL ON TABLE center FROM srv_dpmc;
GRANT ALL ON TABLE center TO srv_dpmc;
GRANT SELECT ON TABLE center TO srv_s3ome_read;


--
-- Name: center_x_software; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE center_x_software FROM PUBLIC;
REVOKE ALL ON TABLE center_x_software FROM srv_dpmc;
GRANT ALL ON TABLE center_x_software TO srv_dpmc;
GRANT SELECT ON TABLE center_x_software TO srv_s3ome_read;


--
-- Name: communication_request; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE communication_request FROM PUBLIC;
REVOKE ALL ON TABLE communication_request FROM srv_dpmc;
GRANT ALL ON TABLE communication_request TO srv_dpmc;
GRANT SELECT ON TABLE communication_request TO srv_s3ome_read;


--
-- Name: current_software; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE current_software FROM PUBLIC;
REVOKE ALL ON TABLE current_software FROM srv_dpmc;
GRANT ALL ON TABLE current_software TO srv_dpmc;
GRANT SELECT ON TABLE current_software TO srv_s3ome_read;


--
-- Name: data_type; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE data_type FROM PUBLIC;
REVOKE ALL ON TABLE data_type FROM srv_dpmc;
GRANT ALL ON TABLE data_type TO srv_dpmc;
GRANT SELECT ON TABLE data_type TO srv_s3ome_read;


--
-- Name: dataset; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE dataset FROM PUBLIC;
REVOKE ALL ON TABLE dataset FROM srv_dpmc;
GRANT ALL ON TABLE dataset TO srv_dpmc;
GRANT SELECT ON TABLE dataset TO srv_s3ome_read;


--
-- Name: dataset_x_product; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE dataset_x_product FROM PUBLIC;
REVOKE ALL ON TABLE dataset_x_product FROM srv_dpmc;
GRANT ALL ON TABLE dataset_x_product TO srv_dpmc;
GRANT SELECT ON TABLE dataset_x_product TO srv_s3ome_read;


--
-- Name: product; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE product FROM PUBLIC;
REVOKE ALL ON TABLE product FROM srv_dpmc;
GRANT ALL ON TABLE product TO srv_dpmc;
GRANT SELECT ON TABLE product TO srv_s3ome_read;


--
-- Name: dataset_content; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE dataset_content FROM PUBLIC;
REVOKE ALL ON TABLE dataset_content FROM srv_dpmc;
GRANT ALL ON TABLE dataset_content TO srv_dpmc;
GRANT SELECT ON TABLE dataset_content TO srv_s3ome_read;


--
-- Name: dataset_x_dataset; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE dataset_x_dataset FROM PUBLIC;
REVOKE ALL ON TABLE dataset_x_dataset FROM srv_dpmc;
GRANT ALL ON TABLE dataset_x_dataset TO srv_dpmc;
GRANT SELECT ON TABLE dataset_x_dataset TO srv_s3ome_read;


--
-- Name: dataset_x_document; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE dataset_x_document FROM PUBLIC;
REVOKE ALL ON TABLE dataset_x_document FROM srv_dpmc;
GRANT ALL ON TABLE dataset_x_document TO srv_dpmc;
GRANT SELECT ON TABLE dataset_x_document TO srv_s3ome_read;


--
-- Name: default_center_x_product_type_software; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE default_center_x_product_type_software FROM PUBLIC;
REVOKE ALL ON TABLE default_center_x_product_type_software FROM srv_dpmc;
GRANT ALL ON TABLE default_center_x_product_type_software TO srv_dpmc;
GRANT SELECT ON TABLE default_center_x_product_type_software TO srv_s3ome_read;


--
-- Name: default_processing; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE default_processing FROM PUBLIC;
REVOKE ALL ON TABLE default_processing FROM srv_dpmc;
GRANT ALL ON TABLE default_processing TO srv_dpmc;
GRANT SELECT ON TABLE default_processing TO srv_s3ome_read;


--
-- Name: distribution; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE distribution FROM PUBLIC;
REVOKE ALL ON TABLE distribution FROM srv_dpmc;
GRANT ALL ON TABLE distribution TO srv_dpmc;
GRANT SELECT ON TABLE distribution TO srv_s3ome_read;


--
-- Name: document; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE document FROM PUBLIC;
REVOKE ALL ON TABLE document FROM srv_dpmc;
GRANT ALL ON TABLE document TO srv_dpmc;
GRANT SELECT ON TABLE document TO srv_s3ome_read;


--
-- Name: error_type; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE error_type FROM PUBLIC;
REVOKE ALL ON TABLE error_type FROM srv_dpmc;
GRANT ALL ON TABLE error_type TO srv_dpmc;
GRANT SELECT ON TABLE error_type TO srv_s3ome_read;


--
-- Name: error_type_x_product; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE error_type_x_product FROM PUBLIC;
REVOKE ALL ON TABLE error_type_x_product FROM srv_dpmc;
GRANT ALL ON TABLE error_type_x_product TO srv_dpmc;
GRANT SELECT ON TABLE error_type_x_product TO srv_s3ome_read;


--
-- Name: first_nadir_point; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE first_nadir_point FROM PUBLIC;
REVOKE ALL ON TABLE first_nadir_point FROM srv_dpmc;
GRANT ALL ON TABLE first_nadir_point TO srv_dpmc;
GRANT SELECT ON TABLE first_nadir_point TO srv_s3ome_read;


--
-- Name: footprint; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE footprint FROM PUBLIC;
REVOKE ALL ON TABLE footprint FROM srv_dpmc;
GRANT ALL ON TABLE footprint TO srv_dpmc;
GRANT SELECT ON TABLE footprint TO srv_s3ome_read;


--
-- Name: ipf_processing_baseline; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE ipf_processing_baseline FROM PUBLIC;
REVOKE ALL ON TABLE ipf_processing_baseline FROM srv_dpmc;
GRANT ALL ON TABLE ipf_processing_baseline TO srv_dpmc;
GRANT SELECT ON TABLE ipf_processing_baseline TO srv_s3ome_read;


--
-- Name: ipf_processing_baseline_x_sxa; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE ipf_processing_baseline_x_sxa FROM PUBLIC;
REVOKE ALL ON TABLE ipf_processing_baseline_x_sxa FROM srv_dpmc;
GRANT ALL ON TABLE ipf_processing_baseline_x_sxa TO srv_dpmc;
GRANT SELECT ON TABLE ipf_processing_baseline_x_sxa TO srv_s3ome_read;


--
-- Name: product_type; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE product_type FROM PUBLIC;
REVOKE ALL ON TABLE product_type FROM srv_dpmc;
GRANT ALL ON TABLE product_type TO srv_dpmc;
GRANT SELECT ON TABLE product_type TO srv_s3ome_read;


--
-- Name: software; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE software FROM PUBLIC;
REVOKE ALL ON TABLE software FROM srv_dpmc;
GRANT ALL ON TABLE software TO srv_dpmc;
GRANT SELECT ON TABLE software TO srv_s3ome_read;


--
-- Name: software_x_auxiliary_configuration; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE software_x_auxiliary_configuration FROM PUBLIC;
REVOKE ALL ON TABLE software_x_auxiliary_configuration FROM srv_dpmc;
GRANT ALL ON TABLE software_x_auxiliary_configuration TO srv_dpmc;
GRANT SELECT ON TABLE software_x_auxiliary_configuration TO srv_s3ome_read;


--
-- Name: give_ipf_processing_baseline; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE give_ipf_processing_baseline FROM PUBLIC;
REVOKE ALL ON TABLE give_ipf_processing_baseline FROM srv_dpmc;
GRANT ALL ON TABLE give_ipf_processing_baseline TO srv_dpmc;
GRANT SELECT ON TABLE give_ipf_processing_baseline TO srv_s3ome_read;


--
-- Name: give_ipf_processing_sxac; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE give_ipf_processing_sxac FROM PUBLIC;
REVOKE ALL ON TABLE give_ipf_processing_sxac FROM srv_dpmc;
GRANT ALL ON TABLE give_ipf_processing_sxac TO srv_dpmc;
GRANT SELECT ON TABLE give_ipf_processing_sxac TO srv_s3ome_read;


--
-- Name: give_one_full_baseline; Type: ACL; Schema: internal; Owner: postgres
--

REVOKE ALL ON TABLE give_one_full_baseline FROM PUBLIC;
REVOKE ALL ON TABLE give_one_full_baseline FROM postgres;
GRANT ALL ON TABLE give_one_full_baseline TO postgres;
GRANT SELECT ON TABLE give_one_full_baseline TO srv_s3ome_read;


--
-- Name: global; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE global FROM PUBLIC;
REVOKE ALL ON TABLE global FROM srv_dpmc;
GRANT ALL ON TABLE global TO srv_dpmc;
GRANT SELECT ON TABLE global TO srv_s3ome_read;


--
-- Name: image_processing_input; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE image_processing_input FROM PUBLIC;
REVOKE ALL ON TABLE image_processing_input FROM srv_dpmc;
GRANT ALL ON TABLE image_processing_input TO srv_dpmc;
GRANT SELECT ON TABLE image_processing_input TO srv_s3ome_read;


--
-- Name: imaging_instrument; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE imaging_instrument FROM PUBLIC;
REVOKE ALL ON TABLE imaging_instrument FROM srv_dpmc;
GRANT ALL ON TABLE imaging_instrument TO srv_dpmc;
GRANT SELECT ON TABLE imaging_instrument TO srv_s3ome_read;


--
-- Name: instrument; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE instrument FROM PUBLIC;
REVOKE ALL ON TABLE instrument FROM srv_dpmc;
GRANT ALL ON TABLE instrument TO srv_dpmc;
GRANT SELECT ON TABLE instrument TO srv_s3ome_read;


--
-- Name: instrument_calibration_history; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE instrument_calibration_history FROM PUBLIC;
REVOKE ALL ON TABLE instrument_calibration_history FROM srv_dpmc;
GRANT ALL ON TABLE instrument_calibration_history TO srv_dpmc;
GRANT SELECT ON TABLE instrument_calibration_history TO srv_s3ome_read;


--
-- Name: instrument_unavailability_period; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE instrument_unavailability_period FROM PUBLIC;
REVOKE ALL ON TABLE instrument_unavailability_period FROM srv_dpmc;
GRANT ALL ON TABLE instrument_unavailability_period TO srv_dpmc;
GRANT SELECT ON TABLE instrument_unavailability_period TO srv_s3ome_read;


--
-- Name: ipf_x_dynamic_adf; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE ipf_x_dynamic_adf FROM PUBLIC;
REVOKE ALL ON TABLE ipf_x_dynamic_adf FROM srv_dpmc;
GRANT ALL ON TABLE ipf_x_dynamic_adf TO srv_dpmc;
GRANT SELECT ON TABLE ipf_x_dynamic_adf TO srv_s3ome_read;


--
-- Name: living_request; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE living_request FROM PUBLIC;
REVOKE ALL ON TABLE living_request FROM srv_dpmc;
GRANT ALL ON TABLE living_request TO srv_dpmc;
GRANT SELECT ON TABLE living_request TO srv_s3ome_read;


--
-- Name: mailing_list; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE mailing_list FROM PUBLIC;
REVOKE ALL ON TABLE mailing_list FROM srv_dpmc;
GRANT ALL ON TABLE mailing_list TO srv_dpmc;
GRANT SELECT ON TABLE mailing_list TO srv_s3ome_read;


--
-- Name: media; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE media FROM PUBLIC;
REVOKE ALL ON TABLE media FROM srv_dpmc;
GRANT ALL ON TABLE media TO srv_dpmc;
GRANT SELECT ON TABLE media TO srv_s3ome_read;


--
-- Name: media_catalog; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE media_catalog FROM PUBLIC;
REVOKE ALL ON TABLE media_catalog FROM srv_dpmc;
GRANT ALL ON TABLE media_catalog TO srv_dpmc;
GRANT SELECT ON TABLE media_catalog TO srv_s3ome_read;


--
-- Name: media_catalog_entry; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE media_catalog_entry FROM PUBLIC;
REVOKE ALL ON TABLE media_catalog_entry FROM srv_dpmc;
GRANT ALL ON TABLE media_catalog_entry TO srv_dpmc;
GRANT SELECT ON TABLE media_catalog_entry TO srv_s3ome_read;


--
-- Name: media_history; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE media_history FROM PUBLIC;
REVOKE ALL ON TABLE media_history FROM srv_dpmc;
GRANT ALL ON TABLE media_history TO srv_dpmc;
GRANT SELECT ON TABLE media_history TO srv_s3ome_read;


--
-- Name: media_history_type; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE media_history_type FROM PUBLIC;
REVOKE ALL ON TABLE media_history_type FROM srv_dpmc;
GRANT ALL ON TABLE media_history_type TO srv_dpmc;
GRANT SELECT ON TABLE media_history_type TO srv_s3ome_read;


--
-- Name: media_info; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE media_info FROM PUBLIC;
REVOKE ALL ON TABLE media_info FROM srv_dpmc;
GRANT ALL ON TABLE media_info TO srv_dpmc;
GRANT ALL ON TABLE media_info TO PUBLIC;
GRANT SELECT ON TABLE media_info TO srv_s3ome_read;


--
-- Name: media_status; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE media_status FROM PUBLIC;
REVOKE ALL ON TABLE media_status FROM srv_dpmc;
GRANT ALL ON TABLE media_status TO srv_dpmc;
GRANT ALL ON TABLE media_status TO PUBLIC;
GRANT SELECT ON TABLE media_status TO srv_s3ome_read;


--
-- Name: media_type; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE media_type FROM PUBLIC;
REVOKE ALL ON TABLE media_type FROM srv_dpmc;
GRANT ALL ON TABLE media_type TO srv_dpmc;
GRANT SELECT ON TABLE media_type TO srv_s3ome_read;


--
-- Name: mode; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE mode FROM PUBLIC;
REVOKE ALL ON TABLE mode FROM srv_dpmc;
GRANT ALL ON TABLE mode TO srv_dpmc;
GRANT SELECT ON TABLE mode TO srv_s3ome_read;


--
-- Name: mode_x_product_type; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE mode_x_product_type FROM PUBLIC;
REVOKE ALL ON TABLE mode_x_product_type FROM srv_dpmc;
GRANT ALL ON TABLE mode_x_product_type TO srv_dpmc;
GRANT SELECT ON TABLE mode_x_product_type TO srv_s3ome_read;


--
-- Name: on_board_time; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE on_board_time FROM PUBLIC;
REVOKE ALL ON TABLE on_board_time FROM srv_dpmc;
GRANT ALL ON TABLE on_board_time TO srv_dpmc;
GRANT SELECT ON TABLE on_board_time TO srv_s3ome_read;


--
-- Name: orbit; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE orbit FROM PUBLIC;
REVOKE ALL ON TABLE orbit FROM srv_dpmc;
GRANT ALL ON TABLE orbit TO srv_dpmc;
GRANT SELECT ON TABLE orbit TO srv_s3ome_read;


--
-- Name: priority; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE priority FROM PUBLIC;
REVOKE ALL ON TABLE priority FROM srv_dpmc;
GRANT ALL ON TABLE priority TO srv_dpmc;
GRANT SELECT ON TABLE priority TO srv_s3ome_read;


--
-- Name: priority_x_product; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE priority_x_product FROM PUBLIC;
REVOKE ALL ON TABLE priority_x_product FROM srv_dpmc;
GRANT ALL ON TABLE priority_x_product TO srv_dpmc;
GRANT SELECT ON TABLE priority_x_product TO srv_s3ome_read;


--
-- Name: processing; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE processing FROM PUBLIC;
REVOKE ALL ON TABLE processing FROM srv_dpmc;
GRANT ALL ON TABLE processing TO srv_dpmc;
GRANT SELECT ON TABLE processing TO srv_s3ome_read;


--
-- Name: processing_chain; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE processing_chain FROM PUBLIC;
REVOKE ALL ON TABLE processing_chain FROM srv_dpmc;
GRANT ALL ON TABLE processing_chain TO srv_dpmc;
GRANT SELECT ON TABLE processing_chain TO srv_s3ome_read;


--
-- Name: processing_configuration; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE processing_configuration FROM PUBLIC;
REVOKE ALL ON TABLE processing_configuration FROM srv_dpmc;
GRANT ALL ON TABLE processing_configuration TO srv_dpmc;
GRANT SELECT ON TABLE processing_configuration TO srv_s3ome_read;


--
-- Name: processing_input; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE processing_input FROM PUBLIC;
REVOKE ALL ON TABLE processing_input FROM srv_dpmc;
GRANT ALL ON TABLE processing_input TO srv_dpmc;
GRANT SELECT ON TABLE processing_input TO srv_s3ome_read;


--
-- Name: product_media; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE product_media FROM PUBLIC;
REVOKE ALL ON TABLE product_media FROM srv_dpmc;
GRANT ALL ON TABLE product_media TO srv_dpmc;
GRANT SELECT ON TABLE product_media TO srv_s3ome_read;


--
-- Name: product_x_media_catalog_entry; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE product_x_media_catalog_entry FROM PUBLIC;
REVOKE ALL ON TABLE product_x_media_catalog_entry FROM srv_dpmc;
GRANT ALL ON TABLE product_x_media_catalog_entry TO srv_dpmc;
GRANT SELECT ON TABLE product_x_media_catalog_entry TO srv_s3ome_read;


--
-- Name: sensing_product; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE sensing_product FROM PUBLIC;
REVOKE ALL ON TABLE sensing_product FROM srv_dpmc;
GRANT ALL ON TABLE sensing_product TO srv_dpmc;
GRANT SELECT ON TABLE sensing_product TO srv_s3ome_read;


--
-- Name: product_path; Type: ACL; Schema: internal; Owner: postgres
--

REVOKE ALL ON TABLE product_path FROM PUBLIC;
REVOKE ALL ON TABLE product_path FROM postgres;
GRANT ALL ON TABLE product_path TO postgres;
GRANT SELECT ON TABLE product_path TO srv_s3ome_read;


--
-- Name: product_time_range; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE product_time_range FROM PUBLIC;
REVOKE ALL ON TABLE product_time_range FROM srv_dpmc;
GRANT ALL ON TABLE product_time_range TO srv_dpmc;
GRANT SELECT ON TABLE product_time_range TO srv_s3ome_read;


--
-- Name: product_type_chain; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE product_type_chain FROM PUBLIC;
REVOKE ALL ON TABLE product_type_chain FROM srv_dpmc;
GRANT ALL ON TABLE product_type_chain TO srv_dpmc;
GRANT SELECT ON TABLE product_type_chain TO srv_s3ome_read;


--
-- Name: product_type_dependency; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE product_type_dependency FROM PUBLIC;
REVOKE ALL ON TABLE product_type_dependency FROM srv_dpmc;
GRANT ALL ON TABLE product_type_dependency TO srv_dpmc;
GRANT SELECT ON TABLE product_type_dependency TO srv_s3ome_read;


--
-- Name: product_type_link; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE product_type_link FROM PUBLIC;
REVOKE ALL ON TABLE product_type_link FROM srv_dpmc;
GRANT ALL ON TABLE product_type_link TO srv_dpmc;
GRANT SELECT ON TABLE product_type_link TO srv_s3ome_read;


--
-- Name: product_x_sequential_media; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE product_x_sequential_media FROM PUBLIC;
REVOKE ALL ON TABLE product_x_sequential_media FROM srv_dpmc;
GRANT ALL ON TABLE product_x_sequential_media TO srv_dpmc;
GRANT SELECT ON TABLE product_x_sequential_media TO srv_s3ome_read;


--
-- Name: pushed_products; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE pushed_products FROM PUBLIC;
REVOKE ALL ON TABLE pushed_products FROM srv_dpmc;
GRANT ALL ON TABLE pushed_products TO srv_dpmc;
GRANT SELECT ON TABLE pushed_products TO srv_s3ome_read;


--
-- Name: recipient; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE recipient FROM PUBLIC;
REVOKE ALL ON TABLE recipient FROM srv_dpmc;
GRANT ALL ON TABLE recipient TO srv_dpmc;
GRANT SELECT ON TABLE recipient TO srv_s3ome_read;


--
-- Name: rectangular_site; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE rectangular_site FROM PUBLIC;
REVOKE ALL ON TABLE rectangular_site FROM srv_dpmc;
GRANT ALL ON TABLE rectangular_site TO srv_dpmc;
GRANT SELECT ON TABLE rectangular_site TO srv_s3ome_read;


--
-- Name: reference_tie_frame; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE reference_tie_frame FROM PUBLIC;
REVOKE ALL ON TABLE reference_tie_frame FROM srv_dpmc;
GRANT ALL ON TABLE reference_tie_frame TO srv_dpmc;
GRANT SELECT ON TABLE reference_tie_frame TO srv_s3ome_read;


--
-- Name: relative_orbit; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE relative_orbit FROM PUBLIC;
REVOKE ALL ON TABLE relative_orbit FROM srv_dpmc;
GRANT ALL ON TABLE relative_orbit TO srv_dpmc;
GRANT SELECT ON TABLE relative_orbit TO srv_s3ome_read;


--
-- Name: reprocessing; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE reprocessing FROM PUBLIC;
REVOKE ALL ON TABLE reprocessing FROM srv_dpmc;
GRANT ALL ON TABLE reprocessing TO srv_dpmc;
GRANT SELECT ON TABLE reprocessing TO srv_s3ome_read;


--
-- Name: request; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE request FROM PUBLIC;
REVOKE ALL ON TABLE request FROM srv_dpmc;
GRANT ALL ON TABLE request TO srv_dpmc;
GRANT SELECT ON TABLE request TO srv_s3ome_read;


--
-- Name: request_description; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE request_description FROM PUBLIC;
REVOKE ALL ON TABLE request_description FROM srv_dpmc;
GRANT ALL ON TABLE request_description TO srv_dpmc;
GRANT SELECT ON TABLE request_description TO srv_s3ome_read;


--
-- Name: site; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE site FROM PUBLIC;
REVOKE ALL ON TABLE site FROM srv_dpmc;
GRANT ALL ON TABLE site TO srv_dpmc;
GRANT SELECT ON TABLE site TO srv_s3ome_read;


SET search_path = processing, pg_catalog;

--
-- Name: pool; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE pool FROM PUBLIC;
REVOKE ALL ON TABLE pool FROM srv_dpmc;
GRANT ALL ON TABLE pool TO srv_dpmc;
GRANT SELECT ON TABLE pool TO nagios;
GRANT SELECT ON TABLE pool TO srv_s3ome_read;


--
-- Name: processing_comment; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE processing_comment FROM PUBLIC;
REVOKE ALL ON TABLE processing_comment FROM srv_dpmc;
GRANT ALL ON TABLE processing_comment TO srv_dpmc;
GRANT SELECT ON TABLE processing_comment TO nagios;
GRANT SELECT ON TABLE processing_comment TO srv_s3ome_read;


--
-- Name: processing_set; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE processing_set FROM PUBLIC;
REVOKE ALL ON TABLE processing_set FROM srv_dpmc;
GRANT ALL ON TABLE processing_set TO srv_dpmc;
GRANT SELECT ON TABLE processing_set TO nagios;
GRANT SELECT ON TABLE processing_set TO srv_s3ome_read;


SET search_path = internal, pg_catalog;

--
-- Name: request_detail_site; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE request_detail_site FROM PUBLIC;
REVOKE ALL ON TABLE request_detail_site FROM srv_dpmc;
GRANT ALL ON TABLE request_detail_site TO srv_dpmc;
GRANT SELECT ON TABLE request_detail_site TO srv_s3ome_read;


--
-- Name: request_details; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE request_details FROM PUBLIC;
REVOKE ALL ON TABLE request_details FROM srv_dpmc;
GRANT ALL ON TABLE request_details TO srv_dpmc;
GRANT SELECT ON TABLE request_details TO srv_s3ome_read;


--
-- Name: request_group; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE request_group FROM PUBLIC;
REVOKE ALL ON TABLE request_group FROM srv_dpmc;
GRANT ALL ON TABLE request_group TO srv_dpmc;
GRANT SELECT ON TABLE request_group TO srv_s3ome_read;


--
-- Name: request_group_x_request; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE request_group_x_request FROM PUBLIC;
REVOKE ALL ON TABLE request_group_x_request FROM srv_dpmc;
GRANT ALL ON TABLE request_group_x_request TO srv_dpmc;
GRANT SELECT ON TABLE request_group_x_request TO srv_s3ome_read;


--
-- Name: request_x_data_type; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE request_x_data_type FROM PUBLIC;
REVOKE ALL ON TABLE request_x_data_type FROM srv_dpmc;
GRANT ALL ON TABLE request_x_data_type TO srv_dpmc;
GRANT SELECT ON TABLE request_x_data_type TO srv_s3ome_read;


--
-- Name: request_x_processing; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE request_x_processing FROM PUBLIC;
REVOKE ALL ON TABLE request_x_processing FROM srv_dpmc;
GRANT ALL ON TABLE request_x_processing TO srv_dpmc;
GRANT SELECT ON TABLE request_x_processing TO srv_s3ome_read;


--
-- Name: request_x_product; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE request_x_product FROM PUBLIC;
REVOKE ALL ON TABLE request_x_product FROM srv_dpmc;
GRANT ALL ON TABLE request_x_product TO srv_dpmc;
GRANT SELECT ON TABLE request_x_product TO srv_s3ome_read;


--
-- Name: requester; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE requester FROM PUBLIC;
REVOKE ALL ON TABLE requester FROM srv_dpmc;
GRANT ALL ON TABLE requester TO srv_dpmc;
GRANT SELECT ON TABLE requester TO srv_s3ome_read;


--
-- Name: satellite; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE satellite FROM PUBLIC;
REVOKE ALL ON TABLE satellite FROM srv_dpmc;
GRANT ALL ON TABLE satellite TO srv_dpmc;
GRANT SELECT ON TABLE satellite TO srv_s3ome_read;


--
-- Name: satellite_phase; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE satellite_phase FROM PUBLIC;
REVOKE ALL ON TABLE satellite_phase FROM srv_dpmc;
GRANT ALL ON TABLE satellite_phase TO srv_dpmc;
GRANT SELECT ON TABLE satellite_phase TO srv_s3ome_read;


--
-- Name: server_account; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE server_account FROM PUBLIC;
REVOKE ALL ON TABLE server_account FROM srv_dpmc;
GRANT ALL ON TABLE server_account TO srv_dpmc;
GRANT SELECT ON TABLE server_account TO srv_s3ome_read;


--
-- Name: site_coverage; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE site_coverage FROM PUBLIC;
REVOKE ALL ON TABLE site_coverage FROM srv_dpmc;
GRANT ALL ON TABLE site_coverage TO srv_dpmc;
GRANT SELECT ON TABLE site_coverage TO srv_s3ome_read;


--
-- Name: software_x_binary; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE software_x_binary FROM PUBLIC;
REVOKE ALL ON TABLE software_x_binary FROM srv_dpmc;
GRANT ALL ON TABLE software_x_binary TO srv_dpmc;
GRANT SELECT ON TABLE software_x_binary TO srv_s3ome_read;


--
-- Name: software_x_product_type; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE software_x_product_type FROM PUBLIC;
REVOKE ALL ON TABLE software_x_product_type FROM srv_dpmc;
GRANT ALL ON TABLE software_x_product_type TO srv_dpmc;
GRANT SELECT ON TABLE software_x_product_type TO srv_s3ome_read;


--
-- Name: state_vector; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE state_vector FROM PUBLIC;
REVOKE ALL ON TABLE state_vector FROM srv_dpmc;
GRANT ALL ON TABLE state_vector TO srv_dpmc;
GRANT SELECT ON TABLE state_vector TO srv_s3ome_read;


--
-- Name: state_vector_source; Type: ACL; Schema: internal; Owner: srv_dpmc
--

REVOKE ALL ON TABLE state_vector_source FROM PUBLIC;
REVOKE ALL ON TABLE state_vector_source FROM srv_dpmc;
GRANT ALL ON TABLE state_vector_source TO srv_dpmc;
GRANT SELECT ON TABLE state_vector_source TO srv_s3ome_read;


SET search_path = lta, pg_catalog;

--
-- Name: abort; Type: ACL; Schema: lta; Owner: srv_dpmc
--

REVOKE ALL ON TABLE abort FROM PUBLIC;
REVOKE ALL ON TABLE abort FROM srv_dpmc;
GRANT ALL ON TABLE abort TO srv_dpmc;
GRANT SELECT ON TABLE abort TO srv_s3ome_read;


--
-- Name: direct; Type: ACL; Schema: lta; Owner: srv_dpmc
--

REVOKE ALL ON TABLE direct FROM PUBLIC;
REVOKE ALL ON TABLE direct FROM srv_dpmc;
GRANT ALL ON TABLE direct TO srv_dpmc;
GRANT SELECT ON TABLE direct TO srv_s3ome_read;


--
-- Name: transaction; Type: ACL; Schema: lta; Owner: srv_dpmc
--

REVOKE ALL ON TABLE transaction FROM PUBLIC;
REVOKE ALL ON TABLE transaction FROM srv_dpmc;
GRANT ALL ON TABLE transaction TO srv_dpmc;
GRANT SELECT ON TABLE transaction TO srv_s3ome_read;


--
-- Name: active_transactions; Type: ACL; Schema: lta; Owner: srv_dpmc
--

REVOKE ALL ON TABLE active_transactions FROM PUBLIC;
REVOKE ALL ON TABLE active_transactions FROM srv_dpmc;
GRANT ALL ON TABLE active_transactions TO srv_dpmc;
GRANT SELECT ON TABLE active_transactions TO srv_s3ome_read;


--
-- Name: archive; Type: ACL; Schema: lta; Owner: srv_dpmc
--

REVOKE ALL ON TABLE archive FROM PUBLIC;
REVOKE ALL ON TABLE archive FROM srv_dpmc;
GRANT ALL ON TABLE archive TO srv_dpmc;
GRANT SELECT ON TABLE archive TO srv_s3ome_read;


--
-- Name: check; Type: ACL; Schema: lta; Owner: srv_dpmc
--

REVOKE ALL ON TABLE "check" FROM PUBLIC;
REVOKE ALL ON TABLE "check" FROM srv_dpmc;
GRANT ALL ON TABLE "check" TO srv_dpmc;
GRANT SELECT ON TABLE "check" TO srv_s3ome_read;


--
-- Name: delete; Type: ACL; Schema: lta; Owner: srv_dpmc
--

REVOKE ALL ON TABLE delete FROM PUBLIC;
REVOKE ALL ON TABLE delete FROM srv_dpmc;
GRANT ALL ON TABLE delete TO srv_dpmc;
GRANT SELECT ON TABLE delete TO srv_s3ome_read;


--
-- Name: global; Type: ACL; Schema: lta; Owner: srv_dpmc
--

REVOKE ALL ON TABLE global FROM PUBLIC;
REVOKE ALL ON TABLE global FROM srv_dpmc;
GRANT ALL ON TABLE global TO srv_dpmc;
GRANT SELECT ON TABLE global TO srv_s3ome_read;


--
-- Name: ingestion; Type: ACL; Schema: lta; Owner: srv_dpmc
--

REVOKE ALL ON TABLE ingestion FROM PUBLIC;
REVOKE ALL ON TABLE ingestion FROM srv_dpmc;
GRANT ALL ON TABLE ingestion TO srv_dpmc;
GRANT SELECT ON TABLE ingestion TO srv_s3ome_read;


--
-- Name: product_status; Type: ACL; Schema: lta; Owner: srv_dpmc
--

REVOKE ALL ON TABLE product_status FROM PUBLIC;
REVOKE ALL ON TABLE product_status FROM srv_dpmc;
GRANT ALL ON TABLE product_status TO srv_dpmc;
GRANT SELECT ON TABLE product_status TO srv_s3ome_read;


--
-- Name: last_products_status; Type: ACL; Schema: lta; Owner: srv_dpmc
--

REVOKE ALL ON TABLE last_products_status FROM PUBLIC;
REVOKE ALL ON TABLE last_products_status FROM srv_dpmc;
GRANT ALL ON TABLE last_products_status TO srv_dpmc;
GRANT SELECT ON TABLE last_products_status TO srv_s3ome_read;


--
-- Name: monitoring; Type: ACL; Schema: lta; Owner: srv_dpmc
--

REVOKE ALL ON TABLE monitoring FROM PUBLIC;
REVOKE ALL ON TABLE monitoring FROM srv_dpmc;
GRANT ALL ON TABLE monitoring TO srv_dpmc;
GRANT SELECT ON TABLE monitoring TO srv_s3ome_read;


--
-- Name: not_archived_products; Type: ACL; Schema: lta; Owner: srv_dpmc
--

REVOKE ALL ON TABLE not_archived_products FROM PUBLIC;
REVOKE ALL ON TABLE not_archived_products FROM srv_dpmc;
GRANT ALL ON TABLE not_archived_products TO srv_dpmc;
GRANT SELECT ON TABLE not_archived_products TO srv_s3ome_read;


--
-- Name: query; Type: ACL; Schema: lta; Owner: srv_dpmc
--

REVOKE ALL ON TABLE query FROM PUBLIC;
REVOKE ALL ON TABLE query FROM srv_dpmc;
GRANT ALL ON TABLE query TO srv_dpmc;
GRANT SELECT ON TABLE query TO srv_s3ome_read;


--
-- Name: retrieval; Type: ACL; Schema: lta; Owner: srv_dpmc
--

REVOKE ALL ON TABLE retrieval FROM PUBLIC;
REVOKE ALL ON TABLE retrieval FROM srv_dpmc;
GRANT ALL ON TABLE retrieval TO srv_dpmc;
GRANT SELECT ON TABLE retrieval TO srv_s3ome_read;


--
-- Name: transaction_type; Type: ACL; Schema: lta; Owner: srv_dpmc
--

REVOKE ALL ON TABLE transaction_type FROM PUBLIC;
REVOKE ALL ON TABLE transaction_type FROM srv_dpmc;
GRANT ALL ON TABLE transaction_type TO srv_dpmc;
GRANT SELECT ON TABLE transaction_type TO srv_s3ome_read;


--
-- Name: transaction_type_x_request; Type: ACL; Schema: lta; Owner: srv_dpmc
--

REVOKE ALL ON TABLE transaction_type_x_request FROM PUBLIC;
REVOKE ALL ON TABLE transaction_type_x_request FROM srv_dpmc;
GRANT ALL ON TABLE transaction_type_x_request TO srv_dpmc;
GRANT SELECT ON TABLE transaction_type_x_request TO srv_s3ome_read;


--
-- Name: transactions_details; Type: ACL; Schema: lta; Owner: srv_dpmc
--

REVOKE ALL ON TABLE transactions_details FROM PUBLIC;
REVOKE ALL ON TABLE transactions_details FROM srv_dpmc;
GRANT ALL ON TABLE transactions_details TO srv_dpmc;
GRANT SELECT ON TABLE transactions_details TO srv_s3ome_read;


SET search_path = processing, pg_catalog;

--
-- Name: hosts; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE hosts FROM PUBLIC;
REVOKE ALL ON TABLE hosts FROM srv_dpmc;
GRANT ALL ON TABLE hosts TO srv_dpmc;
GRANT SELECT ON TABLE hosts TO nagios;
GRANT SELECT ON TABLE hosts TO srv_s3ome_read;


--
-- Name: top; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE top FROM PUBLIC;
REVOKE ALL ON TABLE top FROM srv_dpmc;
GRANT ALL ON TABLE top TO srv_dpmc;
GRANT SELECT ON TABLE top TO nagios;
GRANT SELECT ON TABLE top TO srv_s3ome_read;


--
-- Name: available_hosts; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE available_hosts FROM PUBLIC;
REVOKE ALL ON TABLE available_hosts FROM srv_dpmc;
GRANT ALL ON TABLE available_hosts TO srv_dpmc;
GRANT SELECT ON TABLE available_hosts TO nagios;
GRANT SELECT ON TABLE available_hosts TO srv_s3ome_read;


--
-- Name: batch; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE batch FROM PUBLIC;
REVOKE ALL ON TABLE batch FROM srv_dpmc;
GRANT ALL ON TABLE batch TO srv_dpmc;
GRANT SELECT ON TABLE batch TO nagios;
GRANT SELECT ON TABLE batch TO srv_s3ome_read;


--
-- Name: batch_x_product; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE batch_x_product FROM PUBLIC;
REVOKE ALL ON TABLE batch_x_product FROM srv_dpmc;
GRANT ALL ON TABLE batch_x_product TO srv_dpmc;
GRANT SELECT ON TABLE batch_x_product TO nagios;
GRANT SELECT ON TABLE batch_x_product TO srv_s3ome_read;


--
-- Name: cache_lock; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE cache_lock FROM PUBLIC;
REVOKE ALL ON TABLE cache_lock FROM srv_dpmc;
GRANT ALL ON TABLE cache_lock TO srv_dpmc;
GRANT SELECT ON TABLE cache_lock TO nagios;
GRANT SELECT ON TABLE cache_lock TO srv_s3ome_read;


--
-- Name: history; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE history FROM PUBLIC;
REVOKE ALL ON TABLE history FROM srv_dpmc;
GRANT ALL ON TABLE history TO srv_dpmc;
GRANT SELECT ON TABLE history TO nagios;
GRANT SELECT ON TABLE history TO srv_s3ome_read;


--
-- Name: history_x_product; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE history_x_product FROM PUBLIC;
REVOKE ALL ON TABLE history_x_product FROM srv_dpmc;
GRANT ALL ON TABLE history_x_product TO srv_dpmc;
GRANT SELECT ON TABLE history_x_product TO nagios;
GRANT SELECT ON TABLE history_x_product TO srv_s3ome_read;


--
-- Name: hosts_comment; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE hosts_comment FROM PUBLIC;
REVOKE ALL ON TABLE hosts_comment FROM srv_dpmc;
GRANT ALL ON TABLE hosts_comment TO srv_dpmc;
GRANT SELECT ON TABLE hosts_comment TO nagios;
GRANT SELECT ON TABLE hosts_comment TO srv_s3ome_read;


--
-- Name: mutex; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE mutex FROM PUBLIC;
REVOKE ALL ON TABLE mutex FROM srv_dpmc;
GRANT ALL ON TABLE mutex TO srv_dpmc;
GRANT SELECT ON TABLE mutex TO nagios;
GRANT SELECT ON TABLE mutex TO srv_s3ome_read;


--
-- Name: output_file; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE output_file FROM PUBLIC;
REVOKE ALL ON TABLE output_file FROM srv_dpmc;
GRANT ALL ON TABLE output_file TO srv_dpmc;
GRANT SELECT ON TABLE output_file TO nagios;
GRANT SELECT ON TABLE output_file TO srv_s3ome_read;


--
-- Name: parameters_comment; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE parameters_comment FROM PUBLIC;
REVOKE ALL ON TABLE parameters_comment FROM srv_dpmc;
GRANT ALL ON TABLE parameters_comment TO srv_dpmc;
GRANT SELECT ON TABLE parameters_comment TO nagios;
GRANT SELECT ON TABLE parameters_comment TO srv_s3ome_read;


--
-- Name: parameters_set; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE parameters_set FROM PUBLIC;
REVOKE ALL ON TABLE parameters_set FROM srv_dpmc;
GRANT ALL ON TABLE parameters_set TO srv_dpmc;
GRANT SELECT ON TABLE parameters_set TO nagios;
GRANT SELECT ON TABLE parameters_set TO srv_s3ome_read;


--
-- Name: pool_x_hosts; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE pool_x_hosts FROM PUBLIC;
REVOKE ALL ON TABLE pool_x_hosts FROM srv_dpmc;
GRANT ALL ON TABLE pool_x_hosts TO srv_dpmc;
GRANT SELECT ON TABLE pool_x_hosts TO nagios;
GRANT SELECT ON TABLE pool_x_hosts TO srv_s3ome_read;


--
-- Name: processing_comment_x_product_type; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE processing_comment_x_product_type FROM PUBLIC;
REVOKE ALL ON TABLE processing_comment_x_product_type FROM srv_dpmc;
GRANT ALL ON TABLE processing_comment_x_product_type TO srv_dpmc;
GRANT SELECT ON TABLE processing_comment_x_product_type TO nagios;
GRANT SELECT ON TABLE processing_comment_x_product_type TO srv_s3ome_read;


--
-- Name: processing_type; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE processing_type FROM PUBLIC;
REVOKE ALL ON TABLE processing_type FROM srv_dpmc;
GRANT ALL ON TABLE processing_type TO srv_dpmc;
GRANT SELECT ON TABLE processing_type TO nagios;
GRANT SELECT ON TABLE processing_type TO srv_s3ome_read;


--
-- Name: queued_generic_batch; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE queued_generic_batch FROM PUBLIC;
REVOKE ALL ON TABLE queued_generic_batch FROM srv_dpmc;
GRANT ALL ON TABLE queued_generic_batch TO srv_dpmc;
GRANT SELECT ON TABLE queued_generic_batch TO nagios;
GRANT SELECT ON TABLE queued_generic_batch TO srv_s3ome_read;


--
-- Name: running_generic_batch; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE running_generic_batch FROM PUBLIC;
REVOKE ALL ON TABLE running_generic_batch FROM srv_dpmc;
GRANT ALL ON TABLE running_generic_batch TO srv_dpmc;
GRANT SELECT ON TABLE running_generic_batch TO nagios;
GRANT SELECT ON TABLE running_generic_batch TO srv_s3ome_read;


--
-- Name: waiting_batch; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE waiting_batch FROM PUBLIC;
REVOKE ALL ON TABLE waiting_batch FROM srv_dpmc;
GRANT ALL ON TABLE waiting_batch TO srv_dpmc;
GRANT SELECT ON TABLE waiting_batch TO nagios;
GRANT SELECT ON TABLE waiting_batch TO srv_s3ome_read;


--
-- Name: waiting_generic_batchs; Type: ACL; Schema: processing; Owner: srv_dpmc
--

REVOKE ALL ON TABLE waiting_generic_batchs FROM PUBLIC;
REVOKE ALL ON TABLE waiting_generic_batchs FROM srv_dpmc;
GRANT ALL ON TABLE waiting_generic_batchs TO srv_dpmc;
GRANT SELECT ON TABLE waiting_generic_batchs TO nagios;
GRANT SELECT ON TABLE waiting_generic_batchs TO srv_s3ome_read;


SET search_path = public, pg_catalog;

--
-- Name: active_transactions; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE active_transactions FROM PUBLIC;
REVOKE ALL ON TABLE active_transactions FROM srv_dpmc;
GRANT ALL ON TABLE active_transactions TO srv_dpmc;
GRANT SELECT ON TABLE active_transactions TO srv_s3ome_read;


--
-- Name: archived_and_online; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE archived_and_online FROM PUBLIC;
REVOKE ALL ON TABLE archived_and_online FROM srv_dpmc;
GRANT ALL ON TABLE archived_and_online TO srv_dpmc;
GRANT SELECT ON TABLE archived_and_online TO srv_s3ome_read;


--
-- Name: batch; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE batch FROM PUBLIC;
REVOKE ALL ON TABLE batch FROM srv_dpmc;
GRANT ALL ON TABLE batch TO srv_dpmc;
GRANT SELECT ON TABLE batch TO srv_s3ome_read;


--
-- Name: detail_top; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE detail_top FROM PUBLIC;
REVOKE ALL ON TABLE detail_top FROM srv_dpmc;
GRANT ALL ON TABLE detail_top TO srv_dpmc;
GRANT SELECT ON TABLE detail_top TO srv_s3ome_read;


--
-- Name: detail_top_old; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE detail_top_old FROM PUBLIC;
REVOKE ALL ON TABLE detail_top_old FROM srv_dpmc;
GRANT ALL ON TABLE detail_top_old TO srv_dpmc;
GRANT SELECT ON TABLE detail_top_old TO srv_s3ome_read;


--
-- Name: detail_top_s3; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE detail_top_s3 FROM PUBLIC;
REVOKE ALL ON TABLE detail_top_s3 FROM srv_dpmc;
GRANT ALL ON TABLE detail_top_s3 TO srv_dpmc;
GRANT SELECT ON TABLE detail_top_s3 TO srv_s3ome_read;


--
-- Name: detail_top_s3_old; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE detail_top_s3_old FROM PUBLIC;
REVOKE ALL ON TABLE detail_top_s3_old FROM srv_dpmc;
GRANT ALL ON TABLE detail_top_s3_old TO srv_dpmc;
GRANT SELECT ON TABLE detail_top_s3_old TO srv_s3ome_read;


--
-- Name: disk_location; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE disk_location FROM PUBLIC;
REVOKE ALL ON TABLE disk_location FROM srv_dpmc;
GRANT ALL ON TABLE disk_location TO srv_dpmc;
GRANT SELECT ON TABLE disk_location TO srv_s3ome_read;


--
-- Name: files_location; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE files_location FROM PUBLIC;
REVOKE ALL ON TABLE files_location FROM srv_dpmc;
GRANT ALL ON TABLE files_location TO srv_dpmc;
GRANT SELECT ON TABLE files_location TO srv_s3ome_read;


--
-- Name: files_location_in_cmg_project; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE files_location_in_cmg_project FROM PUBLIC;
REVOKE ALL ON TABLE files_location_in_cmg_project FROM srv_dpmc;
GRANT ALL ON TABLE files_location_in_cmg_project TO srv_dpmc;
GRANT SELECT ON TABLE files_location_in_cmg_project TO srv_s3ome_read;


--
-- Name: files_path; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE files_path FROM PUBLIC;
REVOKE ALL ON TABLE files_path FROM srv_dpmc;
GRANT ALL ON TABLE files_path TO srv_dpmc;
GRANT SELECT ON TABLE files_path TO srv_s3ome_read;


--
-- Name: hosts_current_ncpu; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE hosts_current_ncpu FROM PUBLIC;
REVOKE ALL ON TABLE hosts_current_ncpu FROM srv_dpmc;
GRANT ALL ON TABLE hosts_current_ncpu TO srv_dpmc;
GRANT SELECT ON TABLE hosts_current_ncpu TO srv_s3ome_read;


--
-- Name: image_request_x_product; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE image_request_x_product FROM PUBLIC;
REVOKE ALL ON TABLE image_request_x_product FROM srv_dpmc;
GRANT ALL ON TABLE image_request_x_product TO srv_dpmc;
GRANT SELECT ON TABLE image_request_x_product TO srv_s3ome_read;


--
-- Name: last_product; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE last_product FROM PUBLIC;
REVOKE ALL ON TABLE last_product FROM srv_dpmc;
GRANT ALL ON TABLE last_product TO srv_dpmc;
GRANT SELECT ON TABLE last_product TO srv_s3ome_read;


--
-- Name: max_id_baseline; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE max_id_baseline FROM PUBLIC;
REVOKE ALL ON TABLE max_id_baseline FROM srv_dpmc;
GRANT ALL ON TABLE max_id_baseline TO srv_dpmc;
GRANT SELECT ON TABLE max_id_baseline TO srv_s3ome_read;


--
-- Name: media_current_capacity; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE media_current_capacity FROM PUBLIC;
REVOKE ALL ON TABLE media_current_capacity FROM srv_dpmc;
GRANT ALL ON TABLE media_current_capacity TO srv_dpmc;
GRANT SELECT ON TABLE media_current_capacity TO srv_s3ome_read;


--
-- Name: media_current_physical_capacity; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE media_current_physical_capacity FROM PUBLIC;
REVOKE ALL ON TABLE media_current_physical_capacity FROM srv_dpmc;
GRANT ALL ON TABLE media_current_physical_capacity TO srv_dpmc;
GRANT SELECT ON TABLE media_current_physical_capacity TO srv_s3ome_read;


--
-- Name: media_current_physical_capacity_with_count; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE media_current_physical_capacity_with_count FROM PUBLIC;
REVOKE ALL ON TABLE media_current_physical_capacity_with_count FROM srv_dpmc;
GRANT ALL ON TABLE media_current_physical_capacity_with_count TO srv_dpmc;
GRANT SELECT ON TABLE media_current_physical_capacity_with_count TO srv_s3ome_read;


--
-- Name: media_delivered; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE media_delivered FROM PUBLIC;
REVOKE ALL ON TABLE media_delivered FROM srv_dpmc;
GRANT ALL ON TABLE media_delivered TO srv_dpmc;
GRANT SELECT ON TABLE media_delivered TO srv_s3ome_read;


--
-- Name: media_running_size; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE media_running_size FROM PUBLIC;
REVOKE ALL ON TABLE media_running_size FROM srv_dpmc;
GRANT ALL ON TABLE media_running_size TO srv_dpmc;
GRANT SELECT ON TABLE media_running_size TO srv_s3ome_read;


--
-- Name: product_archive; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE product_archive FROM PUBLIC;
REVOKE ALL ON TABLE product_archive FROM srv_dpmc;
GRANT ALL ON TABLE product_archive TO srv_dpmc;
GRANT SELECT ON TABLE product_archive TO srv_s3ome_read;


--
-- Name: missing_file_for_order; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE missing_file_for_order FROM PUBLIC;
REVOKE ALL ON TABLE missing_file_for_order FROM srv_dpmc;
GRANT ALL ON TABLE missing_file_for_order TO srv_dpmc;
GRANT SELECT ON TABLE missing_file_for_order TO srv_s3ome_read;


--
-- Name: not_archived; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE not_archived FROM PUBLIC;
REVOKE ALL ON TABLE not_archived FROM srv_dpmc;
GRANT ALL ON TABLE not_archived TO srv_dpmc;
GRANT SELECT ON TABLE not_archived TO srv_s3ome_read;


--
-- Name: overlap_product; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE overlap_product FROM PUBLIC;
REVOKE ALL ON TABLE overlap_product FROM srv_dpmc;
GRANT ALL ON TABLE overlap_product TO srv_dpmc;
GRANT SELECT ON TABLE overlap_product TO srv_s3ome_read;


--
-- Name: prd_external; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE prd_external FROM PUBLIC;
REVOKE ALL ON TABLE prd_external FROM srv_dpmc;
GRANT ALL ON TABLE prd_external TO srv_dpmc;
GRANT SELECT ON TABLE prd_external TO srv_s3ome_read;


--
-- Name: prd_geoloc; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE prd_geoloc FROM PUBLIC;
REVOKE ALL ON TABLE prd_geoloc FROM srv_dpmc;
GRANT ALL ON TABLE prd_geoloc TO srv_dpmc;
GRANT SELECT ON TABLE prd_geoloc TO srv_s3ome_read;


--
-- Name: prd_md5; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE prd_md5 FROM PUBLIC;
REVOKE ALL ON TABLE prd_md5 FROM srv_dpmc;
GRANT ALL ON TABLE prd_md5 TO srv_dpmc;
GRANT SELECT ON TABLE prd_md5 TO srv_s3ome_read;


--
-- Name: prd_path; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE prd_path FROM PUBLIC;
REVOKE ALL ON TABLE prd_path FROM srv_dpmc;
GRANT ALL ON TABLE prd_path TO srv_dpmc;
GRANT SELECT ON TABLE prd_path TO srv_s3ome_read;


--
-- Name: prd_period; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE prd_period FROM PUBLIC;
REVOKE ALL ON TABLE prd_period FROM srv_dpmc;
GRANT ALL ON TABLE prd_period TO srv_dpmc;
GRANT SELECT ON TABLE prd_period TO srv_s3ome_read;


--
-- Name: products_delivered; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE products_delivered FROM PUBLIC;
REVOKE ALL ON TABLE products_delivered FROM srv_dpmc;
GRANT ALL ON TABLE products_delivered TO srv_dpmc;
GRANT SELECT ON TABLE products_delivered TO srv_s3ome_read;


--
-- Name: products_info; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE products_info FROM PUBLIC;
REVOKE ALL ON TABLE products_info FROM srv_dpmc;
GRANT ALL ON TABLE products_info TO srv_dpmc;
GRANT SELECT ON TABLE products_info TO srv_s3ome_read;


--
-- Name: rectangular_site; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE rectangular_site FROM PUBLIC;
REVOKE ALL ON TABLE rectangular_site FROM srv_dpmc;
GRANT ALL ON TABLE rectangular_site TO srv_dpmc;
GRANT SELECT ON TABLE rectangular_site TO srv_s3ome_read;


--
-- Name: request; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE request FROM PUBLIC;
REVOKE ALL ON TABLE request FROM srv_dpmc;
GRANT ALL ON TABLE request TO srv_dpmc;
GRANT SELECT ON TABLE request TO srv_s3ome_read;


--
-- Name: request_x_product; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE request_x_product FROM PUBLIC;
REVOKE ALL ON TABLE request_x_product FROM srv_dpmc;
GRANT ALL ON TABLE request_x_product TO srv_dpmc;
GRANT SELECT ON TABLE request_x_product TO srv_s3ome_read;


--
-- Name: runnable_batch; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE runnable_batch FROM PUBLIC;
REVOKE ALL ON TABLE runnable_batch FROM srv_dpmc;
GRANT ALL ON TABLE runnable_batch TO srv_dpmc;
GRANT SELECT ON TABLE runnable_batch TO srv_s3ome_read;


--
-- Name: running_job; Type: ACL; Schema: public; Owner: srv_dpmc
--

REVOKE ALL ON TABLE running_job FROM PUBLIC;
REVOKE ALL ON TABLE running_job FROM srv_dpmc;
GRANT ALL ON TABLE running_job TO srv_dpmc;
GRANT SELECT ON TABLE running_job TO srv_s3ome_read;


--
-- Name: test; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE test FROM PUBLIC;
REVOKE ALL ON TABLE test FROM postgres;
GRANT ALL ON TABLE test TO postgres;
GRANT SELECT ON TABLE test TO srv_s3ome_read;


SET search_path = s3ome, pg_catalog;

--
-- Name: ext_product; Type: ACL; Schema: s3ome; Owner: srv_dpmc
--

REVOKE ALL ON TABLE ext_product FROM PUBLIC;
REVOKE ALL ON TABLE ext_product FROM srv_dpmc;
GRANT ALL ON TABLE ext_product TO srv_dpmc;
GRANT SELECT ON TABLE ext_product TO srv_s3ome_read;


--
-- Name: hsm_copy; Type: ACL; Schema: s3ome; Owner: srv_dpmc
--

REVOKE ALL ON TABLE hsm_copy FROM PUBLIC;
REVOKE ALL ON TABLE hsm_copy FROM srv_dpmc;
GRANT ALL ON TABLE hsm_copy TO srv_dpmc;
GRANT SELECT ON TABLE hsm_copy TO srv_s3ome_read;


--
-- Name: media; Type: ACL; Schema: s3ome; Owner: srv_dpmc
--

REVOKE ALL ON TABLE media FROM PUBLIC;
REVOKE ALL ON TABLE media FROM srv_dpmc;
GRANT ALL ON TABLE media TO srv_dpmc;
GRANT SELECT ON TABLE media TO srv_s3ome_read;


--
-- Name: product_x_media; Type: ACL; Schema: s3ome; Owner: srv_dpmc
--

REVOKE ALL ON TABLE product_x_media FROM PUBLIC;
REVOKE ALL ON TABLE product_x_media FROM srv_dpmc;
GRANT ALL ON TABLE product_x_media TO srv_dpmc;
GRANT SELECT ON TABLE product_x_media TO srv_s3ome_read;


--
-- Name: viscal_info; Type: ACL; Schema: s3ome; Owner: srv_dpmc
--

REVOKE ALL ON TABLE viscal_info FROM PUBLIC;
REVOKE ALL ON TABLE viscal_info FROM srv_dpmc;
GRANT ALL ON TABLE viscal_info TO srv_dpmc;
GRANT SELECT ON TABLE viscal_info TO srv_s3ome_read;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE ALL ON SEQUENCES  FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE ALL ON SEQUENCES  FROM postgres;


--
-- Name: DEFAULT PRIVILEGES FOR TYPES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE ALL ON TYPES  FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE ALL ON TYPES  FROM postgres;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE ALL ON TABLES  FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE ALL ON TABLES  FROM postgres;


--
-- PostgreSQL database dump complete
--

