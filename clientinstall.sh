#!/bin/sh
TEST=""
CLIENT="client"
if [ "$1" = "-test" ]; then
TEST="test"
CLIENT="test"
shift
fi
if [ ! -d "$CLIENT" ] ; then
  echo $CLIENT not found
  exit 1
fi

cd $CLIENT && tar cf - . | ssh pjc@loriandpeter.com -i ~/.ssh/key2021.pem "cd /data/www/vhosts/moddersandrockers/ws/$TEST && tar xvf - " 
