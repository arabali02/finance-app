#!/usr/bin/env bash
# Проверка миграции на временном локальном Postgres 16
set -euo pipefail
DIR=$(cd "$(dirname "$0")/.." && pwd)
TMP=$(mktemp -d); chown postgres "$TMP"
BIN=/usr/lib/postgresql/16/bin
su postgres -c "$BIN/initdb -D $TMP/data -A trust >/dev/null"
su postgres -c "$BIN/pg_ctl -D $TMP/data -o '-p 54329 -k $TMP' -l $TMP/log -w start >/dev/null"
trap 'su postgres -c "$BIN/pg_ctl -D $TMP/data -m fast stop >/dev/null"; rm -rf $TMP' EXIT
P="psql -h $TMP -p 54329 -U postgres -q -v ON_ERROR_STOP=1"
$P -f "$DIR/tests/stub_auth.sql"
$P -f "$DIR/migrations/0001_init.sql"
$P -f "$DIR/migrations/0002_products_import.sql"
$P -f "$DIR/tests/rls_test.sql"
$P -f "$DIR/tests/fix_test.sql"
$P -f "$DIR/tests/products_test.sql"
