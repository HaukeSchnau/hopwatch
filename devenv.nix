{ pkgs, inputs, ... }:
let
  tools = import ./nix/toolchain.nix { inherit pkgs; };
in
{
  imports = [
    (inputs.projectSdk + "/modules/devenv/project.nix")
    ./project.nix
  ];

  # Node and pnpm for Expo/Metro, the checks and Alchemy. Native builds run on the M1 builder.
  packages = [
    tools.nodejs
    tools.pnpm
  ];

  project = {
    enable = true;
    development.environment = {
      HOST = {
        endpoint = "web";
        field = "listen.host";
      };
      PORT = {
        endpoint = "web";
        field = "listen.port";
      };
    };
  };

  tasks."hopwatch:dependencies" = {
    before = [ "devenv:enterShell" ];
    exec = "pnpm install --frozen-lockfile";
    # Include installed output so deleting node_modules invalidates setup.
    execIfModified = [
      "package.json"
      "pnpm-lock.yaml"
      "pnpm-workspace.yaml"
      "node_modules/.modules.yaml"
    ];
  };

  # The website under site/, from workerd with production's headers; edits show up on reload.
  processes.web = {
    project.endpoints.web.port = 3000;
    after = [ "hopwatch:dependencies" ];
    exec = "exec pnpm exec alchemy dev --no-input";
  };
}
