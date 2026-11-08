# Build a release. Default profile is `owner`; pass --verify for `verification`.
[arg("verify", long, value="true")]
release verify="false":
    npm run release -- {{ if verify == "true" { "verification" } else { "owner" } }}
