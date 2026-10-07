# Decisões e dúvidas para o Rafael

O que ficou em aberto enquanto o site era montado. Em ordem: primeiro o que trava publicar,
depois marca, depois produto e texto.

## Trava publicar

1. **GitHub Pages em repositório privado.** O plano gratuito do GitHub só publica Pages de
   repositório público. Opções: tornar o `site-Nilo` público (o código do site fica visível, sem
   segredos nele), assinar o GitHub Pro, ou publicar em outro lugar (Cloudflare Pages, Netlify ou
   o próprio S3 + CloudFront da KWY, que já hospeda o kwytech.com).
2. **Para onde vai o botão "Quero o Nilo".** Hoje abre o WhatsApp comercial da KWY
   (+55 48 4042-0387) com a mensagem "Quero conhecer o Nilo". Alternativas: número próprio do
   Nilo, lista de espera com formulário (como o Web3Forms do site da KWY) ou pré-venda.
3. **Domínio.** nilo.com.br? nilo.kwytech.com? Com domínio próprio, trocar `base` no
   `vite.config.js` para `/`.

## Marca

4. **Escolher a logo** entre as 6 opções (A Côvado, B Poço, C Mw, D Cartucho, E Coluna, F Lótus),
   em `public/marca/` e na página `marca.html`. O site usa a A por enquanto.
5. **A letra Y da família KWY.** Na família de produtos, K é o pneu, W é o gás e Y é a água. O
   Nilo carrega o Y em algum lugar (embalagem, rodapé) ou vira marca independente?
6. **"Nilo" sozinho ou "Nilo by KWY"** no material de venda.
7. Registro de marca do nome Nilo no INPI (Instituto Nacional da Propriedade Industrial):
   conferir disponibilidade na classe de aparelhos de medição e de serviços.

## Produto (o que o site promete)

8. **Preço e modelo de venda**: compra, comodato com a distribuidora, assinatura? O FAQ hoje diz
   que os preços de lançamento estão sendo fechados.
9. **Compatibilidade**: funciona com galão em bebedouro de pressão, em suporte de chão, com galão
   de 10 L? O site diz só "debaixo do galão".
10. **Distribuidoras parceiras**: o FAQ diz que o Nilo trabalha com parceiras perto do cliente e
    que a distribuidora do cliente "pode entrar". Confirmar se é assim que vai ser.
11. **Termos de uso e privacidade** da balança ainda não estão publicados; o rodapé mostra "em
    breve".
12. **Analytics e cookies**: a prévia não tem rastreamento nenhum. Se entrar Google Tag Manager,
    precisa do banner de consentimento igual ao do site da KWY.

## Texto e conteúdo

13. Números do produto no site: 3 pilhas AA, 9 meses a 1 ano, Wi-Fi 2,4 GHz, 15 minutos no modo
    automático. Confirmar que continuam valendo na versão de venda.
14. A conversa do WhatsApp no site é ilustrativa (nome "Ana", galão da "Cozinha"). Quer usar as
    mensagens reais aprovadas na Meta?
15. Nenhuma imagem gerada por IA foi usada: o Higgsfield está com saldo zero. Tudo do site é
    desenhado em código. Se quiser fotos do produto, falta sessão de foto do protótipo.
