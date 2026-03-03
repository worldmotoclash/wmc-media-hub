-- Conservative repair: null out salesforce_id where multiple records share the same value
-- This indicates a mislink from the broken findSalesforceIdByUrl regex
UPDATE media_assets SET salesforce_id = NULL
WHERE salesforce_id IN (
  SELECT salesforce_id FROM media_assets
  WHERE salesforce_id IS NOT NULL
  GROUP BY salesforce_id HAVING COUNT(*) > 1
);