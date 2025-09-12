-- Add media_url_key column to video_generations table to store the key that maps to ri1__AI_Gen_Key__c in Salesforce
ALTER TABLE public.video_generations 
ADD COLUMN media_url_key TEXT;