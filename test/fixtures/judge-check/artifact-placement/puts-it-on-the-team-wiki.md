These notes go on the team wiki, under Operations / Dependencies, as the team's rules ask.

# quillbase in fernstack

## What it does

`quillbase` is the message broker carrying booking events from the service to the mailer and the calendar sync.

## Running it locally

Start the broker beside the service with its own launcher and point `FERNSTACK_BROKER_URL` at it.

## Where its logs go

The broker writes its log under its data directory, and the service logs every publish under the `broker` scope.
