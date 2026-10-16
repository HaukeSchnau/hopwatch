{ pkgs, ... }:
let
  tools = import ./nix/toolchain.nix { inherit pkgs; };
in
{
  # Node and pnpm for Expo/Metro, the checks and Alchemy. Native builds run on the M1 builder.
  packages = [
    tools.nodejs
    tools.pnpm
  ];
}
