{
  project = {
    name = "hopwatch";
    release = {
      backend = "static";
      # Activation fails unless each path resolves to a file or directory index.
      health.paths = [
        "/"
        "/privacy/"
        "/support/"
        "/impressum/"
        "/de/"
        "/de/datenschutz/"
        "/de/hilfe/"
      ];
      ingress = {
        compression = true;
        responseHeaders = {
          Referrer-Policy = "strict-origin-when-cross-origin";
          X-Content-Type-Options = "nosniff";
        };
      };
    };
  };
}
