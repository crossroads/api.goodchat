#!/bin/bash

set -e ;

if [[ "$ENABLE_MIGRATIONS" == "true" ]] ; then
  npm run db:migrate:prod ;
fi

exec npm run start ;
