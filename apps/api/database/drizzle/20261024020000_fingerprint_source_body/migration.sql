UPDATE "sources"
  SET "fingerprint" = encode(sha256(convert_to("body", 'UTF8')), 'hex');
