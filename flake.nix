{
  description = "Hopwatch website";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    nix-infra-modules = {
      url = "github:HaukeSchnau/nix-infra-modules/c08469c9ed76a0e2223cb6bf1ac624580be6f98c";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    { nixpkgs, nix-infra-modules, ... }:
    nix-infra-modules.lib.projectFlake {
      inherit nixpkgs;
      modules = [ ./project.nix ];
      release = _: { root = ./site; };
    };
}
