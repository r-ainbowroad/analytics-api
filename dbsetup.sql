-- intended to be sourced into psql, after changing the passwords
CREATE USER api PASSWORD 'password';
CREATE USER grafana PASSWORD 'password';

CREATE DATABASE analytics;
GRANT ALL ON DATABASE analytics TO api;
GRANT CONNECT ON DATABASE analytics TO grafana;

\c ponyplace_analytics

DROP TABLE placements;

CREATE TABLE placements(
        timestamp timestamp,
        user_id varchar(36),
        template varchar(40),
        x int,
        y int,
        color int,
        next_pixel timestamp
);

CREATE INDEX bytime ON placements(timestamp, user_id);

GRANT SELECT ON placements TO grafana;
GRANT SELECT ON placements TO api;
GRANT INSERT ON placements TO api;

DROP TABLE errors;

CREATE TABLE errors(
        timestamp timestamp,
        user_id varchar(36),
        code text
);

CREATE INDEX bytime ON errors(timestamp, user_id);

GRANT SELECT ON errors TO grafana;
GRANT SELECT ON errors TO api;
GRANT INSERT ON errors TO api;

DROP TABLE completion_status;

CREATE TABLE completion_status(
        timestamp timestamp,
        user_id varchar(36),
        template varchar(40),
        correct int,
        total int
);

CREATE INDEX bytime ON completion_status(timestamp, user_id);

GRANT SELECT ON completion_status TO grafana;
GRANT SELECT ON completion_status TO api;
GRANT INSERT ON completion_status TO api;