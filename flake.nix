{
  description = "Hopwatch's CI toolchain";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    nix-infra-modules = {
      url = "github:HaukeSchnau/nix-infra-modules/b365d13637b9dc83c397df542b5112a50ac8cbb9";
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
