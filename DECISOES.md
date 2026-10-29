# Decisões e dúvidas para o Rafael

O que ficou em aberto enquanto o site era montado. Em ordem: primeiro o que trava publicar,
depois marca, depois produto e texto.

## Trava publicar

1. **Publicação: resolvido em 07/10/2026.** O repositório ficou público, o Pages foi ligado com a
   origem GitHub Actions e o site está no ar em https://kwytechnologie.github.io/site-Nilo/.
   Cada `git push` na `main` publica sozinho.
   As duas execuções com erro no Actions são de antes de o Pages ser ligado.
2. **Para onde vai o botão "Quero o Nilo".** Hoje abre o WhatsApp comercial da KWY
   (+55 48 4042-0387) com a mensagem "Quero conhecer o Nilo". Alternativas: número próprio do
   Nilo, lista de espera com formulário (como o Web3Forms do site da KWY) ou pré-venda.
3. **Domínio.** nilo.com.br? nilo.kwytech.com? Com domínio próprio, trocar `base` no
   `vite.config.js` para `/`.

## Marca

4. **Logo: resolvido em 29/10/2026.** Fica a A (Côvado) e o ícone A (gota). A prancha `marca.html`
   saiu do site publicado; continua no repositório para consulta local (`npm run dev`, `/marca.html`).
   Falta escolher a tipografia.
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
11. **Termos de uso e privacidade**: escritos em 28/10/2026 (`termos/` e
    `politica-de-privacidade/`), aguardando aprovação do Rafael e revisão jurídica.
12. **Analytics e cookies**: a prévia não tem rastreamento nenhum. Se entrar Google Tag Manager,
    precisa do banner de consentimento igual ao do site da KWY.

## Texto e conteúdo

13. Números do produto no site, atualizados em 22/10/2026: medidor inteligente (não mais
    "balança"), só para galão de 20 litros, 4 pilhas AA com duração aproximada de 1 ano, Wi-Fi
    2,4 GHz do local, 15 minutos no modo automático. Comunicação com foco em empresas, casa como
    público secundário.
14. A conversa do WhatsApp no site é ilustrativa (nome "Ana", galão da "Recepção"). Quer usar as
    mensagens reais aprovadas na Meta?
15. Nenhuma imagem gerada por IA foi usada: o Higgsfield está com saldo zero. Tudo do site é
    desenhado em código. Se quiser fotos do produto, falta sessão de foto do protótipo.
16. **Imagem de compartilhamento** (`public/img/og-nilo.jpg`, 1200 x 630): a cena do rio com a logo
    A e a frase do topo. O endereço dela no `index.html` é relativo; com o domínio definido, vale
    trocar por endereço completo, que é o que WhatsApp e redes leem melhor.

