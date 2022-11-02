export STAGE=dev
export AWS_PROFILE=idemia-developer
export AWS_REGION=us-east-1

function api-deploy {
    sls deploy --stage ${STAGE}
}

function api-s3-upload {
    aws s3 cp ./assets/reservations.json s3://reservation-db-${STAGE}/
}

function api-s3-remove {
    aws s3 rm s3://reservation-db-${STAGE}/ --recursive 
}

function api-remove {
    sls remove --stage ${STAGE}
}

function api-post-search {

    curl -X POST $1 -H 'Content-Type: application/json' -d '{ "operationType":"1" }'
}