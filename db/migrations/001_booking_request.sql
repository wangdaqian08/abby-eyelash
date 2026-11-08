-- Booking requests behind the short calendar link (/c/<code>). Kept 24 hours from creation, then deleted.
CREATE TABLE abby.booking_request (
  code       text PRIMARY KEY,
  items      text NOT NULL,
  date       date NOT NULL,
  time       text NOT NULL,
  name       text NOT NULL,
  phone      text NOT NULL,
  photos     boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX booking_request_created_at ON abby.booking_request (created_at);
