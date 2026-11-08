-- Local only (runs once, on an empty volume). In production the VPS admin creates the same role and schema.
CREATE ROLE abby_app LOGIN PASSWORD 'abby_dev';
CREATE SCHEMA abby AUTHORIZATION abby_app;
REVOKE ALL ON SCHEMA public FROM abby_app;
