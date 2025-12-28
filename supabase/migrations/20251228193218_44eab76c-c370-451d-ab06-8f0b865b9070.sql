-- Insert the default Wasabi configuration into the database
INSERT INTO s3_bucket_configs (name, bucket_name, endpoint_url, region, scan_frequency_hours, is_active)
VALUES (
  'Wasabi Production',
  'shortf-media',
  'https://s3.us-central-1.wasabisys.com',
  'us-central-1',
  24,
  true
);