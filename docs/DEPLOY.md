# Publicação na AWS

O GitHub Actions compila o site em pull requests. Cada push na `main` compila,
publica em um bucket S3 privado e invalida o cache do CloudFront. Também é possível
executar o workflow manualmente na `main`.

O CloudFront entrega HTTPS e resolve `/termos/` e `/politica-de-privacidade/`
para os respectivos `index.html`. Não habilite o modo de hospedagem de site do S3:
a origem é o endpoint REST do bucket, com acesso exclusivo pelo CloudFront (OAC).

## 1. Criar a infraestrutura uma vez

Destino deste projeto: região **us-east-1** e domínio **nilo.kwytech.com**.

Requisitos: AWS CLI autenticada na conta de destino, permissão para criar recursos
S3, CloudFront, ACM e IAM, acesso de administração ao repositório GitHub e acesso
ao DNS de `kwytech.com` (Hostinger, se os nameservers estiverem nela).

Antes de criar a stack, solicite um certificado no ACM em **us-east-1**:

```bash
aws acm request-certificate \
  --profile SEU_PERFIL \
  --region us-east-1 \
  --domain-name nilo.kwytech.com \
  --validation-method DNS \
  --query CertificateArn --output text
```

Consulte o CNAME de validação (pode levar alguns segundos para aparecer):

```bash
aws acm describe-certificate \
  --profile SEU_PERFIL \
  --region us-east-1 \
  --certificate-arn ARN_DO_CERTIFICADO \
  --query 'Certificate.DomainValidationOptions[].ResourceRecord' \
  --output table
```

No painel DNS de `kwytech.com`, adicione esse CNAME com nome e destino exatos.
Se o painel acrescentar `.kwytech.com` automaticamente, informe apenas a parte do
nome anterior a esse sufixo. Preserve esse registro para renovação automática.
Aguarde o certificado ficar `ISSUED` no ACM antes de criar a distribuição.

Verifique primeiro se a conta já tem o provider OIDC do GitHub:

```bash
aws iam list-open-id-connect-providers
```

Se existir um ARN que termine em `oidc-provider/token.actions.githubusercontent.com`,
passe-o em `ExistingGitHubOidcProviderArn`. Esse provider é compartilhado por conta;
não tente criar outro com a mesma URL.

O exemplo abaixo cria um bucket novo com nome único gerado pela AWS, CloudFront,
uma função para os índices de diretórios e uma role de publicação. Escolha a região
e o perfil AWS corretos antes de executar:

```bash
aws cloudformation deploy \
  --profile SEU_PERFIL \
  --region us-east-1 \
  --stack-name nilo-site \
  --template-file infra/site.yml \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    GitHubOidcRepository=kwytechnologie@289708947/site-Nilo@1409226262 \
    DomainName=nilo.kwytech.com \
    CertificateArn=ARN_DO_CERTIFICADO
```

Se o provider já existir, acrescente ao mesmo `--parameter-overrides`:

```text
ExistingGitHubOidcProviderArn=arn:aws:iam::CONTA:oidc-provider/token.actions.githubusercontent.com
```

O template cria um bucket novo; ele não importa um bucket existente. Para aproveitar
um bucket existente, configure nele o OAC e as permissões equivalentes ao template,
e use seus dados nas variáveis abaixo.

Consulte os valores gerados:

```bash
aws cloudformation describe-stacks \
  --profile SEU_PERFIL \
  --region us-east-1 \
  --stack-name nilo-site \
  --query 'Stacks[0].Outputs' \
  --output table
```

No DNS de `kwytech.com`, crie também um **CNAME** com nome **nilo** e destino igual
à saída **CloudFrontDomainName**, sem `https://` e sem caminho. Substitua eventual
registro A, AAAA ou CNAME conflitante apenas para esse subdomínio. Não altere o DNS
do domínio principal ou do e-mail. Aguarde a propagação antes do primeiro deploy,
pois o workflow verifica o acesso pelo domínio final.

## 2. Configurar o GitHub

Em **Settings → Secrets and variables → Actions → Variables**, crie variáveis
de repositório, usando as saídas da stack:

| Variável | Saída da stack |
| --- | --- |
| `AWS_REGION` | `AWSRegion` |
| `AWS_S3_BUCKET` | `BucketName` |
| `AWS_ROLE_ARN` | `DeployRoleArn` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `CloudFrontDistributionId` |
| `SITE_URL` | `SiteUrl` |

Não cadastre `AWS_ACCESS_KEY_ID` nem `AWS_SECRET_ACCESS_KEY`. O workflow recebe
credenciais temporárias por OIDC. A role aceita somente a branch `main` de
`kwytechnologie/site-Nilo`, e só permite listar/gravar no bucket deste site e
criar/consultar invalidações da distribuição correspondente.

