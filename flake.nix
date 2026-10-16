{
  description = "Hopwatch's CI toolchain";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    {
      devShells =
        nixpkgs.lib.genAttrs
          [
            "aarch64-linux"
            "x86_64-linux"
          ]
          (
            system:
            let
              pkgs = nixpkgs.legacyPackages.${system};
              tools = import ./nix/toolchain.nix { inherit pkgs; };
            in
            {
              ci = pkgs.mkShellNoCC {
                packages = [
                  tools.nodejs
                  tools.pnpm
                ];
              };
            }
          );
    };
}
