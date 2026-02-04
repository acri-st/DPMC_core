--
-- PostgreSQL database dump
--

\restrict nbE3Eq8veifhtK9dk2BmnUJhph2goqqlcaOtwSWfbT0F8sSbH7cpfyvjQo2LSZv

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: internal; Type: SCHEMA; Schema: -; Owner: srv_dpmc
--

CREATE SCHEMA internal;


ALTER SCHEMA internal OWNER TO srv_dpmc;

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
-- Name: temporary; Type: SCHEMA; Schema: -; Owner: srv_dpmc
--

CREATE SCHEMA temporary;


ALTER SCHEMA temporary OWNER TO srv_dpmc;

--
-- Name: transcription_status; Type: TYPE; Schema: internal; Owner: srv_dpmc
--

CREATE TYPE internal.transcription_status AS ENUM (
    'full',
    'partial',
    'null'
);


ALTER TYPE internal.transcription_status OWNER TO srv_dpmc;

--
-- Name: reprocessing_status; Type: TYPE; Schema: processing; Owner: srv_dpmc
--

CREATE TYPE processing.reprocessing_status AS ENUM (
    'NEW',
    'IN_PROGRESS',
    'ERROR',
    'DONE',
    'SUSPENDED'
);


ALTER TYPE processing.reprocessing_status OWNER TO srv_dpmc;

--
-- Name: processing_mode; Type: TYPE; Schema: public; Owner: srv_dpmc
--

CREATE TYPE public.processing_mode AS ENUM (
    'calibration',
    'measurement'
);


ALTER TYPE public.processing_mode OWNER TO srv_dpmc;

--
-- Name: task_record_status; Type: TYPE; Schema: public; Owner: srv_dpmc
--

CREATE TYPE public.task_record_status AS ENUM (
    'RUNNING',
    'DONE',
    'FAILED'
);


ALTER TYPE public.task_record_status OWNER TO srv_dpmc;

--
-- Name: task_status; Type: TYPE; Schema: public; Owner: srv_dpmc
--

CREATE TYPE public.task_status AS ENUM (
    'NEW',
    'RUNNING',
    'DONE',
    'SUSPENDED'
);


ALTER TYPE public.task_status OWNER TO srv_dpmc;

--
-- Name: timeliness; Type: TYPE; Schema: public; Owner: srv_dpmc
--

CREATE TYPE public.timeliness AS ENUM (
    'NRT',
    'STC',
    'NTC'
);


ALTER TYPE public.timeliness OWNER TO srv_dpmc;

--
-- Name: add_product_to_dataset(integer, integer); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION internal.add_product_to_dataset(integer, integer) RETURNS integer
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

CREATE FUNCTION internal.add_product_to_dataset_by_name(character varying, character varying) RETURNS integer
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

CREATE FUNCTION internal.clean_dataset(integer) RETURNS integer
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

CREATE FUNCTION internal.clean_dataset_by_name(character varying) RETURNS integer
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

CREATE FUNCTION internal.create_media_from_name(character varying) RETURNS integer
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

CREATE FUNCTION internal.delete_dataset(integer) RETURNS integer
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

CREATE FUNCTION internal.delete_dataset_by_name(character varying) RETURNS integer
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

CREATE FUNCTION internal.delete_product_from_database(character varying) RETURNS integer
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
	delete from internal.processing_product_x_tag where product_name = product_name_;
    -- Update gb 18/06/2018
    -- create temporary table zzz as (select * from internal.product_x_media_catalog_entry where product = v_product_id_);
    -- delete from internal.product_x_media_catalog_entry where product = v_product_id_;
    -- delete from internal.media_catalog_entry where id in (select media_catalog_entry from zzz);
    -- drop table zzz;
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

CREATE FUNCTION internal.delete_product_from_dataset(integer, integer) RETURNS integer
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

CREATE FUNCTION internal.delete_product_from_dataset_by_name(character varying, character varying) RETURNS integer
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

