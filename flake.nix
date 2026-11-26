{
  description = "Hopwatch's CI toolchain";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    nix-infra-modules = {
      url = "github:HaukeSchnau/nix-infra-modules/e73ea54e41051f2d4b39890b56346beb5ef2aa88";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    { nixpkgs, nix-infra-modules, ... }:
    {
      devShells =
        nixpkgs.lib.genAttrs
          [
            "aarch64-darwin"
            "aarch64-linux"
            "x86_64-linux"
          ]
          (
            system:
            let
              pkgs = nixpkgs.legacyPackages.${system};
            in
            {
              ci = pkgs.mkShellNoCC {
                packages = builtins.attrValues (nix-infra-modules.lib.toolchain { inherit pkgs; });
              };
            }
          );
    };
}
