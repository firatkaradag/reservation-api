# Serverless Framework Node HTTP API on AWS

NodeJS API project with Typescript, Webpack on Serverless Framework 

## Usage

Please install all development dependencies with npm
```
$ npm install
```

### Deployment

To deploy cloudformation infrastructure to AWS. Most of examples below use `dev` as STAGE value

```
$ serverless deploy --stage dev
```

Alternatively you can use deployment.sh to run deployment scripts

```
$ source ./scripts/deployment.sh && api-deploy
```

After deploying, you should see output similar to:

```bash
Deploying reservation-api to stage dev (us-east-1)

✔ Service deployed to stack reservation-api-dev (152s)
Excluding external modules: aws-sdk@^2.1239.0
Package lock found - Using locked versions
Packing external modules: uuid@^9.0.0

endpoint: GET - https://.execute-api.us-east-1.amazonaws.com/
endpoints:
  OPTIONS - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/reservation/{proxy+}
  POST - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/reservation
functions:
  apiReservation: reservation-api-dev-apiReservation (264 kB)
  createReservation: reservation-api-dev-createReservation (264 kB)
  readReservation: reservation-api-dev-readReservation (264 kB)
  updateReservation: reservation-api-dev-updateReservation (264 kB)
  deleteReservation: reservation-api-dev-deleteReservation (264 kB)
  saveReservation: reservation-api-dev-saveReservation (264 kB)
  parseReservation: reservation-api-dev-parseReservation (264 kB)
  queryReservation: reservation-api-dev-queryReservation (264 kB)
  fetchReservation: reservation-api-dev-fetchReservation (264 kB)
```

#### Upload JSON to S3 Bucket

In order to use S3 as DB source we need to upload json file into S3 bucket (reservation-db-dev)

```
$ aws s3 cp ./assets/reservations.json s3://reservation-db-${STAGE}/
```
or 
```
$ source ./scripts/deployment.sh && api-s3-upload
```

### Invocation

After successful deployment, you can call the created application via HTTP:

```bash
curl -X POST https://xxxxxxx.execute-api.us-east-1.amazonaws.com/ 
   -H 'Content-Type: application/json'
   -d '{ "operationType":"1" }'
```

Which should result in response similar to the assets/reservations.json content:

```json
{
  "message": "Operation successfully completed!",
  "data": {
    ...
  }
}
```

### Remove

In order to remove infrastructure, first you should clear all in S3 bucket (reservation-db-dev)

```
$ aws s3 rm s3://reservation-db-${STAGE}/ --recursive
```
or 
```
$ source ./scripts/deployment.sh && api-s3-remove
```

Now ready to remove all the services

```
$ sls remove --stage ${STAGE}
```
or 
```
$ source ./scripts/deployment.sh && api-remove 
```