O repositório usa o formato OIDC imutável, com IDs da organização e do repositório.
Confira o valor em `gh api repos/kwytechnologie/site-Nilo/actions/oidc/customization/sub`
(campo `sub_claim_prefix`, sem o prefixo `repo:`) antes de adaptar para outro projeto.
Se mover ou renomear o repositório, atualize `GitHubOidcRepository` na stack. Se adicionar
um GitHub Environment ao job de deploy, ajuste também a condição `sub` da role:
o GitHub muda essa identificação ao usar environments.

Publique os arquivos deste projeto no GitHub e execute **Actions → Validar e publicar
no S3 → Run workflow → main**. Os próximos pushes na `main` serão automáticos.
Ative proteção da `main` exigindo o job `build` para validar alterações antes do merge.
Depois de confirmar o site novo, desative GitHub Pages nas configurações do repositório.

## URLs, cache e verificação

- O build usa `/` como base. `NILO_BASE` pode alterar isso em prévias locais.
- `scripts/prepare-deploy.mjs` usa `SITE_URL` para ajustar canonical, imagem de
  compartilhamento, robots e sitemap nos arquivos compilados. Os fontes conservam
  a URL anterior como referência para essa substituição.
- Arquivos de `assets/` têm nomes com hash e cache de um ano. Demais arquivos públicos
  têm cache de cinco minutos. HTML exige revalidação.
- Assets são publicados antes do HTML. O workflow espera a invalidação terminar e
  verifica a página inicial, termos e privacidade por HTTPS.
- Arquivos antigos são preservados para páginas já abertas continuarem funcionando.
  Isso acumula objetos no bucket; a limpeza deve preservar assets ainda usados por
  versões abertas. Não use `sync --delete` durante a publicação.
- Apagar a stack preserva o bucket e seus arquivos (`Retain`). S3 e CloudFront geram
  cobranças conforme armazenamento, tráfego e uso; acompanhe a conta AWS.

## Prévia sem domínio

Se quiser testar antes de configurar o DNS, omita `CertificateArn` ao criar a stack.
Ela usará o endereço HTTPS padrão do CloudFront. Configure `SITE_URL` com a saída
`SiteUrl`. Para ativar o domínio depois, reaplique a stack com `CertificateArn`,
configure o CNAME `nilo`, atualize `SITE_URL` e publique novamente.

## Referências

- [S3 privado com CloudFront OAC](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [GitHub OIDC e condições de confiança IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html)
- [Ação de credenciais AWS](https://github.com/aws-actions/configure-aws-credentials)
- [Formato das identidades OIDC do GitHub](https://docs.github.com/en/actions/reference/security/oidc)

## Recursos provisionados em 30/10/2026

- Perfil AWS usado: `kwy-admin`; conta: `739022091158`; região: `us-east-1`.
- Stack: `nilo-site`.
- Bucket: `nilo-site-sitebucket-fmmbiswyxa2e`.
- Distribuição CloudFront: `E621Y2B488WA3`.
- Role para `AWS_ROLE_ARN`: `arn:aws:iam::739022091158:role/nilo-site-DeployRole-ltDdb6tIb2QY`.
- Endereço provisório: `https://ddf2y05d085d6.cloudfront.net`.
- Domínio de produção: `https://nilo.kwytech.com`.
- Certificado solicitado: `arn:aws:acm:us-east-1:739022091158:certificate/ca13d0f6-709d-4328-9a74-6142eff5942c`.
- Provider OIDC reaproveitado: `arn:aws:iam::739022091158:oidc-provider/token.actions.githubusercontent.com`.

Registros CNAME cadastrados no DNS da Hostinger para `kwytech.com`:

| Nome | Destino |
| --- | --- |
| `_b4bd7a47d60fee54e2331f0610bcf8e1.nilo` | `_091ca9c4cbf6f07afc37c833cf7ed7b2.wzccmgtwzk.acm-validations.aws` |
| `nilo` | `ddf2y05d085d6.cloudfront.net` |

A primeira publicação foi feita diretamente com AWS CLI. O certificado já foi
emitido (`ISSUED`), os registros DNS foram confirmados e as cinco variáveis do
GitHub Actions estão configuradas, com `SITE_URL=https://nilo.kwytech.com`.
Para reaplicar a infraestrutura com o domínio e certificado de produção:

```bash
aws cloudformation deploy \
  --profile kwy-admin \
  --region us-east-1 \
  --stack-name nilo-site \
  --template-file infra/site.yml \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    GitHubOidcRepository=kwytechnologie@289708947/site-Nilo@1409226262 \
    DomainName=nilo.kwytech.com \
    CertificateArn=arn:aws:acm:us-east-1:739022091158:certificate/ca13d0f6-709d-4328-9a74-6142eff5942c \
    ExistingGitHubOidcProviderArn=arn:aws:iam::739022091158:oidc-provider/token.actions.githubusercontent.com
```

A conta `ighor-kwytech` tem acesso de escrita ao repositório para publicar o workflow
e configurar as variáveis. Acompanhe as publicações em
[GitHub Actions](https://github.com/kwytechnologie/site-Nilo/actions/workflows/deploy.yml).