CREATE FUNCTION internal.disk_location_create(character varying, character varying) RETURNS integer
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
	

	LOOP
        if exists (select * from internal.media_catalog where media = media_id_ and name = media_catalog_) then
            EXIT;
        end if;
        begin
            insert into internal.media_catalog(media, name) values( media_id_, media_catalog_);
            EXIT;
        exception when unique_violation then
                -- Do nothing, and loop to try the SELECT again.
        end;
    END LOOP;
	
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
-- Name: disk_location_create_md5(character varying, character varying, character varying); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION internal.disk_location_create_md5(character varying, character varying, character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $_$declare
	product_name_ alias for $1;
	disk_location_ alias for $2;
	md5_checksum_ alias for $3;
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
    LOOP
        if exists (select * from internal.media_catalog where media = media_id_ and name = media_catalog_) then
            EXIT;
        end if;
        begin
            insert into internal.media_catalog(media, name) values( media_id_, media_catalog_);
            EXIT;
        exception when unique_violation then
                -- Do nothing, and loop to try the SELECT again.
        end;
    END LOOP;
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
		insert into internal.media_catalog_entry(media_catalog, name, md5_checksum)
		values( media_catalog_id_, media_catalog_entry_, md5_checksum_);
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

	return result_;
end;$_$;


ALTER FUNCTION internal.disk_location_create_md5(character varying, character varying, character varying) OWNER TO srv_dpmc;

--
-- Name: disk_location_delete(character varying); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION internal.disk_location_delete(character varying) RETURNS integer
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

CREATE FUNCTION internal.exists_product(integer) RETURNS boolean
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

CREATE FUNCTION internal.interval_to_seconds(interval) RETURNS integer
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

CREATE FUNCTION internal.media_catalog_create(integer, character varying) RETURNS integer
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

CREATE FUNCTION internal.merge_datasets(integer, integer, integer) RETURNS integer
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

CREATE FUNCTION internal.new_image_processing_from_request(integer, integer, integer, timestamp without time zone, timestamp without time zone) RETURNS integer
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

CREATE FUNCTION internal.new_image_processings_from_product(integer) RETURNS integer
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

CREATE FUNCTION internal.new_image_processings_from_request(integer) RETURNS integer
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

CREATE FUNCTION internal.new_processing(integer, integer, character, boolean) RETURNS integer
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

CREATE FUNCTION internal.new_processings_from_product(integer) RETURNS integer
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

CREATE FUNCTION internal.new_processings_from_product_old(integer) RETURNS integer
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

CREATE FUNCTION internal.new_processings_from_request(integer) RETURNS integer
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

CREATE FUNCTION internal.new_processings_from_request_and_product(integer, integer) RETURNS integer
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

CREATE FUNCTION internal.new_product(integer) RETURNS integer
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

CREATE FUNCTION internal.new_product_from_name(character varying) RETURNS integer
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

CREATE FUNCTION internal.new_product_from_name_old(character varying) RETURNS integer
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

CREATE FUNCTION internal.next_media_name(character varying) RETURNS character varying
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

CREATE FUNCTION internal.next_media_suffixed_name(character varying, character varying) RETURNS character varying
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

CREATE FUNCTION internal.product_processing_center_from_name(character varying) RETURNS character varying
    LANGUAGE plpgsql
    AS $_$begin
  return substring( $1, 12, 3);
end;$_$;


ALTER FUNCTION internal.product_processing_center_from_name(character varying) OWNER TO srv_dpmc;

--
-- Name: product_processing_stage_flag_from_name(character varying); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION internal.product_processing_stage_flag_from_name(character varying) RETURNS character
    LANGUAGE plpgsql
    AS $_$begin
  return substring( $1, 11, 1);
end;$_$;


ALTER FUNCTION internal.product_processing_stage_flag_from_name(character varying) OWNER TO srv_dpmc;

--
-- Name: product_type_acronym_from_name(character varying); Type: FUNCTION; Schema: internal; Owner: srv_dpmc
--

CREATE FUNCTION internal.product_type_acronym_from_name(character varying) RETURNS character varying
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

CREATE FUNCTION internal.remove_scheduler_lock_file() RETURNS integer
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

--
-- Name: add_host2pool(integer, integer); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION processing.add_host2pool(integer, integer) RETURNS boolean
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
-- Name: add_host2pool(character varying, character varying); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION processing.add_host2pool(character varying, character varying) RETURNS boolean
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
-- Name: add_output_file(character varying, character varying, integer); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION processing.add_output_file(character varying, character varying, integer) RETURNS boolean
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

CREATE FUNCTION processing.add_pool(character varying) RETURNS integer
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

CREATE FUNCTION processing.check_launch_time_outs() RETURNS integer
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

		select	t.batch_id, t.hostname_id
		FROM internal.global g
		CROSS JOIN processing.batch b
		JOIN processing.top t ON t.batch_id = b.id
		where	b.status = 'LAUNCHED'
			and now() - t.started > g.launch_time_out

	loop

		update processing.batch set status = 'QUEUED' where id = rec.batch_id;

		delete from processing.top where batch_id = rec.batch_id;

--		update processing.hosts set available = false where host_id = rec.hostname_id;

		result_ := result_ + 1;

	end loop;

	return result_;
end;
$$;


ALTER FUNCTION processing.check_launch_time_outs() OWNER TO srv_dpmc;

--
-- Name: check_run_time_outs(); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION processing.check_run_time_outs() RETURNS integer
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

		select	t.batch_id, t.hostname_id
		FROM internal.global g
		CROSS JOIN processing.batch b
		JOIN processing.top t ON t.batch_id = b.id
		where	b.status = 'RUNNING'
                        and now() - now() > g.run_time_out
--                      strange request to avoid killing process longer than run_time_out
--			and now() - top.started > global.run_time_out

	loop

		update processing.batch set status = 'QUEUED' where id = rec.batch_id;

		delete from processing.top where batch_id = rec.batch_id;

		update processing.hosts set available = false where host_id = rec.hostname_id;

		result_ := result_ + 1;

	end loop;

	return result_;
end;
$$;


ALTER FUNCTION processing.check_run_time_outs() OWNER TO srv_dpmc;

--
-- Name: compute_carbon_footprint(text); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION processing.compute_carbon_footprint(p_history_tag text) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    rec RECORD;

    -- Total CO2e (kgCO2)
    co2_computation NUMERIC := 0;
    co2_transfer    NUMERIC := 0;
    co2_storage     NUMERIC := 0;

    duration_h NUMERIC;
BEGIN

    -- for all jobs with the same tag
    FOR rec IN
        SELECT
            h.avg_power,          -- W
            h.data_volume,        -- Go
            h.started,
            h.ended,
            c.pue,
            c.emission_factor,    -- kgCO2 / kWh
            c.energy_intensity    -- kWh / Go
        FROM processing.history h
        JOIN processing.center c
            ON c.id = h.center_id
        WHERE h.tag = p_history_tag
          AND h.started IS NOT NULL
          AND h.ended IS NOT NULL
    LOOP

        duration_h := EXTRACT(EPOCH FROM (rec.ended - rec.started)) / 3600;

        -- CO2 Computation
        co2_computation :=
            co2_computation
            + (((rec.avg_power * duration_h) / 1000)
               * rec.pue
               * rec.emission_factor);

        -- CO2 Transfer
        co2_transfer :=
            co2_transfer
            + (rec.data_volume
               * rec.energy_intensity
               * rec.emission_factor);

        -- CO2 Storage (monthly)
        co2_storage :=
            co2_storage
            + (((rec.avg_power * 24 * 30) / 1000)
               * rec.pue
               * rec.emission_factor);

    END LOOP;

    -- Result
    RETURN co2_computation + co2_transfer + co2_storage;
END;
$$;


ALTER FUNCTION processing.compute_carbon_footprint(p_history_tag text) OWNER TO srv_dpmc;

--
-- Name: delete_job(integer); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION processing.delete_job(integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $_$
declare
  v_batch_id alias for $1;
begin
  delete from processing.parameters_set where parameters_set.id = v_batch_id;
  delete from processing.batch_x_product where batch = v_batch_id;
  delete from processing.batch where id = v_batch_id;
return true;
end;
$_$;


ALTER FUNCTION processing.delete_job(integer) OWNER TO srv_dpmc;

--
-- Name: delete_top_item(integer, character varying); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION processing.delete_top_item(integer, character varying) RETURNS boolean
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

	select into v_request_id request_id from processing.batch where id = v_batch_id;

        select processing_script_id 
        into v_proc_comment_id
        from processing.request where id = v_request_id;
        	
	insert into processing.history(
		history_id, processing_script, request_id, started, ended, host_id, batch_id, status)
	select
		v_history_id, v_proc_comment_id, batch.request_id, top.started, now(), top.hostname_id, v_batch_id, v_state
	from	
		processing.batch
		join processing.top on top.batch_id = batch.id
	where 	
		batch.id = v_batch_id;

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

CREATE FUNCTION processing.delete_top_item_errors_inside(integer, character varying) RETURNS boolean
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

CREATE FUNCTION processing.get_next_input_media_from_current_physical_capacity() RETURNS integer
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

CREATE FUNCTION processing.get_next_media() RETURNS integer
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

CREATE FUNCTION processing.get_next_output_media_from_current_physical_capacity() RETURNS integer
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
-- Name: history_double_levels(integer, integer); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION processing.history_double_levels(v_c1 integer, v_c2 integer) RETURNS TABLE(history_id integer, state character varying, l0_id integer, l0_name character varying, l1_id integer, l1_name character varying, tag1 character varying, l2_id integer, l2_name character varying, tag2 character varying)
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


ALTER FUNCTION processing.history_double_levels(v_c1 integer, v_c2 integer) OWNER TO srv_dpmc;

--
-- Name: history_single_level(integer); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION processing.history_single_level(v_c1 integer) RETURNS TABLE(history_id integer, state character varying, l0_id integer, l0_name character varying, l1_id integer, l1_name character varying, tag1 character varying)
    LANGUAGE sql
    AS $_$
select h1.history_id as history_id, h1.state as state, p0.id as L0_id, p0.name as L0_name, hxp1.product as L1_id, p1.name as L1_name, h1.tag as tag1
  from internal.product as p0 
      join processing.history as h1 on p0.id=h1.file_input_id and h1.software_id=$1
      left outer join processing.history_x_product as hxp1 on h1.history_id=hxp1.history
      left outer join internal.product as p1 on hxp1.product=p1.id and p1.name like '%'
  order by h1.history_id desc;
$_$;


ALTER FUNCTION processing.history_single_level(v_c1 integer) OWNER TO srv_dpmc;

--
-- Name: purge_history(); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION processing.purge_history() RETURNS boolean
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

CREATE FUNCTION processing.remove_host2pool(character varying, character varying) RETURNS boolean
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

CREATE FUNCTION processing.restart_job(integer) RETURNS boolean
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

CREATE FUNCTION processing.schedule_batch() RETURNS integer
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

CREATE FUNCTION processing.schedule_batches() RETURNS integer
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

CREATE FUNCTION processing.schedule_batches_all() RETURNS integer
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
-- Name: schedule_batches_docker(character varying); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION processing.schedule_batches_docker(character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
DECLARE
    hostname_  ALIAS FOR $1;
    result_    integer := 0;
    i          integer;
    rec        record;
    rec2       record;
    host_exists boolean;
BEGIN

    UPDATE internal.global
    SET last_schedule_date_time = now();

    FOR rec IN
        SELECT
            h.host_id,
            h.hostname,
            c.current_ncpu,
            h.bogomips
        FROM hosts_current_ncpu c
        JOIN processing.hosts h ON h.host_id = c.host_id
        WHERE
            c.current_ncpu > 0
            AND h.available
            AND h.hostname = hostname_
        ORDER BY h.bogomips DESC, c.current_ncpu DESC
    LOOP
        i := 1;

        FOR rec2 IN
            SELECT
                b.id,
                b.input
            FROM processing.pool_x_hosts pxh
            JOIN processing.request r ON r.pool = pxh.pool
            JOIN processing.batch b ON b.request_id = r.id
            WHERE
                b.status = 'QUEUED'
                AND pxh.hosts = rec.host_id
            ORDER BY b.id, b.input
        LOOP
            -- Vérifie si le host demandé existe
            IF rec2.input->>'host' IS NOT NULL THEN
                SELECT EXISTS (
                    SELECT 1
                    FROM processing.hosts h
                    WHERE h.hostname = rec2.input->>'host'
                      AND h.available
                )
                INTO host_exists;

                -- Si le host existe mais ne correspond pas au host courant → skip
                IF host_exists AND rec2.input->>'host' <> rec.hostname THEN
                    CONTINUE;
                END IF;
            END IF;

            -- Dispatch du batch
            INSERT INTO processing.top (batch_id, hostname_id, started, pid)
            VALUES (rec2.id, rec.host_id, now(), NULL);

            UPDATE processing.batch
            SET status = 'DISPATCHED'
            WHERE id = rec2.id;

            i := i + 1;
            result_ := result_ + 1;

            IF i > rec.current_ncpu THEN
                EXIT;
            END IF;

        END LOOP;
    END LOOP;

    SELECT INTO result_ COUNT(*)
    FROM processing.batch b
    JOIN processing.top t ON t.batch_id = b.id
    JOIN processing.hosts h ON h.host_id = t.hostname_id
    WHERE
        b.status = 'DISPATCHED'
        AND h.hostname = hostname_;

    RETURN result_;
END;
$_$;


ALTER FUNCTION processing.schedule_batches_docker(character varying) OWNER TO srv_dpmc;

--
-- Name: schedule_batches_new(integer); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION processing.schedule_batches_new(integer) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
declare 
	orchest_id alias for $1;
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
				and request.id in 
					(select o_r.request_id from processing.orchestrator_x_request o_r where o_r.orchestrator_id = orchest_id)
				AND request.pool = pool_x_hosts.pool
				AND batch.request_id = request.id
				AND pool_x_hosts.hosts = rec.host_id
				AND product.id = batch.file_input_id
			ORDER BY batch_id
			
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
end;$_$;


ALTER FUNCTION processing.schedule_batches_new(integer) OWNER TO srv_dpmc;

--
-- Name: update_processing_order(); Type: FUNCTION; Schema: processing; Owner: srv_dpmc
--

CREATE FUNCTION processing.update_processing_order() RETURNS boolean
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

--
-- Name: abs(interval); Type: FUNCTION; Schema: public; Owner: srv_dpmc
--

CREATE FUNCTION public.abs(interval) RETURNS interval
    LANGUAGE sql IMMUTABLE
    AS $_$ select case when ($1<interval '0') then -$1 else $1 end; $_$;


ALTER FUNCTION public.abs(interval) OWNER TO srv_dpmc;

--
-- Name: new_image_batch(integer, integer, timestamp without time zone, timestamp without time zone); Type: FUNCTION; Schema: public; Owner: srv_dpmc
--

CREATE FUNCTION public.new_image_batch(integer, integer, timestamp without time zone, timestamp without time zone) RETURNS boolean
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
-- Name: user_id(); Type: FUNCTION; Schema: public; Owner: srv_dpmc
--

CREATE FUNCTION public.user_id() RETURNS integer
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

--
-- Name: xc_au_nc_1txy__Sheet1_updated_at(); Type: FUNCTION; Schema: public; Owner: srv_dpmc
--

CREATE FUNCTION public."xc_au_nc_1txy__Sheet1_updated_at"() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
                          BEGIN
                            NEW."updated_at" = NOW();
                            RETURN NEW;
                          END;
                          $$;


ALTER FUNCTION public."xc_au_nc_1txy__Sheet1_updated_at"() OWNER TO srv_dpmc;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: adf_baseline; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.adf_baseline (
    aux_id integer NOT NULL,
    version character varying NOT NULL,
    generation_date timestamp without time zone,
    insertion_date timestamp without time zone,
    document_id integer,
    comment character varying
);


ALTER TABLE internal.adf_baseline OWNER TO srv_dpmc;

--
-- Name: attribute_dictionary_id_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE internal.attribute_dictionary_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE internal.attribute_dictionary_id_seq OWNER TO srv_dpmc;

--
-- Name: auxiliary_configuration; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.auxiliary_configuration (
    id integer DEFAULT nextval(('internal.auxiliary_configuration_seq'::text)::regclass) NOT NULL,
    name character varying(255) NOT NULL,
    comment text,
    index_media_catalog integer
);


ALTER TABLE internal.auxiliary_configuration OWNER TO srv_dpmc;

--
-- Name: auxiliary_configuration_detail; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.auxiliary_configuration_detail (
    configuration integer NOT NULL,
    product_type integer NOT NULL,
    version character varying(10) DEFAULT '1.0'::character varying
);


ALTER TABLE internal.auxiliary_configuration_detail OWNER TO srv_dpmc;

--
-- Name: auxiliary_configuration_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE internal.auxiliary_configuration_seq
    START WITH 11
    INCREMENT BY 1
    MINVALUE 0
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE internal.auxiliary_configuration_seq OWNER TO srv_dpmc;

--
-- Name: auxiliary_product; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.auxiliary_product (
    product integer NOT NULL,
    validity_start_date_time timestamp without time zone NOT NULL,
    validity_stop_date_time timestamp without time zone NOT NULL,
    version character varying(10),
    CONSTRAINT auxiliary_product_validity_period_check CHECK ((validity_start_date_time <= validity_stop_date_time))
);


ALTER TABLE internal.auxiliary_product OWNER TO srv_dpmc;

--
-- Name: center; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.center (
    id integer NOT NULL,
    latitude real,
    longitude real,
    code character varying(255) NOT NULL,
    name character varying(255),
    code_in_product_name character varying(3)
);


ALTER TABLE internal.center OWNER TO srv_dpmc;

--
-- Name: constant; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.constant (
    id smallint NOT NULL,
    name character varying NOT NULL,
    value json NOT NULL
);


ALTER TABLE internal.constant OWNER TO srv_dpmc;

--
-- Name: dataset; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.dataset (
    id integer DEFAULT nextval(('internal.dataset_seq'::text)::regclass) NOT NULL,
    cdate timestamp without time zone NOT NULL,
    name character varying NOT NULL,
    comment character varying
);


ALTER TABLE internal.dataset OWNER TO srv_dpmc;

--
-- Name: dataset_x_product; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.dataset_x_product (
    dataset_id integer NOT NULL,
    product_id integer NOT NULL
);


ALTER TABLE internal.dataset_x_product OWNER TO srv_dpmc;

--
-- Name: product; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.product (
    id integer DEFAULT nextval(('internal.product_seq'::text)::regclass) NOT NULL,
    processing integer,
    product_type integer NOT NULL,
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

CREATE VIEW internal.dataset_content AS
 SELECT d.name AS dataset_name,
    p.name AS product_name,
    d.id AS dataset_id,
    p.id AS product_id
   FROM internal.dataset_x_product dxp,
    internal.dataset d,
    internal.product p
  WHERE ((dxp.product_id = p.id) AND (dxp.dataset_id = d.id))
  ORDER BY d.name, p.name;


ALTER VIEW internal.dataset_content OWNER TO srv_dpmc;

--
-- Name: dataset_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE internal.dataset_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE internal.dataset_seq OWNER TO srv_dpmc;

--
-- Name: document_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE internal.document_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE internal.document_seq OWNER TO srv_dpmc;

--
-- Name: downlink_orbit_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE internal.downlink_orbit_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE internal.downlink_orbit_seq OWNER TO srv_dpmc;

--
-- Name: gen_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE internal.gen_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE internal.gen_seq OWNER TO srv_dpmc;

--
-- Name: ipf_processing_baseline; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.ipf_processing_baseline (
    id integer NOT NULL,
    document character varying,
    creation_date timestamp without time zone,
    comment character varying,
    version character varying
);


ALTER TABLE internal.ipf_processing_baseline OWNER TO srv_dpmc;

--
-- Name: ipf_processing_baseline_x_sxa; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.ipf_processing_baseline_x_sxa (
    id integer NOT NULL,
    ipf_processing_baseline_id integer,
    soft_x_aux_conf_id integer,
    comment character varying
);


ALTER TABLE internal.ipf_processing_baseline_x_sxa OWNER TO srv_dpmc;

--
-- Name: product_type; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.product_type (
    id integer NOT NULL,
    sph_size integer,
    mean_size real,
    acronym character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    processing_level character varying(2),
    cache_duration integer DEFAULT 0,
    gap_type character varying(3),
    gap_nominal integer,
    retention_time integer
);


ALTER TABLE internal.product_type OWNER TO srv_dpmc;

--
-- Name: software; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.software (
    id integer DEFAULT nextval(('internal.software_seq'::text)::regclass) NOT NULL,
    name character varying(255) NOT NULL,
    version character varying(20) NOT NULL,
    default_auxiliary_configuration integer,
    processing_stage character(1),
    image_tag character varying
);


ALTER TABLE internal.software OWNER TO srv_dpmc;

--
-- Name: software_x_auxiliary_configuration; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.software_x_auxiliary_configuration (
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

COMMENT ON COLUMN internal.software_x_auxiliary_configuration.creation_date IS 'Date given in the IPF Processing Baseline Document';


--
-- Name: give_ipf_processing_baseline; Type: VIEW; Schema: internal; Owner: srv_dpmc
--

CREATE VIEW internal.give_ipf_processing_baseline AS
 SELECT ipb.version AS ipb_version,
    s.name AS soft_name,
    sxac.ipf_baseline,
    s.version AS soft_version,
    ac.name AS ac_version,
    pt.acronym,
    p.name AS adf_name
   FROM internal.ipf_processing_baseline ipb,
    internal.ipf_processing_baseline_x_sxa ipbsxa,
    internal.software_x_auxiliary_configuration sxac,
    internal.software s,
    internal.auxiliary_configuration ac,
    internal.auxiliary_configuration_detail acd,
    internal.product_type pt,
    internal.product p,
    internal.auxiliary_product ap
  WHERE ((ipbsxa.ipf_processing_baseline_id = ipb.id) AND (ipbsxa.soft_x_aux_conf_id = sxac.id) AND (sxac.software = s.id) AND (sxac.auxiliary_configuration = ac.id) AND (acd.configuration = ac.id) AND (acd.product_type = pt.id) AND (ap.product = p.id) AND (p.product_type = pt.id) AND (p.product_type = acd.product_type) AND ((acd.version)::text = (ap.version)::text))
  ORDER BY ipb.id, s.id;


ALTER VIEW internal.give_ipf_processing_baseline OWNER TO srv_dpmc;

--
-- Name: give_ipf_processing_sxac; Type: VIEW; Schema: internal; Owner: srv_dpmc
--

CREATE VIEW internal.give_ipf_processing_sxac AS
 SELECT ipb.version AS ipb_version,
    s.name AS soft_name,
    sxac.id AS sxac,
    sxac.ipf_baseline,
    s.version AS soft_version,
    ac.name AS ac_version,
    pt.acronym,
    p.name AS adf_name,
    acd.version AS adf_version
   FROM internal.ipf_processing_baseline ipb,
    internal.ipf_processing_baseline_x_sxa ipbsxa,
    internal.software_x_auxiliary_configuration sxac,
    internal.software s,
    internal.auxiliary_configuration ac,
    internal.auxiliary_configuration_detail acd,
    internal.product_type pt,
    internal.product p,
    internal.auxiliary_product ap
  WHERE ((ipbsxa.ipf_processing_baseline_id = ipb.id) AND (ipbsxa.soft_x_aux_conf_id = sxac.id) AND (sxac.software = s.id) AND (sxac.auxiliary_configuration = ac.id) AND (acd.configuration = ac.id) AND (acd.product_type = pt.id) AND (ap.product = p.id) AND (p.product_type = pt.id) AND (p.product_type = acd.product_type) AND ((acd.version)::text = (ap.version)::text))
  ORDER BY ipb.id, s.id;


ALTER VIEW internal.give_ipf_processing_sxac OWNER TO srv_dpmc;

--
-- Name: global; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.global (
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
    task_rule_id integer,
    executor_pause_flag boolean DEFAULT true,
    CONSTRAINT global_check_stage_shift_count CHECK ((stage_shift_count >= 0)),
    CONSTRAINT global_check_stage_shift_interval CHECK (((stage_shift_interval)::text >= '0'::text))
);


ALTER TABLE internal.global OWNER TO srv_dpmc;

--
-- Name: instrument; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.instrument (
    satellite integer NOT NULL,
    id integer NOT NULL,
    acronym character varying(50) NOT NULL,
    name character(100) NOT NULL
);


ALTER TABLE internal.instrument OWNER TO srv_dpmc;

--
-- Name: ipf_x_dynamic_adf; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.ipf_x_dynamic_adf (
    ipf character varying NOT NULL,
    acronym character varying NOT NULL,
    type character varying,
    mode character varying,
    retrieval_mode character varying,
    backup_of character varying
);


ALTER TABLE internal.ipf_x_dynamic_adf OWNER TO srv_dpmc;

--
-- Name: living_request; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.living_request (
    request integer NOT NULL
);


ALTER TABLE internal.living_request OWNER TO srv_dpmc;

--
-- Name: media; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.media (
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
-- Name: media_catalog; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.media_catalog (
    media integer NOT NULL,
    name character varying(255) NOT NULL,
    id integer DEFAULT nextval(('internal.media_catalog_sequence'::text)::regclass) NOT NULL
);


ALTER TABLE internal.media_catalog OWNER TO srv_dpmc;

--
-- Name: media_catalog_entry; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.media_catalog_entry (
    id integer DEFAULT nextval(('internal.media_catalog_entry_sequence'::text)::regclass) NOT NULL,
    media_catalog integer,
    name character varying(255),
    md5_checksum character varying(255) DEFAULT NULL::character varying
);


ALTER TABLE internal.media_catalog_entry OWNER TO srv_dpmc;

--
-- Name: media_catalog_entry_sequence; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE internal.media_catalog_entry_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE internal.media_catalog_entry_sequence OWNER TO srv_dpmc;

--
-- Name: media_catalog_sequence; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE internal.media_catalog_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE internal.media_catalog_sequence OWNER TO srv_dpmc;

--
-- Name: media_id; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE internal.media_id
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE internal.media_id OWNER TO srv_dpmc;

--
-- Name: media_sequence; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE internal.media_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE internal.media_sequence OWNER TO srv_dpmc;

--
-- Name: media_type; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.media_type (
    id integer NOT NULL,
    capacity double precision NOT NULL,
    sequential boolean,
    name character varying(255) NOT NULL,
    removable boolean
);


ALTER TABLE internal.media_type OWNER TO srv_dpmc;

--
-- Name: orbit; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.orbit (
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

--
-- Name: platform_id_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE internal.platform_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE internal.platform_id_seq OWNER TO srv_dpmc;

--
-- Name: priority_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE internal.priority_seq
    START WITH 1
    INCREMENT BY 1
    MINVALUE 0
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE internal.priority_seq OWNER TO srv_dpmc;

--
-- Name: processing; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.processing (
    id integer DEFAULT nextval(('internal.processing_seq'::text)::regclass) NOT NULL,
    center integer NOT NULL,
    software integer,
    stage character(1) NOT NULL,
    state integer,
    product_type integer NOT NULL
);


ALTER TABLE internal.processing OWNER TO srv_dpmc;

--
-- Name: processing_configuration; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.processing_configuration (
    id integer NOT NULL,
    cdate timestamp without time zone NOT NULL,
    sxac_id integer NOT NULL,
    processing_comment_id integer,
    parameter json,
    comment character varying
);


ALTER TABLE internal.processing_configuration OWNER TO srv_dpmc;

--
-- Name: processing_product_x_tag; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.processing_product_x_tag (
    product_name character varying(255) NOT NULL,
    tag text NOT NULL
);


ALTER TABLE internal.processing_product_x_tag OWNER TO srv_dpmc;

--
-- Name: processing_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE internal.processing_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE internal.processing_seq OWNER TO srv_dpmc;

--
-- Name: product_media; Type: VIEW; Schema: internal; Owner: srv_dpmc
--

CREATE VIEW internal.product_media AS
 SELECT m.name AS volume_name,
    mc.name AS dir_name,
    mce.name AS product_name
   FROM internal.media_catalog_entry mce,
    internal.media_catalog mc,
    internal.media m
  WHERE ((m.id = mc.media) AND (mce.media_catalog = mc.id));


ALTER VIEW internal.product_media OWNER TO srv_dpmc;

--
-- Name: product_x_media_catalog_entry; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.product_x_media_catalog_entry (
    media_catalog_entry integer NOT NULL,
    product integer NOT NULL
);


ALTER TABLE internal.product_x_media_catalog_entry OWNER TO srv_dpmc;

--
-- Name: sensing_product; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.sensing_product (
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
-- Name: product_path; Type: VIEW; Schema: internal; Owner: srv_dpmc
--

CREATE VIEW internal.product_path WITH (security_barrier='false') AS
 SELECT product.id,
    product.name,
    (((((media.name)::text || ('/'::character varying)::text) || (media_catalog.name)::text) || ('/'::character varying)::text) || (media_catalog_entry.name)::text) AS product_path,
    product_type.acronym,
    sensing_product.start_date_time,
    sensing_product.stop_date_time,
    sensing_product.start_absolute_orbit_number
   FROM internal.product,
    internal.sensing_product,
    internal.product_type,
    internal.product_x_media_catalog_entry,
    internal.media_catalog_entry,
    internal.media_catalog,
    internal.media
  WHERE ((product.product_type = product_type.id) AND (sensing_product.product = product.id) AND (product_x_media_catalog_entry.product = product.id) AND (product_x_media_catalog_entry.media_catalog_entry = media_catalog_entry.id) AND (media_catalog_entry.media_catalog = media_catalog.id) AND (media_catalog.media = media.id));


ALTER VIEW internal.product_path OWNER TO srv_dpmc;

--
-- Name: product_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE internal.product_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE internal.product_seq OWNER TO srv_dpmc;

--
-- Name: product_time_range; Type: VIEW; Schema: internal; Owner: srv_dpmc
--

CREATE VIEW internal.product_time_range AS
 SELECT p.name,
        CASE
            WHEN (sp.start_date_time IS NULL) THEN ap.validity_start_date_time
            ELSE sp.start_date_time
        END AS start_time,
        CASE
            WHEN (sp.stop_date_time IS NULL) THEN ap.validity_stop_date_time
            ELSE sp.stop_date_time
        END AS stop_time
   FROM ((internal.product p
     LEFT JOIN internal.sensing_product sp ON ((sp.product = p.id)))
     LEFT JOIN internal.auxiliary_product ap ON ((ap.product = p.id)));


ALTER VIEW internal.product_time_range OWNER TO srv_dpmc;

--
-- Name: production_chain_x_product_type; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.production_chain_x_product_type (
    production_chain text NOT NULL,
    product_type integer NOT NULL
);


ALTER TABLE internal.production_chain_x_product_type OWNER TO srv_dpmc;

--
-- Name: request_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE internal.request_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE internal.request_seq OWNER TO srv_dpmc;

--
-- Name: requester; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.requester (
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

CREATE SEQUENCE internal.requester_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE internal.requester_seq OWNER TO srv_dpmc;

--
-- Name: satellite; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.satellite (
    id integer NOT NULL,
    acronym character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    launch_date_time timestamp without time zone NOT NULL
);


ALTER TABLE internal.satellite OWNER TO srv_dpmc;

--
-- Name: server_account_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE internal.server_account_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE internal.server_account_seq OWNER TO srv_dpmc;

--
-- Name: software_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE internal.software_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE internal.software_seq OWNER TO srv_dpmc;

--
-- Name: software_x_binary; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.software_x_binary (
    software_id integer NOT NULL,
    rank integer NOT NULL,
    binary_name character varying NOT NULL
);


ALTER TABLE internal.software_x_binary OWNER TO srv_dpmc;

--
-- Name: software_x_image_tag; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.software_x_image_tag (
    software_id integer NOT NULL,
    image_tag character varying(255) NOT NULL
);


ALTER TABLE internal.software_x_image_tag OWNER TO srv_dpmc;

--
-- Name: state_vector; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.state_vector (
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
-- Name: status_type_id_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE internal.status_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE internal.status_type_id_seq OWNER TO srv_dpmc;

--
-- Name: task; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.task (
    start_time timestamp without time zone NOT NULL,
    production_chain text NOT NULL,
    orbit integer NOT NULL,
    satellite integer NOT NULL,
    status public.task_status DEFAULT 'NEW'::public.task_status,
    end_time timestamp without time zone,
    baseline character varying DEFAULT '2.78'::character varying NOT NULL,
    pool integer,
    extra_params json
);


ALTER TABLE internal.task OWNER TO srv_dpmc;

--
-- Name: task_rule; Type: TABLE; Schema: internal; Owner: srv_dpmc
--

CREATE TABLE internal.task_rule (
    task_rule integer NOT NULL,
    production_chain text NOT NULL,
    time_shift integer,
    parameters json
);


ALTER TABLE internal.task_rule OWNER TO srv_dpmc;

--
-- Name: temp_seq; Type: SEQUENCE; Schema: internal; Owner: srv_dpmc
--

CREATE SEQUENCE internal.temp_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE internal.temp_seq OWNER TO srv_dpmc;

--
-- Name: hosts; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.hosts (
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
-- Name: top; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.top (
    batch_id integer NOT NULL,
    hostname_id integer,
    started timestamp without time zone,
    pid integer
);


ALTER TABLE processing.top OWNER TO srv_dpmc;

--
-- Name: available_hosts; Type: VIEW; Schema: processing; Owner: srv_dpmc
--

CREATE VIEW processing.available_hosts AS
 SELECT ((hosts.ncpu)::integer -
        CASE
            WHEN (temp_used_processor.occ IS NOT NULL) THEN temp_used_processor.occ
            WHEN (0 IS NOT NULL) THEN (0)::bigint
            ELSE NULL::bigint
        END) AS ncpu_available,
    hosts.hostname
   FROM (( SELECT top.hostname_id,
            count(*) AS occ
           FROM processing.top
          GROUP BY top.hostname_id) temp_used_processor
     RIGHT JOIN processing.hosts ON ((temp_used_processor.hostname_id = hosts.host_id)))
  WHERE ((((hosts.ncpu)::integer -
        CASE
            WHEN (temp_used_processor.occ IS NOT NULL) THEN temp_used_processor.occ
            WHEN (0 IS NOT NULL) THEN (0)::bigint
            ELSE NULL::bigint
        END) <> 0) AND (hosts.available = true))
  ORDER BY hosts.bogomips DESC;


ALTER VIEW processing.available_hosts OWNER TO srv_dpmc;

--
-- Name: batch; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.batch (
    id integer NOT NULL,
    request_id integer NOT NULL,
    constraints jsonb,
    input jsonb,
    output jsonb,
    status text,
    priority integer,
    configuration jsonb,
    cdate timestamp without time zone,
    center_id integer DEFAULT 0,
    CONSTRAINT batch_check_status CHECK ((status = ANY (ARRAY['EDITED'::text, 'QUEUED'::text, 'DISPATCHED'::text, 'LAUNCHED'::text, 'RUNNING'::text, 'DONE'::text, 'ERROR'::text, 'PAUSED'::text, 'TIME-OUT'::text, 'RESET_QUEUED'::text])))
);


ALTER TABLE processing.batch OWNER TO srv_dpmc;

--
-- Name: batch_id_seq; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE processing.batch ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME processing.batch_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: batch_x_center; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.batch_x_center (
    batch_id integer NOT NULL,
    center_id integer NOT NULL
);


ALTER TABLE processing.batch_x_center OWNER TO srv_dpmc;

--
-- Name: block_parameters; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.block_parameters (
    pdc_run_tag text,
    tag text,
    params jsonb
);


ALTER TABLE processing.block_parameters OWNER TO srv_dpmc;

--
-- Name: cache_lock_seq; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

CREATE SEQUENCE processing.cache_lock_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE processing.cache_lock_seq OWNER TO srv_dpmc;

--
-- Name: center; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.center (
    id integer NOT NULL,
    name character varying(255),
    location character varying(255),
    emission_factor double precision,
    energy_intensity double precision,
    pue double precision,
    code character varying(255)
);


ALTER TABLE processing.center OWNER TO srv_dpmc;

--
-- Name: center_id_seq; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE processing.center ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME processing.center_id_seq
    START WITH 1
    INCREMENT BY 1
    MINVALUE 0
    NO MAXVALUE
    CACHE 1
);


--
-- Name: history; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.history (
    history_id integer DEFAULT nextval(('processing.history_history_id'::text)::regclass) NOT NULL,
    processing_script integer,
    host_id integer,
    started timestamp without time zone,
    ended timestamp without time zone,
    file_input_id integer,
    request_id integer,
    batch_id integer,
    status character varying,
    output_dir character varying(255),
    software_id integer,
    auxiliary_configuration_id integer,
    processing_comment_id integer,
    tag character varying,
    processing_configuration_id integer,
    log_file character varying,
    batch_parameters json,
    avg_power double precision,
    data_volume double precision,
    center_id integer
);


ALTER TABLE processing.history OWNER TO srv_dpmc;

--
-- Name: history_history_id; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

CREATE SEQUENCE processing.history_history_id
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE processing.history_history_id OWNER TO srv_dpmc;

--
-- Name: history_x_product; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.history_x_product (
    history integer NOT NULL,
    product integer NOT NULL
);


ALTER TABLE processing.history_x_product OWNER TO srv_dpmc;

--
-- Name: orchestrator_id_seq; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

CREATE SEQUENCE processing.orchestrator_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE processing.orchestrator_id_seq OWNER TO srv_dpmc;

--
-- Name: parameters_set; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.parameters_set (
    id integer NOT NULL,
    keyword_index integer NOT NULL,
    keyword character varying,
    value character varying
);


ALTER TABLE processing.parameters_set OWNER TO srv_dpmc;

--
-- Name: pdc_x_pcc; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.pdc_x_pcc (
    pdc_id integer NOT NULL,
    pcc_id integer NOT NULL,
    parent_pcc_id integer,
    parent_dependency_mode text,
    CONSTRAINT pdc_x_pcc_parent_dependency_mode_check CHECK ((parent_dependency_mode = ANY (ARRAY['ON_SUCCESS'::text, 'ON_FAILURE'::text, 'ALWAYS'::text])))
);


ALTER TABLE processing.pdc_x_pcc OWNER TO srv_dpmc;

--
-- Name: pool; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.pool (
    id integer DEFAULT nextval(('processing.processing_pool_id'::text)::regclass) NOT NULL,
    comment character varying NOT NULL
);


ALTER TABLE processing.pool OWNER TO srv_dpmc;

--
-- Name: pool_x_hosts; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.pool_x_hosts (
    pool integer NOT NULL,
    hosts integer NOT NULL
);


ALTER TABLE processing.pool_x_hosts OWNER TO srv_dpmc;

--
-- Name: processing_baseline; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.processing_baseline (
    baseline text NOT NULL,
    active boolean DEFAULT false NOT NULL,
    parameters json,
    order_priority integer DEFAULT 0 NOT NULL,
    plateform character varying DEFAULT 'O'::character varying
);


ALTER TABLE processing.processing_baseline OWNER TO srv_dpmc;

--
-- Name: processing_batch_batch_id; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

CREATE SEQUENCE processing.processing_batch_batch_id
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE processing.processing_batch_batch_id OWNER TO srv_dpmc;

--
-- Name: processing_chain; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.processing_chain (
    id integer NOT NULL,
    name text,
    processing_script_id integer NOT NULL,
    comment text,
    configuration jsonb
);


ALTER TABLE processing.processing_chain OWNER TO srv_dpmc;

--
-- Name: processing_chain_baseline; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.processing_chain_baseline (
    id integer NOT NULL,
    processing_chain text NOT NULL,
    sxac integer NOT NULL,
    baseline text NOT NULL,
    pool integer NOT NULL,
    processing_configuration integer NOT NULL,
    output_path text,
    active boolean DEFAULT true,
    input_parameters json
);


ALTER TABLE processing.processing_chain_baseline OWNER TO srv_dpmc;

--
-- Name: processing_chain_baseline_id_seq; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

CREATE SEQUENCE processing.processing_chain_baseline_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE processing.processing_chain_baseline_id_seq OWNER TO srv_dpmc;

--
-- Name: processing_chain_baseline_id_seq; Type: SEQUENCE OWNED BY; Schema: processing; Owner: srv_dpmc
--

ALTER SEQUENCE processing.processing_chain_baseline_id_seq OWNED BY processing.processing_chain_baseline.id;


--
-- Name: processing_chain_id_seq; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE processing.processing_chain ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME processing.processing_chain_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: processing_chain_input_selection; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.processing_chain_input_selection (
    id integer NOT NULL,
    processing_chain_baseline_id integer NOT NULL,
    input_selection_filters jsonb NOT NULL,
    run_type jsonb NOT NULL,
    job_order_parameters jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE processing.processing_chain_input_selection OWNER TO srv_dpmc;

--
-- Name: processing_chain_input_selection_id_seq; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

CREATE SEQUENCE processing.processing_chain_input_selection_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE processing.processing_chain_input_selection_id_seq OWNER TO srv_dpmc;

--
-- Name: processing_chain_input_selection_id_seq; Type: SEQUENCE OWNED BY; Schema: processing; Owner: srv_dpmc
--

ALTER SEQUENCE processing.processing_chain_input_selection_id_seq OWNED BY processing.processing_chain_input_selection.id;


--
-- Name: processing_chain_run; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.processing_chain_run (
    pdc_run_tag text,
    pcc_id integer,
    block_index integer NOT NULL,
    tag text NOT NULL,
    sxac_id integer NOT NULL,
    input jsonb,
    output jsonb,
    request_id integer,
    status text,
    start_time timestamp without time zone,
    stop_time timestamp without time zone
);


ALTER TABLE processing.processing_chain_run OWNER TO srv_dpmc;

--
-- Name: processing_comment_x_product_type; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.processing_comment_x_product_type (
    processing_comment integer NOT NULL,
    product_type integer NOT NULL,
    is_input boolean DEFAULT false
);


ALTER TABLE processing.processing_comment_x_product_type OWNER TO srv_dpmc;

--
-- Name: processing_hosts_host_id; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

CREATE SEQUENCE processing.processing_hosts_host_id
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE processing.processing_hosts_host_id OWNER TO srv_dpmc;

--
-- Name: processing_pool_id; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

CREATE SEQUENCE processing.processing_pool_id
    START WITH 10
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE processing.processing_pool_id OWNER TO srv_dpmc;

--
-- Name: processing_script; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.processing_script (
    id integer NOT NULL,
    pcomment character varying,
    acronym character varying(255)
);


ALTER TABLE processing.processing_script OWNER TO srv_dpmc;

--
-- Name: processing_script_detail; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.processing_script_detail (
    id integer NOT NULL,
    seq_index integer NOT NULL,
    type integer,
    function_name character varying
);


ALTER TABLE processing.processing_script_detail OWNER TO srv_dpmc;

--
-- Name: processing_type; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.processing_type (
    id integer NOT NULL,
    s_type character varying
);


ALTER TABLE processing.processing_type OWNER TO srv_dpmc;

--
-- Name: production_chain; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.production_chain (
    id integer NOT NULL,
    name text,
    comment text,
    configuration jsonb
);


ALTER TABLE processing.production_chain OWNER TO srv_dpmc;

--
-- Name: production_chain_id_seq; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE processing.production_chain ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME processing.production_chain_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: production_chain_run; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.production_chain_run (
    tag text NOT NULL,
    task_id integer NOT NULL,
    pdc_id integer NOT NULL,
    status text,
    start_time timestamp without time zone,
    stop_time timestamp without time zone,
    input jsonb
);


ALTER TABLE processing.production_chain_run OWNER TO srv_dpmc;

--
-- Name: request; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.request (
    id integer NOT NULL,
    product_type_id integer,
    processing_script_id integer NOT NULL,
    sxac_id integer NOT NULL,
    pool integer NOT NULL
);


ALTER TABLE processing.request OWNER TO srv_dpmc;

--
-- Name: s3ps_processing_chain_id_seq; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

CREATE SEQUENCE processing.s3ps_processing_chain_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE processing.s3ps_processing_chain_id_seq OWNER TO srv_dpmc;

--
-- Name: s3ps_processing_details_id_seq; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

CREATE SEQUENCE processing.s3ps_processing_details_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE processing.s3ps_processing_details_id_seq OWNER TO srv_dpmc;

--
-- Name: s3ps_production_chain_id_seq; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

CREATE SEQUENCE processing.s3ps_production_chain_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE processing.s3ps_production_chain_id_seq OWNER TO srv_dpmc;

--
-- Name: scheduler; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.scheduler (
    id integer DEFAULT nextval('processing.orchestrator_id_seq'::regclass) NOT NULL,
    sleep integer NOT NULL,
    comment text,
    active boolean
);


ALTER TABLE processing.scheduler OWNER TO srv_dpmc;

--
-- Name: scheduler_x_pool; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.scheduler_x_pool (
    scheduler_id integer NOT NULL,
    pool_id integer NOT NULL
);


ALTER TABLE processing.scheduler_x_pool OWNER TO srv_dpmc;

--
-- Name: task; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.task (
    id integer NOT NULL,
    pdc_id integer,
    cdate timestamp without time zone DEFAULT now(),
    expected_start_time timestamp without time zone,
    input jsonb,
    output jsonb,
    start_time timestamp without time zone,
    status text,
    comment text,
    CONSTRAINT task_status_check CHECK ((status = ANY (ARRAY['NEW'::text, 'EDITED'::text, 'SCHEDULED'::text, 'RUNNING'::text, 'DONE'::text, 'ERROR'::text, 'PAUSED'::text])))
);


ALTER TABLE processing.task OWNER TO srv_dpmc;

--
-- Name: task_id_seq; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE processing.task ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME processing.task_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: task_record; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.task_record (
    id integer NOT NULL,
    task_record_uuid uuid NOT NULL,
    production_chain text NOT NULL,
    orbit integer NOT NULL,
    satellite integer NOT NULL,
    status public.task_record_status DEFAULT 'RUNNING'::public.task_record_status NOT NULL,
    failed_reason text,
    created_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    end_time timestamp without time zone
);


ALTER TABLE processing.task_record OWNER TO srv_dpmc;

--
-- Name: task_record_id_seq; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

CREATE SEQUENCE processing.task_record_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE processing.task_record_id_seq OWNER TO srv_dpmc;

--
-- Name: task_record_id_seq; Type: SEQUENCE OWNED BY; Schema: processing; Owner: srv_dpmc
--

ALTER SEQUENCE processing.task_record_id_seq OWNED BY processing.task_record.id;


--
-- Name: task_record_x_batch; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.task_record_x_batch (
    id integer NOT NULL,
    task_record_id integer NOT NULL,
    batch_id integer NOT NULL,
    tag text NOT NULL,
    created_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    history_id integer,
    status text
);


ALTER TABLE processing.task_record_x_batch OWNER TO srv_dpmc;

--
-- Name: task_record_x_batch_id_seq; Type: SEQUENCE; Schema: processing; Owner: srv_dpmc
--

CREATE SEQUENCE processing.task_record_x_batch_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE processing.task_record_x_batch_id_seq OWNER TO srv_dpmc;

--
-- Name: task_record_x_batch_id_seq; Type: SEQUENCE OWNED BY; Schema: processing; Owner: srv_dpmc
--

ALTER SEQUENCE processing.task_record_x_batch_id_seq OWNED BY processing.task_record_x_batch.id;


--
-- Name: watcher; Type: TABLE; Schema: processing; Owner: srv_dpmc
--

CREATE TABLE processing.watcher (
    "time" timestamp without time zone NOT NULL,
    name character varying NOT NULL,
    flag_ok boolean NOT NULL,
    comment character varying
);


ALTER TABLE processing.watcher OWNER TO srv_dpmc;

--
-- Name: disk_location; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW public.disk_location AS
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


ALTER VIEW public.disk_location OWNER TO srv_dpmc;

--
-- Name: files_location; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW public.files_location AS
 SELECT product.id AS product_id,
    product.name AS official_name,
    (((((media.name)::text || ('/'::character varying)::text) || (media_catalog.name)::text) || ('/'::character varying)::text) || (media_catalog_entry.name)::text) AS disk_location
   FROM internal.product,
    internal.product_x_media_catalog_entry,
    internal.media_catalog_entry,
    internal.media_catalog,
    internal.media
  WHERE ((product_x_media_catalog_entry.product = product.id) AND (product_x_media_catalog_entry.media_catalog_entry = media_catalog_entry.id) AND (media_catalog_entry.media_catalog = media_catalog.id) AND (media_catalog.media = media.id));


ALTER VIEW public.files_location OWNER TO srv_dpmc;

--
-- Name: files_location_in_cmg_project; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW public.files_location_in_cmg_project AS
 SELECT product.id AS product_id,
    product.name AS official_name,
    (((((media.name)::text || ('/'::character varying)::text) || (media_catalog.name)::text) || ('/'::character varying)::text) || (media_catalog_entry.name)::text) AS disk_location
   FROM internal.product,
    internal.product_x_media_catalog_entry,
    internal.media_catalog_entry,
    internal.media_catalog,
    internal.media
  WHERE (((product.name)::text !~~ 'GOM%.N1'::text) AND ((media.name)::text ~~ '/cmg_project%'::text) AND (product_x_media_catalog_entry.product = product.id) AND (product_x_media_catalog_entry.media_catalog_entry = media_catalog_entry.id) AND (media_catalog_entry.media_catalog = media_catalog.id) AND (media_catalog.media = media.id));


ALTER VIEW public.files_location_in_cmg_project OWNER TO srv_dpmc;

--
-- Name: VIEW files_location_in_cmg_project; Type: COMMENT; Schema: public; Owner: srv_dpmc
--

COMMENT ON VIEW public.files_location_in_cmg_project IS 'This view is used to get the pathnames of products stored in the /cmg_project directory
(GOM*.N1 products are also excluded to speed up the request)';


--
-- Name: files_path; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW public.files_path AS
 SELECT product.id AS product_id,
    (((((media.name)::text || ('/'::character varying)::text) || (media_catalog.name)::text) || ('/'::character varying)::text) || (media_catalog_entry.name)::text) AS disk_location
   FROM internal.product,
    internal.product_x_media_catalog_entry,
    internal.media_catalog_entry,
    internal.media_catalog,
    internal.media
  WHERE ((product_x_media_catalog_entry.product = product.id) AND (product_x_media_catalog_entry.media_catalog_entry = media_catalog_entry.id) AND (media_catalog_entry.media_catalog = media_catalog.id) AND (media_catalog.media = media.id))
  ORDER BY product.id;


ALTER VIEW public.files_path OWNER TO srv_dpmc;

--
-- Name: hosts_current_ncpu; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW public.hosts_current_ncpu AS
 SELECT hosts.host_id,
    ((hosts.ncpu)::bigint - sum(
        CASE
            WHEN (top.hostname_id IS NULL) THEN 0
            ELSE 1
        END)) AS current_ncpu
   FROM (processing.hosts
     LEFT JOIN processing.top ON ((top.hostname_id = hosts.host_id)))
  GROUP BY hosts.host_id, hosts.ncpu;


ALTER VIEW public.hosts_current_ncpu OWNER TO srv_dpmc;

--
-- Name: last_product; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW public.last_product AS
 SELECT product.id,
    product.name,
    files_location.disk_location
   FROM (internal.product
     JOIN public.files_location ON ((files_location.product_id = product.id)))
  WHERE (product.generation_date_time IS NOT NULL)
  ORDER BY product.generation_date_time DESC
 LIMIT 20;


ALTER VIEW public.last_product OWNER TO srv_dpmc;

--
-- Name: nc_1txy__Sheet1; Type: TABLE; Schema: public; Owner: srv_dpmc
--

CREATE TABLE public."nc_1txy__Sheet1" (
    id integer NOT NULL,
    title character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public."nc_1txy__Sheet1" OWNER TO srv_dpmc;

--
-- Name: nc_1txy__Sheet1_id_seq; Type: SEQUENCE; Schema: public; Owner: srv_dpmc
--

CREATE SEQUENCE public."nc_1txy__Sheet1_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."nc_1txy__Sheet1_id_seq" OWNER TO srv_dpmc;

--
-- Name: nc_1txy__Sheet1_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: srv_dpmc
--

ALTER SEQUENCE public."nc_1txy__Sheet1_id_seq" OWNED BY public."nc_1txy__Sheet1".id;


--
-- Name: overlap_product; Type: VIEW; Schema: public; Owner: srv_dpmc
--

CREATE VIEW public.overlap_product AS
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
  WHERE ((p1.id <> p2.id) AND (p1.product_type = p2.product_type) AND ("substring"((p1.name)::text, 11, 1) = "substring"((p2.name)::text, 11, 1)) AND (sp1.product = p1.id) AND (sp2.product = p2.id) AND (sp1.start_date_time < sp2.stop_date_time) AND (sp2.start_date_time < sp1.stop_date_time));


ALTER VIEW public.overlap_product OWNER TO srv_dpmc;

--
-- Name: seq_test_quantum; Type: SEQUENCE; Schema: public; Owner: srv_dpmc
--

CREATE SEQUENCE public.seq_test_quantum
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seq_test_quantum OWNER TO srv_dpmc;

--
-- Name: processing_chain_baseline id; Type: DEFAULT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_chain_baseline ALTER COLUMN id SET DEFAULT nextval('processing.processing_chain_baseline_id_seq'::regclass);


--
-- Name: processing_chain_input_selection id; Type: DEFAULT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_chain_input_selection ALTER COLUMN id SET DEFAULT nextval('processing.processing_chain_input_selection_id_seq'::regclass);


--
-- Name: task_record id; Type: DEFAULT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.task_record ALTER COLUMN id SET DEFAULT nextval('processing.task_record_id_seq'::regclass);


--
-- Name: task_record_x_batch id; Type: DEFAULT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.task_record_x_batch ALTER COLUMN id SET DEFAULT nextval('processing.task_record_x_batch_id_seq'::regclass);


--
-- Name: nc_1txy__Sheet1 id; Type: DEFAULT; Schema: public; Owner: srv_dpmc
--

ALTER TABLE ONLY public."nc_1txy__Sheet1" ALTER COLUMN id SET DEFAULT nextval('public."nc_1txy__Sheet1_id_seq"'::regclass);


--
-- Data for Name: adf_baseline; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.adf_baseline (aux_id, version, generation_date, insertion_date, document_id, comment) FROM stdin;
\.


--
-- Data for Name: auxiliary_configuration; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.auxiliary_configuration (id, name, comment, index_media_catalog) FROM stdin;
0	dummy	dummy	0
\.


--
-- Data for Name: auxiliary_configuration_detail; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.auxiliary_configuration_detail (configuration, product_type, version) FROM stdin;
\.


--
-- Data for Name: auxiliary_product; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.auxiliary_product (product, validity_start_date_time, validity_stop_date_time, version) FROM stdin;
\.


--
-- Data for Name: center; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.center (id, latitude, longitude, code, name, code_in_product_name) FROM stdin;
14	0	0	F-ACRI	ACRI Processing Centre	ACR
\.


--
-- Data for Name: constant; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.constant (id, name, value) FROM stdin;
\.


--
-- Data for Name: dataset; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.dataset (id, cdate, name, comment) FROM stdin;
\.


--
-- Data for Name: dataset_x_product; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.dataset_x_product (dataset_id, product_id) FROM stdin;
\.


--
-- Data for Name: global; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.global (center, output_media_catalog, idl_token_count, global_site, launch_time_out, min_input_processing_stage, default_output_processing_stage, stage_shift_interval, stage_shift_count, run_time_out, last_schedule_date_time, scheduler_time_out, max_time_cache, max_time_lock, s3_cots, task_rule_id, executor_pause_flag) FROM stdin;
14	0	40	645	00:02:00	O	T	00:05:00	5	96:00:00	2026-01-29 16:33:48.129165	00:15:00	48	10	/exports/dpmc/scripts/specific-package/S3/cots_path.sh	0	t
\.


--
-- Data for Name: instrument; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.instrument (satellite, id, acronym, name) FROM stdin;
\.


--
-- Data for Name: ipf_processing_baseline; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.ipf_processing_baseline (id, document, creation_date, comment, version) FROM stdin;
\.


--
-- Data for Name: ipf_processing_baseline_x_sxa; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.ipf_processing_baseline_x_sxa (id, ipf_processing_baseline_id, soft_x_aux_conf_id, comment) FROM stdin;
\.


--
-- Data for Name: ipf_x_dynamic_adf; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.ipf_x_dynamic_adf (ipf, acronym, type, mode, retrieval_mode, backup_of) FROM stdin;
\.


--
-- Data for Name: living_request; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.living_request (request) FROM stdin;
\.


--
-- Data for Name: media; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.media (id, media_type, name, capacity, reserved_capacity, current_physical_capacity, comment, source_media, recipient, available) FROM stdin;
0	8	/exports/s3ps/tmp	0	0	0	dummy	\N	\N	\N
\.


--
-- Data for Name: media_catalog; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.media_catalog (media, name, id) FROM stdin;
0	dummy	0
\.


--
-- Data for Name: media_catalog_entry; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.media_catalog_entry (id, media_catalog, name, md5_checksum) FROM stdin;
\.


--
-- Data for Name: media_type; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.media_type (id, capacity, sequential, name, removable) FROM stdin;
9	2.2	t	LTO6	t
10	7	f	HDD_8	f
8	0	f	HARD-DISK	f
11	0.00341796875	t	USB_4	t
12	54	f	NAS_60	t
13	7	t	HDD_TEST	t
14	36	f	HDD_40	t
\.


--
-- Data for Name: orbit; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.orbit (satellite, absolute_number, mission_phase, phase_cycle, cycle_relative_number, anx_date_time, theoretical_anx_date_time, anx_date_time_source_product) FROM stdin;
\.


--
-- Data for Name: processing; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.processing (id, center, software, stage, state, product_type) FROM stdin;
0	14	0	0	0	0
\.


--
-- Data for Name: processing_configuration; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.processing_configuration (id, cdate, sxac_id, processing_comment_id, parameter, comment) FROM stdin;
\.


--
-- Data for Name: processing_product_x_tag; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.processing_product_x_tag (product_name, tag) FROM stdin;
\.


--
-- Data for Name: product; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.product (id, processing, product_type, generation_date_time, size, checked, name, obsolescence_date_time) FROM stdin;
0	0	0	2001-01-01 01:00:00	0	f	dummy	\N
\.


--
-- Data for Name: product_type; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.product_type (id, sph_size, mean_size, acronym, name, processing_level, cache_duration, gap_type, gap_nominal, retention_time) FROM stdin;
0	\N	\N	dummy	dummy type	0	24	\N	\N	\N
\.


--
-- Data for Name: product_x_media_catalog_entry; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.product_x_media_catalog_entry (media_catalog_entry, product) FROM stdin;
\.


--
-- Data for Name: production_chain_x_product_type; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.production_chain_x_product_type (production_chain, product_type) FROM stdin;
\.


--
-- Data for Name: requester; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.requester (id, name, group_name, email, address, login, password, media_catalog, ftp_login, ftp_password, ftp_server, ftp_directory) FROM stdin;
0	Operator	ACRI	gilbert.barrot@acri-st.fr	\N	cmg	project	0	\N	\N	\N	\N
\.


--
-- Data for Name: satellite; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.satellite (id, acronym, name, launch_date_time) FROM stdin;
\.


--
-- Data for Name: sensing_product; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.sensing_product (product, start_date_time, stop_date_time, start_absolute_orbit_number, product_type_counter, error, state_vector) FROM stdin;
\.


--
-- Data for Name: software; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.software (id, name, version, default_auxiliary_configuration, processing_stage, image_tag) FROM stdin;
0	dummy	0	0	\N	\N
\.


--
-- Data for Name: software_x_auxiliary_configuration; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.software_x_auxiliary_configuration (id, software, auxiliary_configuration, ipf_baseline, creation_date, comment) FROM stdin;
0	0	0	\N	2025-12-15 14:36:04.308709	DUMMY
\.


--
-- Data for Name: software_x_binary; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.software_x_binary (software_id, rank, binary_name) FROM stdin;
\.


--
-- Data for Name: software_x_image_tag; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.software_x_image_tag (software_id, image_tag) FROM stdin;
\.


--
-- Data for Name: state_vector; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.state_vector (satellite, absolute_orbit_number, date_time, delta_ut1, x_position, y_position, z_position, x_velocity, y_velocity, z_velocity, source, id) FROM stdin;
\.


--
-- Data for Name: task; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.task (start_time, production_chain, orbit, satellite, status, end_time, baseline, pool, extra_params) FROM stdin;
\.


--
-- Data for Name: task_rule; Type: TABLE DATA; Schema: internal; Owner: srv_dpmc
--

COPY internal.task_rule (task_rule, production_chain, time_shift, parameters) FROM stdin;
\.


--
-- Data for Name: batch; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.batch (id, request_id, constraints, input, output, status, priority, configuration, cdate, center_id) FROM stdin;
\.


--
-- Data for Name: batch_x_center; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.batch_x_center (batch_id, center_id) FROM stdin;
\.


--
-- Data for Name: block_parameters; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.block_parameters (pdc_run_tag, tag, params) FROM stdin;
\.


--
-- Data for Name: center; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.center (id, name, location, emission_factor, energy_intensity, pue, code) FROM stdin;
0	Dummy	\N	0	0	0	__
1	AcriST	France	0.05	0.02	1.5	ACR
\.


--
-- Data for Name: history; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.history (history_id, processing_script, host_id, started, ended, file_input_id, request_id, batch_id, status, output_dir, software_id, auxiliary_configuration_id, processing_comment_id, tag, processing_configuration_id, log_file, batch_parameters, avg_power, data_volume, center_id) FROM stdin;
\.


--
-- Data for Name: history_x_product; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.history_x_product (history, product) FROM stdin;
\.


--
-- Data for Name: hosts; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.hosts (host_id, hostname, ncpu, bogomips, nice, os_type, os_version, processing_dir, available, ip_address, cache_dir, ram, nb_cores) FROM stdin;
0	DISCARDED	0	0	0	\N	\N	\N	f	\N	\N	\N	\N
\.


--
-- Data for Name: parameters_set; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.parameters_set (id, keyword_index, keyword, value) FROM stdin;
\.


--
-- Data for Name: pdc_x_pcc; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.pdc_x_pcc (pdc_id, pcc_id, parent_pcc_id, parent_dependency_mode) FROM stdin;
\.


--
-- Data for Name: pool; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.pool (id, comment) FROM stdin;
0	Generic
\.


--
-- Data for Name: pool_x_hosts; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.pool_x_hosts (pool, hosts) FROM stdin;
\.


--
-- Data for Name: processing_baseline; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.processing_baseline (baseline, active, parameters, order_priority, plateform) FROM stdin;
\.


--
-- Data for Name: processing_chain; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.processing_chain (id, name, processing_script_id, comment, configuration) FROM stdin;
\.


--
-- Data for Name: processing_chain_baseline; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.processing_chain_baseline (id, processing_chain, sxac, baseline, pool, processing_configuration, output_path, active, input_parameters) FROM stdin;
\.


--
-- Data for Name: processing_chain_input_selection; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.processing_chain_input_selection (id, processing_chain_baseline_id, input_selection_filters, run_type, job_order_parameters) FROM stdin;
\.


--
-- Data for Name: processing_chain_run; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.processing_chain_run (pdc_run_tag, pcc_id, block_index, tag, sxac_id, input, output, request_id, status, start_time, stop_time) FROM stdin;
\.


--
-- Data for Name: processing_comment_x_product_type; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.processing_comment_x_product_type (processing_comment, product_type, is_input) FROM stdin;
\.


--
-- Data for Name: processing_script; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.processing_script (id, pcomment, acronym) FROM stdin;
0	Generic process	Generic_process
\.


--
-- Data for Name: processing_script_detail; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.processing_script_detail (id, seq_index, type, function_name) FROM stdin;
0	1	1	generic/generic_processing.sh
\.


--
-- Data for Name: processing_type; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.processing_type (id, s_type) FROM stdin;
1	bash
2	pgbash
3	plsql
4	sql
5	python
6	docker
\.


--
-- Data for Name: production_chain; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.production_chain (id, name, comment, configuration) FROM stdin;
\.


--
-- Data for Name: production_chain_run; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.production_chain_run (tag, task_id, pdc_id, status, start_time, stop_time, input) FROM stdin;
\.


--
-- Data for Name: request; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.request (id, product_type_id, processing_script_id, sxac_id, pool) FROM stdin;
0	0	0	0	0
\.


--
-- Data for Name: scheduler; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.scheduler (id, sleep, comment, active) FROM stdin;
\.


--
-- Data for Name: scheduler_x_pool; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.scheduler_x_pool (scheduler_id, pool_id) FROM stdin;
\.


--
-- Data for Name: task; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.task (id, pdc_id, cdate, expected_start_time, input, output, start_time, status, comment) FROM stdin;
1	1	\N	\N	\N	\N	2026-01-29 11:19:36.069958	DONE	\N
3	2	2026-01-15 09:15:29.754885	\N	{"MODE": "hue", "INPUT": "/work/image.png", "GRID_H": 3, "GRID_W": 3, "TILE_H": 326, "TILE_W": 326, "FINAL_H": 1000, "FINAL_W": 1000, "MOD_HUE": 100, "MOD_SAT": 160, "SPACING": 10, "POSTERIZE": 6, "MOD_BRIGHT": 110}	{"image": "work/warhol.png"}	2026-01-29 16:32:00.371753	RUNNING	\N
2	1	2026-01-13 11:55:09.905977	\N	{"params": {"MODE": "hue", "GRID_H": 4, "GRID_W": 4, "FINAL_H": 1500, "FINAL_W": 1500, "MOD_HUE": 100, "MOD_SAT": 160, "SPAWING": 10, "POSTERIZE": 6, "MOD_BRIGHT": 110}}	\N	2026-01-19 10:22:44.033724	DONE	\N
\.


--
-- Data for Name: task_record; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.task_record (id, task_record_uuid, production_chain, orbit, satellite, status, failed_reason, created_time, end_time) FROM stdin;
\.


--
-- Data for Name: task_record_x_batch; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.task_record_x_batch (id, task_record_id, batch_id, tag, created_time, history_id, status) FROM stdin;
\.


--
-- Data for Name: top; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.top (batch_id, hostname_id, started, pid) FROM stdin;
\.


--
-- Data for Name: watcher; Type: TABLE DATA; Schema: processing; Owner: srv_dpmc
--

COPY processing.watcher ("time", name, flag_ok, comment) FROM stdin;
\.


--
-- Data for Name: nc_1txy__Sheet1; Type: TABLE DATA; Schema: public; Owner: srv_dpmc
--

COPY public."nc_1txy__Sheet1" (id, title, created_at, updated_at) FROM stdin;
\.


--
-- Name: attribute_dictionary_id_seq; Type: SEQUENCE SET; Schema: internal; Owner: srv_dpmc
--

SELECT pg_catalog.setval('internal.attribute_dictionary_id_seq', 1, false);


--
-- Name: auxiliary_configuration_seq; Type: SEQUENCE SET; Schema: internal; Owner: srv_dpmc
--

SELECT pg_catalog.setval('internal.auxiliary_configuration_seq', 371, true);


--
-- Name: dataset_seq; Type: SEQUENCE SET; Schema: internal; Owner: srv_dpmc
--

SELECT pg_catalog.setval('internal.dataset_seq', 543916, true);


--
-- Name: document_seq; Type: SEQUENCE SET; Schema: internal; Owner: srv_dpmc
--

SELECT pg_catalog.setval('internal.document_seq', 1, true);


--
-- Name: downlink_orbit_seq; Type: SEQUENCE SET; Schema: internal; Owner: srv_dpmc
--

SELECT pg_catalog.setval('internal.downlink_orbit_seq', 5398, true);


--
-- Name: gen_seq; Type: SEQUENCE SET; Schema: internal; Owner: srv_dpmc
--

SELECT pg_catalog.setval('internal.gen_seq', 1, true);


--
-- Name: media_catalog_entry_sequence; Type: SEQUENCE SET; Schema: internal; Owner: srv_dpmc
--

SELECT pg_catalog.setval('internal.media_catalog_entry_sequence', 11528411, true);


--
-- Name: media_catalog_sequence; Type: SEQUENCE SET; Schema: internal; Owner: srv_dpmc
--

SELECT pg_catalog.setval('internal.media_catalog_sequence', 9995770, true);


--
-- Name: media_id; Type: SEQUENCE SET; Schema: internal; Owner: srv_dpmc
--

SELECT pg_catalog.setval('internal.media_id', 996160, true);


--
-- Name: media_sequence; Type: SEQUENCE SET; Schema: internal; Owner: srv_dpmc
--

SELECT pg_catalog.setval('internal.media_sequence', 1000, true);


--
-- Name: platform_id_seq; Type: SEQUENCE SET; Schema: internal; Owner: srv_dpmc
--

SELECT pg_catalog.setval('internal.platform_id_seq', 1, false);


--
-- Name: priority_seq; Type: SEQUENCE SET; Schema: internal; Owner: srv_dpmc
--

SELECT pg_catalog.setval('internal.priority_seq', 1, true);


--
-- Name: processing_seq; Type: SEQUENCE SET; Schema: internal; Owner: srv_dpmc
--

SELECT pg_catalog.setval('internal.processing_seq', 1, true);


--
-- Name: product_seq; Type: SEQUENCE SET; Schema: internal; Owner: srv_dpmc
--

SELECT pg_catalog.setval('internal.product_seq', 11550826, true);


--
-- Name: request_seq; Type: SEQUENCE SET; Schema: internal; Owner: srv_dpmc
--

SELECT pg_catalog.setval('internal.request_seq', 16904, true);


--
-- Name: requester_seq; Type: SEQUENCE SET; Schema: internal; Owner: srv_dpmc
--

SELECT pg_catalog.setval('internal.requester_seq', 50, true);


--
-- Name: server_account_seq; Type: SEQUENCE SET; Schema: internal; Owner: srv_dpmc
--

SELECT pg_catalog.setval('internal.server_account_seq', 2, true);


--
-- Name: software_seq; Type: SEQUENCE SET; Schema: internal; Owner: srv_dpmc
--

SELECT pg_catalog.setval('internal.software_seq', 336, true);


--
-- Name: status_type_id_seq; Type: SEQUENCE SET; Schema: internal; Owner: srv_dpmc
--

SELECT pg_catalog.setval('internal.status_type_id_seq', 1, false);


--
-- Name: temp_seq; Type: SEQUENCE SET; Schema: internal; Owner: srv_dpmc
--

SELECT pg_catalog.setval('internal.temp_seq', 204043, true);


--
-- Name: batch_id_seq; Type: SEQUENCE SET; Schema: processing; Owner: srv_dpmc
--

SELECT pg_catalog.setval('processing.batch_id_seq', 1002, true);


--
-- Name: cache_lock_seq; Type: SEQUENCE SET; Schema: processing; Owner: srv_dpmc
--

SELECT pg_catalog.setval('processing.cache_lock_seq', 1, false);


--
-- Name: center_id_seq; Type: SEQUENCE SET; Schema: processing; Owner: srv_dpmc
--

SELECT pg_catalog.setval('processing.center_id_seq', 1, true);


--
-- Name: history_history_id; Type: SEQUENCE SET; Schema: processing; Owner: srv_dpmc
--

SELECT pg_catalog.setval('processing.history_history_id', 17629618, true);


--
-- Name: orchestrator_id_seq; Type: SEQUENCE SET; Schema: processing; Owner: srv_dpmc
--

SELECT pg_catalog.setval('processing.orchestrator_id_seq', 1, false);


--
-- Name: processing_batch_batch_id; Type: SEQUENCE SET; Schema: processing; Owner: srv_dpmc
--

SELECT pg_catalog.setval('processing.processing_batch_batch_id', 18775655, true);


--
-- Name: processing_chain_baseline_id_seq; Type: SEQUENCE SET; Schema: processing; Owner: srv_dpmc
--

SELECT pg_catalog.setval('processing.processing_chain_baseline_id_seq', 146, true);


--
-- Name: processing_chain_id_seq; Type: SEQUENCE SET; Schema: processing; Owner: srv_dpmc
--

SELECT pg_catalog.setval('processing.processing_chain_id_seq', 7, true);


--
-- Name: processing_chain_input_selection_id_seq; Type: SEQUENCE SET; Schema: processing; Owner: srv_dpmc
--

SELECT pg_catalog.setval('processing.processing_chain_input_selection_id_seq', 134, true);


--
-- Name: processing_hosts_host_id; Type: SEQUENCE SET; Schema: processing; Owner: srv_dpmc
--

SELECT pg_catalog.setval('processing.processing_hosts_host_id', 167, true);


--
-- Name: processing_pool_id; Type: SEQUENCE SET; Schema: processing; Owner: srv_dpmc
--

SELECT pg_catalog.setval('processing.processing_pool_id', 13, true);


--
-- Name: production_chain_id_seq; Type: SEQUENCE SET; Schema: processing; Owner: srv_dpmc
--

SELECT pg_catalog.setval('processing.production_chain_id_seq', 2, true);


--
-- Name: s3ps_processing_chain_id_seq; Type: SEQUENCE SET; Schema: processing; Owner: srv_dpmc
--

SELECT pg_catalog.setval('processing.s3ps_processing_chain_id_seq', 7, true);


--
-- Name: s3ps_processing_details_id_seq; Type: SEQUENCE SET; Schema: processing; Owner: srv_dpmc
--

SELECT pg_catalog.setval('processing.s3ps_processing_details_id_seq', 1, false);


--
-- Name: s3ps_production_chain_id_seq; Type: SEQUENCE SET; Schema: processing; Owner: srv_dpmc
--

SELECT pg_catalog.setval('processing.s3ps_production_chain_id_seq', 12, true);


--
-- Name: task_id_seq; Type: SEQUENCE SET; Schema: processing; Owner: srv_dpmc
--

SELECT pg_catalog.setval('processing.task_id_seq', 3, true);


--
-- Name: task_record_id_seq; Type: SEQUENCE SET; Schema: processing; Owner: srv_dpmc
--

SELECT pg_catalog.setval('processing.task_record_id_seq', 34526, true);


--
-- Name: task_record_x_batch_id_seq; Type: SEQUENCE SET; Schema: processing; Owner: srv_dpmc
--

SELECT pg_catalog.setval('processing.task_record_x_batch_id_seq', 60585, true);


--
-- Name: nc_1txy__Sheet1_id_seq; Type: SEQUENCE SET; Schema: public; Owner: srv_dpmc
--

SELECT pg_catalog.setval('public."nc_1txy__Sheet1_id_seq"', 1, false);


--
-- Name: seq_test_quantum; Type: SEQUENCE SET; Schema: public; Owner: srv_dpmc
--

SELECT pg_catalog.setval('public.seq_test_quantum', 76769, true);


--
-- Name: auxiliary_configuration_detail auxiliary_configuration_detail_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.auxiliary_configuration_detail
    ADD CONSTRAINT auxiliary_configuration_detail_pkey PRIMARY KEY (configuration, product_type);


--
-- Name: auxiliary_configuration auxiliary_configuration_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.auxiliary_configuration
    ADD CONSTRAINT auxiliary_configuration_name_key UNIQUE (name);


--
-- Name: auxiliary_configuration auxiliary_configuration_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.auxiliary_configuration
    ADD CONSTRAINT auxiliary_configuration_pkey PRIMARY KEY (id);


--
-- Name: adf_baseline baseline2_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.adf_baseline
    ADD CONSTRAINT baseline2_pkey PRIMARY KEY (aux_id);


--
-- Name: center center_code_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.center
    ADD CONSTRAINT center_code_key UNIQUE (name);


--
-- Name: center center_code_product_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.center
    ADD CONSTRAINT center_code_product_name_key UNIQUE (code_in_product_name);


--
-- Name: center center_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.center
    ADD CONSTRAINT center_name_key UNIQUE (code);


--
-- Name: center center_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.center
    ADD CONSTRAINT center_pkey PRIMARY KEY (id);


--
-- Name: constant constant_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.constant
    ADD CONSTRAINT constant_pkey PRIMARY KEY (id);


--
-- Name: requester ct_unique_requester_name; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.requester
    ADD CONSTRAINT ct_unique_requester_name UNIQUE (name);


--
-- Name: dataset dataset_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.dataset
    ADD CONSTRAINT dataset_name_key UNIQUE (name);


--
-- Name: dataset dataset_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.dataset
    ADD CONSTRAINT dataset_pkey PRIMARY KEY (id);


--
-- Name: dataset_x_product dataset_x_product_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.dataset_x_product
    ADD CONSTRAINT dataset_x_product_pkey PRIMARY KEY (dataset_id, product_id);


--
-- Name: instrument instrument_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.instrument
    ADD CONSTRAINT instrument_pkey PRIMARY KEY (satellite, id);


--
-- Name: living_request living_request_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.living_request
    ADD CONSTRAINT living_request_pkey PRIMARY KEY (request);


--
-- Name: media_catalog_entry media_catalog_entry_media_catalog_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.media_catalog_entry
    ADD CONSTRAINT media_catalog_entry_media_catalog_key UNIQUE (media_catalog, name);


--
-- Name: media_catalog_entry media_catalog_entry_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.media_catalog_entry
    ADD CONSTRAINT media_catalog_entry_pkey PRIMARY KEY (id);


--
-- Name: media_catalog media_catalog_media_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.media_catalog
    ADD CONSTRAINT media_catalog_media_key UNIQUE (media, name);


--
-- Name: media_catalog media_catalog_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.media_catalog
    ADD CONSTRAINT media_catalog_pkey PRIMARY KEY (id);


--
-- Name: media media_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.media
    ADD CONSTRAINT media_name_key UNIQUE (name);


--
-- Name: media media_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);


--
-- Name: media_type media_type_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.media_type
    ADD CONSTRAINT media_type_name_key UNIQUE (name);


--
-- Name: media_type media_type_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.media_type
    ADD CONSTRAINT media_type_pkey PRIMARY KEY (id);


--
-- Name: orbit orbit_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.orbit
    ADD CONSTRAINT orbit_pkey PRIMARY KEY (satellite, absolute_number);


--
-- Name: software_x_auxiliary_configuration pk_id_solftware_x_auxiliary_configuration; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.software_x_auxiliary_configuration
    ADD CONSTRAINT pk_id_solftware_x_auxiliary_configuration PRIMARY KEY (id);


--
-- Name: ipf_processing_baseline pk_ipf_baseline_id; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.ipf_processing_baseline
    ADD CONSTRAINT pk_ipf_baseline_id PRIMARY KEY (id);


--
-- Name: ipf_processing_baseline_x_sxa pk_ipf_baseline_x_sxa_id; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.ipf_processing_baseline_x_sxa
    ADD CONSTRAINT pk_ipf_baseline_x_sxa_id PRIMARY KEY (id);


--
-- Name: processing processing_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.processing
    ADD CONSTRAINT processing_pkey PRIMARY KEY (id);


--
-- Name: processing_product_x_tag processing_product_x_tag_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.processing_product_x_tag
    ADD CONSTRAINT processing_product_x_tag_pkey PRIMARY KEY (product_name, tag);


--
-- Name: product product_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.product
    ADD CONSTRAINT product_name_key UNIQUE (name);


--
-- Name: product product_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.product
    ADD CONSTRAINT product_pkey PRIMARY KEY (id);


--
-- Name: product_type product_type_acronym_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.product_type
    ADD CONSTRAINT product_type_acronym_key UNIQUE (acronym);


--
-- Name: product_type product_type_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.product_type
    ADD CONSTRAINT product_type_pkey PRIMARY KEY (id);


--
-- Name: product_x_media_catalog_entry product_x_media_catalog_entry_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.product_x_media_catalog_entry
    ADD CONSTRAINT product_x_media_catalog_entry_pkey PRIMARY KEY (media_catalog_entry, product);


--
-- Name: production_chain_x_product_type production_chain_x_product_type_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.production_chain_x_product_type
    ADD CONSTRAINT production_chain_x_product_type_pkey PRIMARY KEY (production_chain, product_type);


--
-- Name: processing_configuration reprocessing_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.processing_configuration
    ADD CONSTRAINT reprocessing_pkey PRIMARY KEY (id);


--
-- Name: requester requester_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.requester
    ADD CONSTRAINT requester_pkey PRIMARY KEY (id);


--
-- Name: satellite satellite_acronym_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.satellite
    ADD CONSTRAINT satellite_acronym_key UNIQUE (acronym);


--
-- Name: satellite satellite_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.satellite
    ADD CONSTRAINT satellite_name_key UNIQUE (name);


--
-- Name: satellite satellite_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.satellite
    ADD CONSTRAINT satellite_pkey PRIMARY KEY (id);


--
-- Name: sensing_product sensing_product_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.sensing_product
    ADD CONSTRAINT sensing_product_pkey PRIMARY KEY (product);


--
-- Name: software software_name_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.software
    ADD CONSTRAINT software_name_key UNIQUE (name, version);


--
-- Name: software software_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.software
    ADD CONSTRAINT software_pkey PRIMARY KEY (id);


--
-- Name: software_x_binary software_x_binary_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.software_x_binary
    ADD CONSTRAINT software_x_binary_pkey PRIMARY KEY (software_id, rank);


--
-- Name: software_x_image_tag software_x_image_tag_software_id_image_tag_key; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.software_x_image_tag
    ADD CONSTRAINT software_x_image_tag_software_id_image_tag_key UNIQUE (software_id, image_tag);


--
-- Name: state_vector state_vector_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.state_vector
    ADD CONSTRAINT state_vector_pkey PRIMARY KEY (id);


--
-- Name: task task_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.task
    ADD CONSTRAINT task_pkey PRIMARY KEY (production_chain, orbit, satellite);


--
-- Name: task_rule task_rule_pkey; Type: CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.task_rule
    ADD CONSTRAINT task_rule_pkey PRIMARY KEY (task_rule, production_chain);


--
-- Name: batch batch_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.batch
    ADD CONSTRAINT batch_pkey PRIMARY KEY (id);


--
-- Name: center center_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.center
    ADD CONSTRAINT center_pkey PRIMARY KEY (id);


--
-- Name: history history_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.history
    ADD CONSTRAINT history_pkey PRIMARY KEY (history_id);


--
-- Name: history_x_product history_x_product_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.history_x_product
    ADD CONSTRAINT history_x_product_pkey PRIMARY KEY (history, product);


--
-- Name: hosts hosts_hostname; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.hosts
    ADD CONSTRAINT hosts_hostname UNIQUE (hostname);


--
-- Name: hosts hosts_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.hosts
    ADD CONSTRAINT hosts_pkey PRIMARY KEY (host_id);


--
-- Name: scheduler orchestrator_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.scheduler
    ADD CONSTRAINT orchestrator_pkey PRIMARY KEY (id);


--
-- Name: parameters_set parameters_set_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.parameters_set
    ADD CONSTRAINT parameters_set_pkey PRIMARY KEY (id, keyword_index);


--
-- Name: pool pool_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.pool
    ADD CONSTRAINT pool_pkey PRIMARY KEY (id);


--
-- Name: pool_x_hosts pool_x_hosts_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.pool_x_hosts
    ADD CONSTRAINT pool_x_hosts_pkey PRIMARY KEY (pool, hosts);


--
-- Name: processing_baseline processing_baseline_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_baseline
    ADD CONSTRAINT processing_baseline_pkey PRIMARY KEY (baseline);


--
-- Name: processing_chain_baseline processing_chain_baseline_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_chain_baseline
    ADD CONSTRAINT processing_chain_baseline_pkey PRIMARY KEY (id);


--
-- Name: processing_chain_input_selection processing_chain_input_selection_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_chain_input_selection
    ADD CONSTRAINT processing_chain_input_selection_pkey PRIMARY KEY (id);


--
-- Name: processing_chain processing_chain_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_chain
    ADD CONSTRAINT processing_chain_pkey PRIMARY KEY (id);


--
-- Name: processing_chain_run processing_chain_run_status_check; Type: CHECK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE processing.processing_chain_run
    ADD CONSTRAINT processing_chain_run_status_check CHECK ((status = ANY (ARRAY['SCHEDULED'::text, 'RUNNING'::text, 'DONE'::text, 'ERROR'::text, 'PAUSED'::text, 'TIME-OUT'::text]))) NOT VALID;


--
-- Name: processing_script processing_comment_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_script
    ADD CONSTRAINT processing_comment_pkey PRIMARY KEY (id);


--
-- Name: processing_comment_x_product_type processing_comment_x_product_type_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_comment_x_product_type
    ADD CONSTRAINT processing_comment_x_product_type_pkey PRIMARY KEY (processing_comment, product_type);


--
-- Name: processing_script_detail processing_set_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_script_detail
    ADD CONSTRAINT processing_set_pkey PRIMARY KEY (id, seq_index);


--
-- Name: processing_type processing_type_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_type
    ADD CONSTRAINT processing_type_pkey PRIMARY KEY (id);


--
-- Name: production_chain production_chain_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.production_chain
    ADD CONSTRAINT production_chain_pkey PRIMARY KEY (id);


--
-- Name: production_chain_run production_chain_run_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.production_chain_run
    ADD CONSTRAINT production_chain_run_pkey PRIMARY KEY (tag);


--
-- Name: production_chain_run production_chain_run_status_check; Type: CHECK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE processing.production_chain_run
    ADD CONSTRAINT production_chain_run_status_check CHECK ((status = ANY (ARRAY['SCHEDULED'::text, 'RUNNING'::text, 'DONE'::text, 'ERROR'::text, 'PAUSED'::text, 'TIME-OUT'::text]))) NOT VALID;


--
-- Name: request request_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.request
    ADD CONSTRAINT request_pkey PRIMARY KEY (id);


--
-- Name: task task_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.task
    ADD CONSTRAINT task_pkey PRIMARY KEY (id);


--
-- Name: task_record task_record_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.task_record
    ADD CONSTRAINT task_record_pkey PRIMARY KEY (id);


--
-- Name: task_record_x_batch task_record_x_batch_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.task_record_x_batch
    ADD CONSTRAINT task_record_x_batch_pkey PRIMARY KEY (id);


--
-- Name: top top_pkey; Type: CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.top
    ADD CONSTRAINT top_pkey PRIMARY KEY (batch_id);


--
-- Name: nc_1txy__Sheet1 nc_1txy__Sheet1_pkey; Type: CONSTRAINT; Schema: public; Owner: srv_dpmc
--

ALTER TABLE ONLY public."nc_1txy__Sheet1"
    ADD CONSTRAINT "nc_1txy__Sheet1_pkey" PRIMARY KEY (id);


--
-- Name: dataset_name_idx; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX dataset_name_idx ON internal.dataset USING btree (name);


--
-- Name: dataset_x_product_dataset_id_idx; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX dataset_x_product_dataset_id_idx ON internal.dataset_x_product USING btree (dataset_id);


--
-- Name: dataset_x_product_dataset_id_product_id_idx; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX dataset_x_product_dataset_id_product_id_idx ON internal.dataset_x_product USING btree (dataset_id, product_id);


--
-- Name: dataset_x_product_product_id_idx; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX dataset_x_product_product_id_idx ON internal.dataset_x_product USING btree (product_id);


--
-- Name: idx_auxiliary_product_double_date_time; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_auxiliary_product_double_date_time ON internal.auxiliary_product USING btree (validity_start_date_time, validity_stop_date_time);


--
-- Name: idx_auxiliary_product_double_date_time2; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_auxiliary_product_double_date_time2 ON internal.auxiliary_product USING btree (validity_stop_date_time, validity_start_date_time);


--
-- Name: idx_auxiliary_product_validity_start_date_time; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_auxiliary_product_validity_start_date_time ON internal.auxiliary_product USING btree (validity_start_date_time);


--
-- Name: idx_auxiliary_product_validity_stop_date_time; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_auxiliary_product_validity_stop_date_time ON internal.auxiliary_product USING btree (validity_stop_date_time);


--
-- Name: idx_auxiliary_product_version; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_auxiliary_product_version ON internal.auxiliary_product USING btree (version);


--
-- Name: idx_error_type_x_product_product; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_error_type_x_product_product ON internal.product USING btree (id);


--
-- Name: idx_media_catalog_entry_media_catalog; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_media_catalog_entry_media_catalog ON internal.media_catalog_entry USING btree (media_catalog);


--
-- Name: idx_media_catalog_entry_media_catalog_name; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_media_catalog_entry_media_catalog_name ON internal.media_catalog_entry USING btree (media_catalog, name);


--
-- Name: idx_media_catalog_entry_name; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_media_catalog_entry_name ON internal.media_catalog_entry USING btree (name);


--
-- Name: idx_media_catalog_media_name; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_media_catalog_media_name ON internal.media_catalog USING btree (media, name);


--
-- Name: idx_media_catalog_name; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_media_catalog_name ON internal.media_catalog USING btree (name);


--
-- Name: idx_media_name; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_media_name ON internal.media USING btree (name);


--
-- Name: idx_orbit_satellite_anx_date_time; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_orbit_satellite_anx_date_time ON internal.orbit USING btree (satellite, anx_date_time);


--
-- Name: idx_orbit_satellite_cycle_relative_number; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_orbit_satellite_cycle_relative_number ON internal.orbit USING btree (satellite, cycle_relative_number);


--
-- Name: idx_processing_center; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_processing_center ON internal.processing USING btree (center);


--
-- Name: idx_processing_product_type; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_processing_product_type ON internal.processing USING btree (product_type);


--
-- Name: idx_processing_software; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_processing_software ON internal.processing USING btree (software);


--
-- Name: idx_product_generation_date_time; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_product_generation_date_time ON internal.product USING btree (generation_date_time);


--
-- Name: idx_product_name; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_product_name ON internal.product USING btree (name);


--
-- Name: idx_product_obsolescence_date_time; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_product_obsolescence_date_time ON internal.product USING btree (obsolescence_date_time);


--
-- Name: idx_product_processing; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_product_processing ON internal.product USING btree (processing);


--
-- Name: idx_product_product_type; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_product_product_type ON internal.product USING btree (product_type);


--
-- Name: idx_product_x_media_catalog_entry_mce; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_product_x_media_catalog_entry_mce ON internal.product_x_media_catalog_entry USING btree (media_catalog_entry);


--
-- Name: idx_product_x_media_catalog_entry_product; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_product_x_media_catalog_entry_product ON internal.product_x_media_catalog_entry USING btree (product);


--
-- Name: idx_requester_media_catalog; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_requester_media_catalog ON internal.requester USING btree (media_catalog);


--
-- Name: idx_sensing_product_start_absolute_orbit_number; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_sensing_product_start_absolute_orbit_number ON internal.sensing_product USING btree (start_absolute_orbit_number);


--
-- Name: idx_sensing_product_start_date_time_stop_date_time; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_sensing_product_start_date_time_stop_date_time ON internal.sensing_product USING btree (start_date_time, stop_date_time);


--
-- Name: idx_sensing_product_stop_date_time; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_sensing_product_stop_date_time ON internal.sensing_product USING btree (stop_date_time);


--
-- Name: idx_state_vector_position; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_state_vector_position ON internal.state_vector USING btree (x_position, y_position, z_position);


--
-- Name: idx_state_vector_satellite_absolute_orbit_number; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_state_vector_satellite_absolute_orbit_number ON internal.state_vector USING btree (satellite, absolute_orbit_number);


--
-- Name: idx_state_vector_satellite_date_time; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_state_vector_satellite_date_time ON internal.state_vector USING btree (satellite, date_time);


--
-- Name: idx_state_vector_source; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_state_vector_source ON internal.state_vector USING btree (source);


--
-- Name: idx_state_vector_velocity; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX idx_state_vector_velocity ON internal.state_vector USING btree (x_velocity, y_velocity, z_velocity);


--
-- Name: idx_uniq_product_type_acronym; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE UNIQUE INDEX idx_uniq_product_type_acronym ON internal.product_type USING btree (acronym);


--
-- Name: internal_processing_stage_idx; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX internal_processing_stage_idx ON internal.processing USING btree (stage);


--
-- Name: media_catalog_media_idx; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX media_catalog_media_idx ON internal.media_catalog USING btree (media);


--
-- Name: sensing_product_product_idx; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX sensing_product_product_idx ON internal.sensing_product USING btree (product);


--
-- Name: sensing_product_start_date_time_idx; Type: INDEX; Schema: internal; Owner: srv_dpmc
--

CREATE INDEX sensing_product_start_date_time_idx ON internal.sensing_product USING btree (start_date_time);


--
-- Name: history_file_input_id_idx; Type: INDEX; Schema: processing; Owner: srv_dpmc
--

CREATE INDEX history_file_input_id_idx ON processing.history USING btree (file_input_id);


--
-- Name: history_history_id_file_input_id_idx; Type: INDEX; Schema: processing; Owner: srv_dpmc
--

CREATE INDEX history_history_id_file_input_id_idx ON processing.history USING btree (history_id, file_input_id);


--
-- Name: history_x_product_product_history_idx; Type: INDEX; Schema: processing; Owner: srv_dpmc
--

CREATE INDEX history_x_product_product_history_idx ON processing.history_x_product USING btree (product, history);


--
-- Name: idx_history_batch_id; Type: INDEX; Schema: processing; Owner: srv_dpmc
--

CREATE INDEX idx_history_batch_id ON processing.history USING btree (batch_id);


--
-- Name: idx_history_request_id; Type: INDEX; Schema: processing; Owner: srv_dpmc
--

CREATE INDEX idx_history_request_id ON processing.history USING btree (request_id);


--
-- Name: idx_history_request_id_file_input_id; Type: INDEX; Schema: processing; Owner: srv_dpmc
--

CREATE INDEX idx_history_request_id_file_input_id ON processing.history USING btree (request_id, file_input_id);


--
-- Name: idx_history_tag; Type: INDEX; Schema: processing; Owner: srv_dpmc
--

CREATE INDEX idx_history_tag ON processing.history USING btree (tag);

ALTER TABLE processing.history CLUSTER ON idx_history_tag;


--
-- Name: idx_history_x_product_product; Type: INDEX; Schema: processing; Owner: srv_dpmc
--

CREATE INDEX idx_history_x_product_product ON processing.history_x_product USING btree (product);


--
-- Name: idx_processing_pool_x_hosts_hosts; Type: INDEX; Schema: processing; Owner: srv_dpmc
--

CREATE INDEX idx_processing_pool_x_hosts_hosts ON processing.pool_x_hosts USING btree (hosts);


--
-- Name: idx_processing_pool_x_hosts_pool; Type: INDEX; Schema: processing; Owner: srv_dpmc
--

CREATE INDEX idx_processing_pool_x_hosts_pool ON processing.pool_x_hosts USING btree (pool);


--
-- Name: idx_processing_top_hosts; Type: INDEX; Schema: processing; Owner: srv_dpmc
--

CREATE INDEX idx_processing_top_hosts ON processing.top USING btree (hostname_id);


--
-- Name: idx_processing_top_started; Type: INDEX; Schema: processing; Owner: srv_dpmc
--

CREATE INDEX idx_processing_top_started ON processing.top USING btree (started);


--
-- Name: processing_history_output_dir_idx; Type: INDEX; Schema: processing; Owner: srv_dpmc
--

CREATE INDEX processing_history_output_dir_idx ON processing.history USING btree (output_dir);


--
-- Name: processing_history_x_product_history_idx; Type: INDEX; Schema: processing; Owner: srv_dpmc
--

CREATE INDEX processing_history_x_product_history_idx ON processing.history_x_product USING btree (history);


--
-- Name: processing_parameters_set_id_idx; Type: INDEX; Schema: processing; Owner: srv_dpmc
--

CREATE INDEX processing_parameters_set_id_idx ON processing.parameters_set USING btree (id);


--
-- Name: nc_1txy__Sheet1 xc_trigger_nc_1txy__Sheet1_updated_at; Type: TRIGGER; Schema: public; Owner: srv_dpmc
--

CREATE TRIGGER "xc_trigger_nc_1txy__Sheet1_updated_at" BEFORE UPDATE ON public."nc_1txy__Sheet1" FOR EACH ROW EXECUTE FUNCTION public."xc_au_nc_1txy__Sheet1_updated_at"();


--
-- Name: instrument $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.instrument
    ADD CONSTRAINT "$1" FOREIGN KEY (satellite) REFERENCES internal.satellite(id);


--
-- Name: processing $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.processing
    ADD CONSTRAINT "$1" FOREIGN KEY (center) REFERENCES internal.center(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: media_catalog $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.media_catalog
    ADD CONSTRAINT "$1" FOREIGN KEY (media) REFERENCES internal.media(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: media $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.media
    ADD CONSTRAINT "$1" FOREIGN KEY (media_type) REFERENCES internal.media_type(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: auxiliary_product $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.auxiliary_product
    ADD CONSTRAINT "$1" FOREIGN KEY (product) REFERENCES internal.product(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: state_vector $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.state_vector
    ADD CONSTRAINT "$1" FOREIGN KEY (source) REFERENCES internal.product(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: product_x_media_catalog_entry $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.product_x_media_catalog_entry
    ADD CONSTRAINT "$1" FOREIGN KEY (media_catalog_entry) REFERENCES internal.media_catalog_entry(id);


--
-- Name: orbit $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.orbit
    ADD CONSTRAINT "$1" FOREIGN KEY (satellite) REFERENCES internal.satellite(id);


--
-- Name: global $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.global
    ADD CONSTRAINT "$1" FOREIGN KEY (center) REFERENCES internal.center(id);


--
-- Name: auxiliary_configuration_detail $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.auxiliary_configuration_detail
    ADD CONSTRAINT "$1" FOREIGN KEY (configuration) REFERENCES internal.auxiliary_configuration(id);


--
-- Name: software $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.software
    ADD CONSTRAINT "$1" FOREIGN KEY (default_auxiliary_configuration) REFERENCES internal.auxiliary_configuration(id);


--
-- Name: auxiliary_configuration $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.auxiliary_configuration
    ADD CONSTRAINT "$1" FOREIGN KEY (index_media_catalog) REFERENCES internal.media_catalog(id);


--
-- Name: requester $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.requester
    ADD CONSTRAINT "$1" FOREIGN KEY (media_catalog) REFERENCES internal.media_catalog(id);


--
-- Name: media_catalog_entry $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.media_catalog_entry
    ADD CONSTRAINT "$1" FOREIGN KEY (media_catalog) REFERENCES internal.media_catalog(id);


--
-- Name: sensing_product $1; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.sensing_product
    ADD CONSTRAINT "$1" FOREIGN KEY (state_vector) REFERENCES internal.state_vector(id);


--
-- Name: product $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.product
    ADD CONSTRAINT "$2" FOREIGN KEY (processing) REFERENCES internal.processing(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: processing $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.processing
    ADD CONSTRAINT "$2" FOREIGN KEY (software) REFERENCES internal.software(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: sensing_product $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.sensing_product
    ADD CONSTRAINT "$2" FOREIGN KEY (product) REFERENCES internal.product(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: product_x_media_catalog_entry $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.product_x_media_catalog_entry
    ADD CONSTRAINT "$2" FOREIGN KEY (product) REFERENCES internal.product(id);


--
-- Name: auxiliary_configuration_detail $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.auxiliary_configuration_detail
    ADD CONSTRAINT "$2" FOREIGN KEY (product_type) REFERENCES internal.product_type(id);


--
-- Name: orbit $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.orbit
    ADD CONSTRAINT "$2" FOREIGN KEY (anx_date_time_source_product) REFERENCES internal.product(id);


--
-- Name: global $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.global
    ADD CONSTRAINT "$2" FOREIGN KEY (output_media_catalog) REFERENCES internal.media_catalog(id);


--
-- Name: media $2; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.media
    ADD CONSTRAINT "$2" FOREIGN KEY (source_media) REFERENCES internal.media(id);


--
-- Name: processing $3; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.processing
    ADD CONSTRAINT "$3" FOREIGN KEY (product_type) REFERENCES internal.product_type(id);


--
-- Name: media $3; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.media
    ADD CONSTRAINT "$3" FOREIGN KEY (recipient) REFERENCES internal.requester(id);


--
-- Name: product $3; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.product
    ADD CONSTRAINT "$3" FOREIGN KEY (product_type) REFERENCES internal.product_type(id);


--
-- Name: adf_baseline fk_aux_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.adf_baseline
    ADD CONSTRAINT fk_aux_id FOREIGN KEY (aux_id) REFERENCES internal.auxiliary_configuration(id);


--
-- Name: software_x_auxiliary_configuration fk_auxiliary_configuration_soft_x_aux; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.software_x_auxiliary_configuration
    ADD CONSTRAINT fk_auxiliary_configuration_soft_x_aux FOREIGN KEY (auxiliary_configuration) REFERENCES internal.auxiliary_configuration(id);


--
-- Name: dataset_x_product fk_dataset_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.dataset_x_product
    ADD CONSTRAINT fk_dataset_id FOREIGN KEY (dataset_id) REFERENCES internal.dataset(id);


--
-- Name: adf_baseline fk_document_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.adf_baseline
    ADD CONSTRAINT fk_document_id FOREIGN KEY (document_id) REFERENCES internal.product(id);


--
-- Name: ipf_processing_baseline_x_sxa fk_ipb_x_sxa_soft_aux_conf_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.ipf_processing_baseline_x_sxa
    ADD CONSTRAINT fk_ipb_x_sxa_soft_aux_conf_id FOREIGN KEY (soft_x_aux_conf_id) REFERENCES internal.software_x_auxiliary_configuration(id);


--
-- Name: ipf_processing_baseline_x_sxa fk_ipf_processing_baseline_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.ipf_processing_baseline_x_sxa
    ADD CONSTRAINT fk_ipf_processing_baseline_id FOREIGN KEY (ipf_processing_baseline_id) REFERENCES internal.ipf_processing_baseline(id);


--
-- Name: processing_configuration fk_processing_comment_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.processing_configuration
    ADD CONSTRAINT fk_processing_comment_id FOREIGN KEY (processing_comment_id) REFERENCES processing.processing_script(id);


--
-- Name: dataset_x_product fk_product_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.dataset_x_product
    ADD CONSTRAINT fk_product_id FOREIGN KEY (product_id) REFERENCES internal.product(id);


--
-- Name: software_x_binary fk_software_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.software_x_binary
    ADD CONSTRAINT fk_software_id FOREIGN KEY (software_id) REFERENCES internal.software(id);


--
-- Name: software_x_auxiliary_configuration fk_software_soft_x_aux; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.software_x_auxiliary_configuration
    ADD CONSTRAINT fk_software_soft_x_aux FOREIGN KEY (software) REFERENCES internal.software(id);


--
-- Name: processing_configuration fk_sxac_id; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.processing_configuration
    ADD CONSTRAINT fk_sxac_id FOREIGN KEY (sxac_id) REFERENCES internal.software_x_auxiliary_configuration(id);


--
-- Name: processing_product_x_tag processing_product_x_tag_product_name_fkey; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.processing_product_x_tag
    ADD CONSTRAINT processing_product_x_tag_product_name_fkey FOREIGN KEY (product_name) REFERENCES internal.product(name);


--
-- Name: production_chain_x_product_type production_chain_x_product_type_product_type_fkey; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.production_chain_x_product_type
    ADD CONSTRAINT production_chain_x_product_type_product_type_fkey FOREIGN KEY (product_type) REFERENCES internal.product_type(id);


--
-- Name: software_x_image_tag software_x_image_tag_software_id_fkey; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.software_x_image_tag
    ADD CONSTRAINT software_x_image_tag_software_id_fkey FOREIGN KEY (software_id) REFERENCES internal.software(id);


--
-- Name: task task_baseline_fkey; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.task
    ADD CONSTRAINT task_baseline_fkey FOREIGN KEY (baseline) REFERENCES processing.processing_baseline(baseline);


--
-- Name: task task_fk; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.task
    ADD CONSTRAINT task_fk FOREIGN KEY (pool) REFERENCES processing.pool(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: task task_satellite_orbit_fkey; Type: FK CONSTRAINT; Schema: internal; Owner: srv_dpmc
--

ALTER TABLE ONLY internal.task
    ADD CONSTRAINT task_satellite_orbit_fkey FOREIGN KEY (satellite, orbit) REFERENCES internal.orbit(satellite, absolute_number);


--
-- Name: pool_x_hosts $1; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.pool_x_hosts
    ADD CONSTRAINT "$1" FOREIGN KEY (pool) REFERENCES processing.pool(id);


--
-- Name: processing_comment_x_product_type $1; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_comment_x_product_type
    ADD CONSTRAINT "$1" FOREIGN KEY (processing_comment) REFERENCES processing.processing_script(id);


--
-- Name: processing_script_detail $1; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_script_detail
    ADD CONSTRAINT "$1" FOREIGN KEY (id) REFERENCES processing.processing_script(id);


--
-- Name: history_x_product $1; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.history_x_product
    ADD CONSTRAINT "$1" FOREIGN KEY (history) REFERENCES processing.history(history_id);


--
-- Name: top $2; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.top
    ADD CONSTRAINT "$2" FOREIGN KEY (hostname_id) REFERENCES processing.hosts(host_id);


--
-- Name: pool_x_hosts $2; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.pool_x_hosts
    ADD CONSTRAINT "$2" FOREIGN KEY (hosts) REFERENCES processing.hosts(host_id);


--
-- Name: processing_comment_x_product_type $2; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_comment_x_product_type
    ADD CONSTRAINT "$2" FOREIGN KEY (product_type) REFERENCES internal.product_type(id);


--
-- Name: history_x_product $2; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.history_x_product
    ADD CONSTRAINT "$2" FOREIGN KEY (product) REFERENCES internal.product(id);


--
-- Name: batch batch_center_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.batch
    ADD CONSTRAINT batch_center_fkey FOREIGN KEY (center_id) REFERENCES processing.center(id);


--
-- Name: batch batch_request_id_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.batch
    ADD CONSTRAINT batch_request_id_fkey FOREIGN KEY (request_id) REFERENCES processing.request(id);


--
-- Name: batch_x_center batch_x_center_batch_id_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.batch_x_center
    ADD CONSTRAINT batch_x_center_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES processing.batch(id);


--
-- Name: batch_x_center batch_x_center_center_id_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.batch_x_center
    ADD CONSTRAINT batch_x_center_center_id_fkey FOREIGN KEY (center_id) REFERENCES processing.center(id);


--
-- Name: history fk_history_processing_script; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.history
    ADD CONSTRAINT fk_history_processing_script FOREIGN KEY (processing_script) REFERENCES processing.processing_script(id);


--
-- Name: parameters_set fk_parameters_set_batch; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.parameters_set
    ADD CONSTRAINT fk_parameters_set_batch FOREIGN KEY (id) REFERENCES processing.batch(id);


--
-- Name: processing_chain fk_processing_script_id; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_chain
    ADD CONSTRAINT fk_processing_script_id FOREIGN KEY (processing_script_id) REFERENCES processing.processing_script(id) NOT VALID;


--
-- Name: top fk_top_batch; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.top
    ADD CONSTRAINT fk_top_batch FOREIGN KEY (batch_id) REFERENCES processing.batch(id);


--
-- Name: scheduler_x_pool orchestrator_x_pool_fk; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.scheduler_x_pool
    ADD CONSTRAINT orchestrator_x_pool_fk FOREIGN KEY (scheduler_id) REFERENCES processing.scheduler(id);


--
-- Name: scheduler_x_pool orchestrator_x_pool_fk_1; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.scheduler_x_pool
    ADD CONSTRAINT orchestrator_x_pool_fk_1 FOREIGN KEY (pool_id) REFERENCES processing.pool(id);


--
-- Name: pdc_x_pcc pdc_x_pcc_parent_pcc_id_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.pdc_x_pcc
    ADD CONSTRAINT pdc_x_pcc_parent_pcc_id_fkey FOREIGN KEY (parent_pcc_id) REFERENCES processing.processing_chain(id);


--
-- Name: pdc_x_pcc pdc_x_pcc_pcc_id_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.pdc_x_pcc
    ADD CONSTRAINT pdc_x_pcc_pcc_id_fkey FOREIGN KEY (pcc_id) REFERENCES processing.processing_chain(id);


--
-- Name: pdc_x_pcc pdc_x_pcc_pdc_id_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.pdc_x_pcc
    ADD CONSTRAINT pdc_x_pcc_pdc_id_fkey FOREIGN KEY (pdc_id) REFERENCES processing.production_chain(id);


--
-- Name: processing_chain_baseline processing_chain_baseline_baseline_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_chain_baseline
    ADD CONSTRAINT processing_chain_baseline_baseline_fkey FOREIGN KEY (baseline) REFERENCES processing.processing_baseline(baseline);


--
-- Name: processing_chain_baseline processing_chain_baseline_pool_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_chain_baseline
    ADD CONSTRAINT processing_chain_baseline_pool_fkey FOREIGN KEY (pool) REFERENCES processing.pool(id);


--
-- Name: processing_chain_baseline processing_chain_baseline_processing_configuration_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_chain_baseline
    ADD CONSTRAINT processing_chain_baseline_processing_configuration_fkey FOREIGN KEY (processing_configuration) REFERENCES internal.processing_configuration(id);


--
-- Name: processing_chain_baseline processing_chain_baseline_sxac_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_chain_baseline
    ADD CONSTRAINT processing_chain_baseline_sxac_fkey FOREIGN KEY (sxac) REFERENCES internal.software_x_auxiliary_configuration(id);


--
-- Name: processing_chain_input_selection processing_chain_input_select_processing_chain_baseline_id_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_chain_input_selection
    ADD CONSTRAINT processing_chain_input_select_processing_chain_baseline_id_fkey FOREIGN KEY (processing_chain_baseline_id) REFERENCES processing.processing_chain_baseline(id);


--
-- Name: processing_chain_run processing_chain_run_pcc_id_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_chain_run
    ADD CONSTRAINT processing_chain_run_pcc_id_fkey FOREIGN KEY (pcc_id) REFERENCES processing.processing_chain(id);


--
-- Name: processing_chain_run processing_chain_run_pdc_run_tag_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_chain_run
    ADD CONSTRAINT processing_chain_run_pdc_run_tag_fkey FOREIGN KEY (pdc_run_tag) REFERENCES processing.production_chain_run(tag);


--
-- Name: processing_chain_run processing_chain_run_sxac_id_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.processing_chain_run
    ADD CONSTRAINT processing_chain_run_sxac_id_fkey FOREIGN KEY (sxac_id) REFERENCES internal.software_x_auxiliary_configuration(id);


--
-- Name: production_chain_run production_chain_run_pdc_id_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.production_chain_run
    ADD CONSTRAINT production_chain_run_pdc_id_fkey FOREIGN KEY (pdc_id) REFERENCES processing.production_chain(id);


--
-- Name: block_parameters production_chain_run_tag_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.block_parameters
    ADD CONSTRAINT production_chain_run_tag_fkey FOREIGN KEY (pdc_run_tag) REFERENCES processing.production_chain_run(tag);


--
-- Name: production_chain_run production_chain_run_task_id_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.production_chain_run
    ADD CONSTRAINT production_chain_run_task_id_fkey FOREIGN KEY (task_id) REFERENCES processing.task(id);


--
-- Name: request request_pool_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.request
    ADD CONSTRAINT request_pool_fkey FOREIGN KEY (pool) REFERENCES processing.pool(id) NOT VALID;


--
-- Name: request request_processing_script_id_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.request
    ADD CONSTRAINT request_processing_script_id_fkey FOREIGN KEY (processing_script_id) REFERENCES processing.processing_script(id);


--
-- Name: request request_product_type_id_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.request
    ADD CONSTRAINT request_product_type_id_fkey FOREIGN KEY (product_type_id) REFERENCES internal.product_type(id);


--
-- Name: request request_sxac_id_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.request
    ADD CONSTRAINT request_sxac_id_fkey FOREIGN KEY (sxac_id) REFERENCES internal.software_x_auxiliary_configuration(id);


--
-- Name: task_record task_record_production_chain_orbit_satellite_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.task_record
    ADD CONSTRAINT task_record_production_chain_orbit_satellite_fkey FOREIGN KEY (production_chain, orbit, satellite) REFERENCES internal.task(production_chain, orbit, satellite);


--
-- Name: task_record_x_batch task_record_x_batch_history_id_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.task_record_x_batch
    ADD CONSTRAINT task_record_x_batch_history_id_fkey FOREIGN KEY (history_id) REFERENCES processing.history(history_id);


--
-- Name: task_record_x_batch task_record_x_batch_task_record_id_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: srv_dpmc
--

ALTER TABLE ONLY processing.task_record_x_batch
    ADD CONSTRAINT task_record_x_batch_task_record_id_fkey FOREIGN KEY (task_record_id) REFERENCES processing.task_record(id);


--
-- PostgreSQL database dump complete
--

\unrestrict nbE3Eq8veifhtK9dk2BmnUJhph2goqqlcaOtwSWfbT0F8sSbH7cpfyvjQo2LSZv

