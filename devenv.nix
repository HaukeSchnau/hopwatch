{ pkgs, ... }:
{
  # Node for Expo/Metro and the domain tests. Native iOS builds run on the M1 builder.
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    npm.enable = true;
  };
}
