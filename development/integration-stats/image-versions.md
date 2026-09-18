# Running image record

Captured 2026-09-18 from the running `homarr-stats-live` project with `docker inspect`. The digest is the local image ID used by each container; tags such as `latest` are intentionally recorded alongside it.

| Container | Image | Local digest |
| --- | --- | --- |
| caddy | `caddy:latest` | `sha256:2d8b1708bf8008935c0e2a9b6564f7f080cf9a73af3b27718f286230449b7101` |
| gatus | `twinproduction/gatus:latest` | `sha256:ba4519471fc4173685670bc7cc9ccfd1bf857caacbc5f314747639a2a6206fea` |
| healthchecks | `healthchecks/healthchecks:latest` | `sha256:ca93c057eee0aed31f8c0e8a056b4808c994605dfbc4ea8cbfc2fca4f365c82a` |
| homebox | `ghcr.io/sysadminsmedia/homebox:latest` | `sha256:bf22c9fab1cc293762c5e8afc48057c979b6a154bfba2ebce4be09832ea6529d` |
| karakeep | `ghcr.io/karakeep-app/karakeep:latest` | `sha256:2dbf5f2bc9f12f193a9e65b00ed88198e5d9fbafc0df57a1eb45e00eb906ebaf` |
| linkwarden | `ghcr.io/linkwarden/linkwarden:latest` | `sha256:cab61b2e1fb52429632b77893abbc2433b14c19948bca1d7b558f10101fda91e` |
| mealie | `ghcr.io/mealie-recipes/mealie:v2.8.0` | `sha256:1e204f7043a069d8ad137fa0be374fd9e3262700807bd7a5964a384c0b059f74` |
| miniflux | `miniflux/miniflux:latest` | `sha256:0df8845b97b6cf109660dfdc7ce50d7d10d096c266456b0e5bb2dfd3fa3d3b06` |
| myspeed | `germannewsmaker/myspeed:latest` | `sha256:6c1fe29ccfd719779587eaf9870d28b3467b16875192a8d5c76a52e807bc255d` |
| netdata | `netdata/netdata:latest` | `sha256:f1db36544c44e36fce1605d0a453fdc0c3394afdbe6b7d53d9a228ec11e8071e` |
| prometheus | `prom/prometheus:latest` | `sha256:31c1e0aacb3a1914563c4e9b1e8d0a55095bf433aa43c1b0fe695959742845bd` |
| spoolman | `ghcr.io/donkie/spoolman:latest` | `sha256:211fe1e4ff18b0bfb4792f02b232e9088e62e6541b10ac35a0ef534f779f84e8` |
| syncthing-relay | `syncthing/relaysrv:latest` | `sha256:c616db829051f2dd0f0eba9fbdc2daa56832357471460ebf9a928265930a156c` |
| tandoor | `vabene1111/recipes:latest` | `sha256:21ca08430f20e861031b53c633a788075ec591a2262d9fe138ceddcbe4f5a17b` |
| trilium | `triliumnext/notes:latest` | `sha256:5001a7dab4848d025c0bc7e107b51aa2620563bebab8c4e24bc43890b3ebc84c` |
| changedetection | `ghcr.io/dgtlmoon/changedetection.io:latest` | `sha256:f99ebc7d13c7e8d8dcf94a73ca929bc8ccac7f889d43d6d951ff8aab085536b5` |
| changedetection-browser | `browserless/chrome:latest` | `sha256:c6321df7e37587259bb2c5a334f5d6579dde0f4372e7ad4a13aadb066b493f92` |
| fileflows | `revenz/fileflows:latest` | `sha256:bc369e31d218e53e9b1efadad0e7406778d6aa6e5846ef107c2f8010edeabf34` |
| maintainerr | `maintainerr/maintainerr:latest` | `sha256:0918139180b2cb22a8e8cde5f6ec18775980cafbf137b6fcd88fa0f9153a92d6` |
| plant-it | `msdeluise/plant-it-server:latest` | `sha256:e90875bdd5a6ffa347877ad84a6e83a6178358379d806e49f9facdc280998d40` |
| romm | `ghcr.io/rommapp/romm:latest` | `sha256:d528d67ca08546b8c36a634dbe06f06c6e9cb8f26eab900154ec4af3e3a96b76` |
| stash | `stashapp/stash:latest` | `sha256:51b0703b2f20d88af7881ef5c182b0f26a0f87f599e911d533c13971f66c6875` |
| unmanic | `josh5/unmanic:latest` | `sha256:f713ee022357f921cfa48745c142a8628c51ef5cd801db513d0e9cee22a297ed` |
| xteve | `alturismo/xteve:latest` | `sha256:9e99d59097e276a940d27356e994c1565b8faf7da9ac5e9c619a4b2f6cb707d6` |
| your-spotify | `yooooomi/your_spotify_server:latest` | `sha256:63e9b99fe6069e19f328026c1810a866086572cae4c16219abb13b929394cf64` |

| content-karakeep-chrome, changedetection-browser | `browserless/chrome:latest` | `sha256:c6321df7e37587259bb2c5a334f5d6579dde0f4372e7ad4a13aadb066b493f92` |
| content-karakeep-db, content-linkwarden-db, content-miniflux-db, content-tandoor-db | `postgres:16-alpine` | `sha256:81bd698b4594e751a3269e4dcd3e03a4a0ec0daf7b72e7aa1abd43cce9887542` |
| content-karakeep-meili | `getmeili/meilisearch:v1.13.3` | `sha256:35435ac707829f4d914096dd74bf9626ace85669c002be2bcc7fa6b8bbdec43d` |
| content-linkwarden-redis, media-plantit-cache, media-romm-cache | `redis:7-alpine` | `sha256:f84b0c4678011602b9b98c227a4dcd5468bf8b088b02fdd4165cb7758bad8058` |
| media-yourspotify-db | `mongo:8` | `sha256:4d9c509681d8a8683928a6ebb2029b77e931db6983878765ea8a3971e57142e6` |
| media-plantit-db | `mysql:8.0` | `sha256:6cd09145362dfe6831b14545de3d5fd6cc75c37cfd6ef8561429c1fc73518b39` |
| media-romm-db | `mariadb:11` | `sha256:cc7f5fdd7c8fff6867e8ac4df3e7e0faf6c56aebe621a13565479a9a94e4bf13` |

All currently running containers in the project are covered above; rows with multiple container names share the same local image digest.
