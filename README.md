# pigeon

## Getting started

```bash
git clone http://github.com/ihealthlab/pigeon && cd pigeon && yarn
yarn build
yarn watch
open http://localhost:3080/graphql
```

## Problem domain

GTZH database structure has inconsistencies and naming issues.

## Intention

1. redesign foot assessment
1. redesign the data strucutre in graphql
1. refactor the database and the code.

If successful then repeat for other groups of forms

## Design objectives

1. improve data type consistency
1. improve naming
1. enable greater react component reuse

## Assumptions

Checkbox values can be safely defaulted to false, eg. shoe types and hidden by radio checkbox buttons
Everything else defaults to null
Temperatures are recorded in Celsius

## Questions

* Should use enums for normal abnormal rather than boolean?
* Should refactor left and right data into a different form factor?
* Why are there two treeatment state object for one person on one day

## Examples

```graphql
query{
  appointmentsByDate(date:"2017/03/10") {
    date
    nickname
    patientId
  }
}

mutation CreateFootAssessment($json: String!){
  createFootAssessment(params: {input:$json}) {
    _id
  }
}
{
  "json": "{\"medicalHistory\":{\"history\":{\"recievedFootcareInstruction\":false,\"livesAlone\":true,\"amputee\":false,\"hadFootUlcer\":false},\"historyPresent\":true}}"
}

mutation CreateEvent($event: EventInput!){
  createEvent(params: $event) {
    _id
    type
    patientId
    keypath
  }
}
{
  "event": {
    "patientId": "57fe06de00b23ed85ea0b981",
    "keypath": "igraphql/test",
    "type": "igraphql/test"
  }
}


```