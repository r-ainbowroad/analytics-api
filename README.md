# analytics-api
An analytics API supporting GET request lookup of data based on user ID. Intended to be used in conjunction with 2023-minimap.

## Deployment
1. Clone this repository
2. Edit compose.yml to change the environment variables to the analytics database.
3. run `docker compose up -d`

## Environment variables
PGUSER = The user to connect to
PGPASSWORD = The password of the user
PGHOST = Host IP/Domain
PGPORT = Port, usually 5432
PGDATABASE = The database to connect to