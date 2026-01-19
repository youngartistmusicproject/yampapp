-- Create organization-assets bucket (public for branding visibility)
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-assets', 'organization-assets', true);

-- Public read access (needed for logos/favicons to work)
CREATE POLICY "Organization assets are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'organization-assets');

-- Org admins can upload to their org's folder
CREATE POLICY "Org admins can upload organization assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-assets' 
  AND is_org_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- Org admins can update their org's assets
CREATE POLICY "Org admins can update organization assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'organization-assets' 
  AND is_org_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- Org admins can delete their org's assets
CREATE POLICY "Org admins can delete organization assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'organization-assets' 
  AND is_org_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
);