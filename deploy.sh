#! /bin/bash

LAMBDANAME="ARN HERE"
ZIPNAME="bundle.zip"
REGION="AWS REGION HERE"

if [ ! ./dist/ ]
then
  echo "No distributable bundle found";
  exit 1;
fi

echo "Zipping... ($ZIPNAME)"
cd dist
zip $ZIPNAME bundle.js

echo "Uploading... ($LAMBDANAME)"
aws lambda update-function-code --function-name $LAMBDANAME --region $REGION --zip-file fileb://$ZIPNAME
echo "Update complete"

echo "Cleanup $ZIPNAME"
rm $ZIPNAME
echo "Cleanup finished"
