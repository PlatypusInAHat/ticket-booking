# Git Workflow Va Chien Luoc Tag

Tai lieu nay dinh nghia cach lam viec voi Git, cach gan tag cho commit, cach gan tag cho Docker image, va cach truy vet phien ban dang chay tren tung moi truong.

## Muc Tieu

- Moi ban deploy phai tra loi duoc: service nao, commit nao, image nao, moi truong nao.
- Rollback phai dua tren tag/image bat bien, khong dua vao `latest`.
- `dev`, `staging`, `prod` co luong phat hanh rieng nhung van dung chung mot commit SHA de truy vet.
- Git tag chi danh dau moc phat hanh hoac moc deploy quan trong, khong gan tag cho moi commit binh thuong.

## Mo Hinh Nhanh

```mermaid
flowchart LR
  classDef branch fill:#111827,stroke:#60a5fa,color:#f9fafb,stroke-width:1px;
  classDef stage fill:#0f172a,stroke:#34d399,color:#e5e7eb,stroke-width:1px;
  classDef release fill:#2b0f14,stroke:#f87171,color:#fee2e2,stroke-width:1px;
  classDef tag fill:#082f49,stroke:#38bdf8,color:#e0f2fe,stroke-width:1px;

  A[feature/*]:::branch --> B[Pull Request]:::stage
  B --> C[CI: lint/test/audit/build]:::stage
  C --> D[dev]:::branch
  D --> E[Deploy dev<br/>image: dev-shortsha]:::tag
  E --> F[staging]:::branch
  F --> G[Deploy staging<br/>image: staging-shortsha]:::tag
  G --> H[release/vX.Y.Z]:::branch
  H --> I[Git tag vX.Y.Z]:::tag
  I --> J[main/prod]:::release
  J --> K[Deploy prod<br/>image: prod-shortsha]:::tag
```

## Quy Uoc Nhanh

- `main`: nguon production, chi nhan merge da review va da qua gate.
- `dev`: nhanh tich hop hang ngay, tu dong deploy dev khi pass pipeline.
- `staging`: nhanh kiem thu gan production, dung cho UAT/performance/security gate.
- `feature/*`: nhanh lam tinh nang, bat buoc tao Pull Request.
- `release/vX.Y.Z`: nhanh dong goi phat hanh, chi nhan bugfix nho.
- `hotfix/*`: nhanh sua loi production khan cap, sau khi merge phai back-merge ve `dev` va `staging`.

## Chien Luoc Git Tag

Dung annotated tag cho release that:

- `vX.Y.Z`: tag phien ban san pham, gan tren commit da san sang production.
- `vX.Y.Z-rc.N`: tag release candidate tren `release/*` hoac `staging`.
- `hotfix-vX.Y.Z`: tag ban sua nong neu can phan biet voi release chuan.
- `infra-vX.Y.Z`: tag moc infra quan trong neu thay doi Terraform/Kubernetes co tac dong lon.

Khong nen gan Git tag cho moi commit dev. Dev da co `short_sha` va image tag `dev-shortsha`, nhu vay du de truy vet ma khong lam repo bi day tag rac.

Vi du:

```bash
git tag -a v1.4.0 -m "Release v1.4.0: ticket checkout hardening"
git push origin v1.4.0
```

## Chien Luoc Docker Image Tag

Image tag chuan la:

```text
<deploy_env>-<short_sha>
```

Vi du:

- `dev-a1b2c3d4e5f6`
- `staging-a1b2c3d4e5f6`
- `prod-a1b2c3d4e5f6`

Ly do chon format nay:

- Co moi truong trong tag de nhin nhanh image duoc build cho dau.
- Co commit SHA de rollback va audit.
- Khong dung `latest`, tranh deploy nham image.
- Cung mot commit co the duoc promote qua `dev -> staging -> prod` ma van truy vet duoc.

Moi service co image rieng:

- `api-gateway:<deploy_env>-<short_sha>`
- `auth-service:<deploy_env>-<short_sha>`
- `catalog-service:<deploy_env>-<short_sha>`
- `booking-service:<deploy_env>-<short_sha>`
- `checkin-service:<deploy_env>-<short_sha>`
- `notification-service:<deploy_env>-<short_sha>`
- `frontend:<deploy_env>-<short_sha>`

## Mapping Git Tag Va Image Tag

Git tag `vX.Y.Z` khong thay the image tag SHA. Git tag la moc release; image tag SHA la artifact bat bien de deploy.

Nen luu mapping trong release note:

```text
Release: v1.4.0
Commit: a1b2c3d4e5f6...
Images:
- api-gateway: prod-a1b2c3d4e5f6
- auth-service: prod-a1b2c3d4e5f6
- catalog-service: prod-a1b2c3d4e5f6
- booking-service: prod-a1b2c3d4e5f6
- checkin-service: prod-a1b2c3d4e5f6
- notification-service: prod-a1b2c3d4e5f6
- frontend: prod-a1b2c3d4e5f6
```

## Luong Phat Hanh De Xuat

1. Merge `feature/*` vao `dev` sau khi CI pass.
2. Pipeline build image `dev-<short_sha>` va deploy dev.
3. Khi on dinh, merge/cherry-pick sang `staging`.
4. Pipeline build image `staging-<short_sha>` va deploy staging.
5. Tao `release/vX.Y.Z`, chay full gate.
6. Gan annotated tag `vX.Y.Z` tren commit release.
7. Merge vao `main` hoac trigger tag `vX.Y.Z` de build image `prod-<short_sha>`.
8. Deploy prod bang image `prod-<short_sha>`.
9. Ghi release note gom Git tag, commit SHA, image tag va migration note.

## Rollback

Rollback khong checkout `latest`. Rollback bang image tag cu da biet tot:

```bash
kubectl -n ticketstage set image deployment/booking-service booking-service=<repo>/booking-service:prod-a1b2c3d4e5f6
```

Neu dung Argo CD/GitOps, rollback bang cach revert commit manifest hoac cap nhat image tag ve tag cu trong overlay.

## Bao Ve Tag Va Nhanh

- Chan force-push tren `main`, `dev`, `staging`, `prod`, `release/*`.
- Chi maintainer hoac CI bot duoc push tag `v*`.
- Git tag release phai la annotated tag, khong dung lightweight tag.
- Khong xoa hoac ghi de tag release da publish.
- Pull Request vao `main`/`prod` phai co review va pass `lint`, `test`, `audit`, `build`, `scan image`.

## Viec Can Dong Bo Voi Infra

CI app hien dang sinh image tag theo `deploy_env-short_sha`. Infra overlay cung phai nhan dung tag nay khi deploy.

Khong nen de overlay co dinh:

```yaml
newTag: dev
```

Nen de pipeline hoac GitOps image updater cap nhat thanh:

```yaml
newTag: dev-a1b2c3d4e5f6
```

Neu chua co image updater, CD job phai patch `k8s/overlays/<env>/kustomization.yaml`, commit lai vao infra repo, va de Argo CD sync theo commit do.
