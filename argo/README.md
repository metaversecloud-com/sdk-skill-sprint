# argo scaffolding (sdk-skill-sprint)

Dev EKS/ArgoCD manifests. Deploy branch `dev` = full tree; `main` = detection `argo/envs/dev/config.json` with `targetRevision:dev`.

- service: `ssprint0`  host: `ssprint0-dev-topia.topia-rtsdk.com`  health: `/api/system/health`
- ConfigMap keys: ['INSTANCE_DOMAIN', 'INSTANCE_PROTOCOL', 'INTERACTIVE_KEY', 'NODE_ENV', 'PORT']
- Sealed keys: ['INTERACTIVE_SECRET']
